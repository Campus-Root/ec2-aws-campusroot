import { body, validationResult } from 'express-validator';
import { generateAPIError } from '../errors/apiError.js';
import { errorWrapper } from './errorWrapper.js';
import { orderModel } from '../models/Order.js';
import courseModel from '../models/Course.js';
import { productModel } from '../models/Product.js';
import { RazorpayInstance } from '../utils/razorpay.js';
import 'dotenv/config';
import crypto from "crypto";
import { ProductCategoryEnum } from '../utils/enum.js';
import Joi from 'joi';
import { ProductSchema } from '../schemas/student.js';
export const validateCredentials = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email address'),
    body('password')
        .isLength({ min: 8, max: 25 })
        .withMessage('Password must be 8 - 25 characters long')
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z\d]).{8,}$/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];
export const validationErrorMiddleware = errorWrapper((req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return { statusCode: 400, data: errors, message: `${errors.array()[0].msg}` };
    return next();
})
export const checkDisposableEmail = errorWrapper(async (req, res, next, session) => {
    const { email } = req.body;
    const response = await fetch(`https://disposable.debounce.io/?email=${email}`);
    const data = await response.json();
    if (data.disposable == "true") return { statusCode: 400, data: null, message: `Please do not use throw away email` };
    if (data.success == "0") return {
        statusCode: 400, data: null, message: `Invalid email Id`
    };
    next();
});
export const validatePayment = errorWrapper(async (req, res, next, session) => {
    const { orderId } = req.body;
    if (!req.user.orders.includes(orderId)) return { statusCode: 400, data: orderId, message: `invalid orderId` };
    let order = await orderModel.findById(orderId).populate("products").populate("Package");
    req.order = order
    if (order.paymentDetails.paymentStatus != "paid") return {
        statusCode: 400, data: null, message: `please complete payment to add products`
    };
    next();
})
export const validateProducts = errorWrapper(async (req, res, next, session) => {
    const { error, value } = Joi.object({ orderId: Joi.string(), products: Joi.array().items(ProductSchema).min(1) }).validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { products } = value;
    const rules = new Map();
    req.order.Package.products.forEach(ele => { rules.set(ele.category, ele.quantity) });
    let productsCanBeAdded = new Map(rules), errorStack = [];
    for (const product of req.order.products) {
        productsCanBeAdded.set(product.category, (productsCanBeAdded.get(product.category) || 0) - 1);
    }
    for (const product of products) {
        const availableQuantity = productsCanBeAdded.get(product.category) || 0;
        if (availableQuantity <= 0) errorStack.push({ ...product, errorMessage: `limit exceeded` })       // quantity check based on category
        productsCanBeAdded.set(product.category, availableQuantity - 1);
        let course = await courseModel.findById(product.courseId, "location elite startDate")
        if (!course) errorStack.push({ ...product, errorMessage: `invalid courseId` });             // product course check
        if (!req.order.Package.country.includes(course.location.country)) errorStack.push({ ...product, errorMessage: `country mismatched` }); // product country check
        let intakeExists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(product.intake).getUTCMonth())
        if (intakeExists.length = 0) errorStack.push({ ...product, errorMessage: `intake doesn't exist` });   // product intake check
        if (product.category === ProductCategoryEnum.PREMIUM && course.elite) errorStack.push({ ...product, errorMessage: `${product.category} mismatch` }); // product elite or premium check
        if (product.category === ProductCategoryEnum.ELITE && !course.elite) errorStack.push({ ...product, errorMessage: `${product.category} mismatch` }); // product elite or premium check
        let alreadyExists = await productModel.find({ course: product.courseId, user: req.user._id, intake: product.intake, category: product.category }, "_id")
        if (alreadyExists.length > 0) errorStack.push({ ...product, errorMessage: `this product already taken` }); // product duplicate check
    }
    if (errorStack.length > 0) return { statusCode: 400, message: `Invalid products`, data: errorStack };
    next();
})
export const isPaid = async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest("hex");
    if (expectedSignature !== razorpay_signature) return next(generateAPIError("payment verification failed, contact for support", 400));
    const razorPay = await RazorpayInstance.orders.fetch(razorpay_order_id)
    if (razorPay.status !== "paid") return next(generateAPIError("payment status is not paid", 400));
    req.razorPay = razorPay
    next()
}