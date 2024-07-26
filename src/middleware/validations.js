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
    if (!errors.isEmpty()) return next(generateAPIError(`${errors.array()[0].msg}`, 400, errors));
    return next();
})
export const checkDisposableEmail = errorWrapper(async (req, res, next) => {
    const { email } = req.body;
    const response = await fetch(`https://disposable.debounce.io/?email=${email}`);
    const data = await response.json();
    if (data.disposable == "true") return next(generateAPIError(`Please do not use throw away email`, 400));
    if (data.success == "0") return next(generateAPIError(`Invalid email Id`, 400));
    next();
});
export const validatePayment = errorWrapper(async (req, res, next) => {
    const { orderId } = req.body;
    if (!req.user.orders.includes(orderId)) return next(generateAPIError(`invalid orderId`, 404));
    let order = await orderModel.findById(orderId).populate("products").populate("Package");
    req.order = order
    if (order.paymentDetails.paymentStatus != "paid") return next(generateAPIError(`please complete payment to add products`, 400));
    next();
})
export const validateProducts = errorWrapper(async (req, res, next) => {
    const { products } = req.body;
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
        let course = await courseModel.findById(product.data.course, "location elite startDate")
        if (!course) errorStack.push({ ...product, errorMessage: `invalid courseId` });             // product course check
        if (!req.order.Package.country.includes(course.location.country)) errorStack.push({ ...product, errorMessage: `country mismatched` }); // product country check
        if (!product.data.intake || new Date(product.data.intake) <= new Date()) errorStack.push({ ...product, errorMessage: `invalid intake` });
        let intakeExists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(product.data.intake).getUTCMonth())
        if (intakeExists.length <= 0) errorStack.push({ ...product, errorMessage: `intake doesn't exist` });   // product intake check
        if (product.category === ProductCategoryEnum.PREMIUM && course.elite) errorStack.push({ ...product, errorMessage: `${product.category} mismatch` }); // product elite or premium check
        if (product.category === ProductCategoryEnum.ELITE && !course.elite) errorStack.push({ ...product, errorMessage: `${product.category} mismatch` }); // product elite or premium check
        let alreadyExists = await productModel.find({ course: product.data.course, user: req.user._id, intake: product.data.intake, category: product.category }, "_id")
        if (alreadyExists.length > 0) errorStack.push({ ...product, errorMessage: `this product already taken` }); // product duplicate check
        if (!Object.values(ProductCategoryEnum).includes(product.category)) errorStack.push({ ...product, errorMessage: `invalid category: ${product.category}` });
    }
    if (errorStack.length > 0) return next(generateAPIError(`Invalid products`, 400, errorStack));
    next();
})
export const isPaid = errorWrapper(async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest("hex");
    if (expectedSignature !== razorpay_signature) return res.status(400).json({ success: false, message: "payment verification failed, contact for support" });
    const razorPay = await RazorpayInstance.orders.fetch(razorpay_order_id)
    if (razorPay.status !== "paid") return res.status(400).json({ success: false, message: "payment status is not paid" });
    req.razorPay = razorPay
    next()
})