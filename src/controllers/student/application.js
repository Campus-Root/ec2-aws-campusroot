import Joi from "joi";
import courseModel from "../../models/Course.js";
import chatModel from "../../models/Chat.js"
import universityModel from "../../models/University.js";
import fs from "fs";
import Document from "../../models/Uploads.js";
import { teamModel } from "../../models/Team.js";
import { studentModel } from "../../models/Student.js";
import userModel from "../../models/User.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import 'dotenv/config';
import exchangeModel from "../../models/ExchangeRates.js";
import { costConversion } from "../../utils/currencyConversion.js";
import { currencySymbols, ProductCategoryEnum } from "../../utils/enum.js";
import { productModel } from "../../models/Product.js";
import { packageModel } from "../../models/Package.js";
import { orderModel } from "../../models/Order.js";
import { RazorpayInstance } from "../../utils/razorpay.js";
import { priceModel } from "../../models/prices.js";
import { CartSchema, CheckoutSchema } from "../../schemas/student.js";
import { startSession } from "mongoose"
import { getNewAdvisor } from "../../utils/dbHelperFunctions.js";
const ExchangeRatesId = process.env.EXCHANGERATES_MONGOID
export const Cart = errorWrapper(async (req, res, next) => {
    const { error, value } = CartSchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { action, category, courseId, intake, itemId, itemIds } = value;
    let found = req.user.activity.cart.filter(ele => (ele.course.toString() == courseId && new Date(ele.intake) == new Date(intake) && ele.category == category) || ele._id.toString() == itemId)
    let course, intakeExists;
    switch (action) {
        case 'add':
            course = await courseModel.findById(courseId, "startDate elite");
            if (!course) return { statusCode: 400, message: `Invalid courseId`, data: [value] };
            if (!category) return { statusCode: 400, message: `category required`, data: [value] };
            if ((category === ProductCategoryEnum.ELITE && !course.elite) || (category === ProductCategoryEnum.PREMIUM && course.elite)) return { statusCode: 400, message: `category mismatch`, data: [value] };
            intakeExists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(intake).getUTCMonth());
            if (intakeExists.length <= 0) return { statusCode: 400, message: `intake doesn't exist`, data: [value] };
            if (found.length > 0) return { statusCode: 400, message: `item already exists`, data: [value] };
            req.user.activity.cart.push({ category: category, course: courseId, intake: intake });
            break;
        case 'remove':
            if (itemIds && itemIds.length > 0) {
                // Filter the cart to find items that match the provided IDs
                req.user.activity.cart = req.user.activity.cart.filter(item => !itemIds.includes(item._id.toString()));
            } else if (itemId) {
                req.user.activity.cart = req.user.activity.cart.filter(item => !itemId.includes(item._id.toString()));
            } else return { statusCode: 400, message: `No itemId or itemIds provided`, data: [value] };
            break;
        case 'update':
            if (found.length == 0) return { statusCode: 400, message: `item doesn't exists`, data: [value] };
            course = await courseModel.findById(courseId, "startDate elite");
            if (!course) return { statusCode: 400, message: `Invalid courseId`, data: [value] };
            if ((category === ProductCategoryEnum.ELITE && !course.elite) || (category === ProductCategoryEnum.PREMIUM && course.elite)) return { statusCode: 400, message: `category mismatch`, data: [value] };
            intakeExists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(intake).getUTCMonth());
            if (intakeExists.length <= 0) return { statusCode: 400, message: `intake doesn't exist`, data: [value] };
            found[0].category = category ? category : found[0].category;
            found[0].course = courseId ? courseId : found[0].course;
            found[0].intake = intake ? intake : found[0].intake;
            break;
    }
    await req.user.save();
    await courseModel.populate(req.user, { path: "activity.cart.course", select: "name discipline tuitionFee startDate studyMode subDiscipline currency studyMode schoolName studyLevel duration applicationDetails university elite", },)
    await universityModel.populate(req.user, { path: "activity.cart.course.university", select: "name logoSrc location type establishedYear ", })
    return { statusCode: 200, message: `cart updated successfully`, data: req.user.activity.cart }
})
export const wishList = errorWrapper(async (req, res, next) => {
    const { error, value } = Joi.object({ courseId: Joi.string().required(), action: Joi.string().valid('push', 'pull') }).validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { action, courseId } = value;
    if (!(await courseModel.findById(courseId))) return { statusCode: 400, message: `invalid courseId`, data: [value] };
    let student
    switch (action) {
        case "push":
            student = await studentModel.findByIdAndUpdate(req.user._id, { $addToSet: { "activity.wishList": courseId } }, { new: true });
            break;
        case "pull":
            student = await studentModel.findByIdAndUpdate(req.user._id, { $pull: { "activity.wishList": courseId } }, { new: true });
            break;
    }
    await Promise.all([
        await courseModel.populate(student, { path: "activity.wishList", select: "name discipline tuitionFee startDate studyMode subDiscipline currency studyMode schoolName studyLevel duration applicationDetails university elite", },),
        await universityModel.populate(student, { path: "activity.wishList.university", select: "name logoSrc location type establishedYear ", })
    ])
    return { statusCode: 200, message: `${action} successful`, data: student.activity.wishList };
});
export const paySummary = errorWrapper(async (req, res) => {
    const { error, value } = CheckoutSchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { packageId, products, userCurrency } = value;
    class item {
        constructor(originalPrice, currency, finalPrice, details) {
            this.originalPrice = originalPrice;
            this.currency = { symbol: "₹", code: "INR" };
            this.finalPrice = finalPrice;
            this.details = details;
        }
    }
    const items = [];
    const hasPackageId = Boolean(packageId);
    const hasProducts = Array.isArray(products) && products.length > 0;
    let errorStack = [];
    if (hasPackageId) {
        const Package = await packageModel.findById(packageId);
        if (!Package) return { statusCode: 400, message: `invalid packageId`, data: { packageId: packageId } };
        if (!Package.active) return { statusCode: 400, message: `inactive package selected`, data: { packageId: packageId } };
        if (Package.MutuallyExclusivePackages.length > 0) {
            let mutuallyExclusivePackages = req.user.purchasedPackages.filter(ele => Package.MutuallyExclusivePackages.includes(ele.toString()));
            if (mutuallyExclusivePackages.length > 0) return { statusCode: 400, message: `mutually exclusive package already purchased`, data: mutuallyExclusivePackages };
        }
        // final price calculation after promo codes
        items.push(new item(Package.priceDetails.totalPrice, Package.priceDetails.currency, Package.priceDetails.totalPrice, { variety: Package.variety, name: Package.name, description: Package.description, country: Package.country, imageSrc: Package.image, duration: Package.duration, requirements: Package.requirements, benefits: Package.benefits, termsAndConditions: Package.termsAndConditions, active: Package.active }))
    }
    if (hasProducts) {
        for (const product of products) {
            const course = await courseModel.findById(product.courseId, "elite")
            if (!course) errorStack.push({ ...product, errorMessage: `invalid courseId` });
            if (product.category === ProductCategoryEnum.PREMIUM && course.elite) errorStack.push({ ...product, errorMessage: `${product.category} mismatch` }); // product elite or premium check
            if (product.category === ProductCategoryEnum.ELITE && !course.elite) errorStack.push({ ...product, errorMessage: `${product.category} mismatch` }); // product elite or premium check
            let priceObject = await priceModel.findOne({ productCategory: product.category }, "price currency")
            items.push(new item(priceObject.price, priceObject.currency, priceObject.price, product))
        }
        if (errorStack.length > 0) return { statusCode: 400, message: `Invalid products`, data: errorStack };
    }
    return { statusCode: 200, message: "Payment Summary", data: { items: items, totalPrice: items.reduce((acc, ele) => acc + ele.finalPrice, 0) } }
})
export const checkout = errorWrapper(async (req, res, next) => {
    const { error, value } = CheckoutSchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { packageId, products, userCurrency } = value;
    const hasPackageId = Boolean(packageId);
    const hasProducts = Array.isArray(products) && products.length > 0;
    let newProductIds = [], course, Package, errorStack = [], newProducts, intakeExists, insertedProducts, totalPrice = 0, currency = "INR";
    if (hasPackageId) {
        Package = await packageModel.findById(packageId);
        if (!Package) return { statusCode: 400, message: `invalid packageId`, data: { packageId: packageId } };
        if (!Package.active) return { statusCode: 400, message: `inactive package selected`, data: { packageId: packageId } };
        if (Package.MutuallyExclusivePackages.length > 0) {
            let mutuallyExclusivePackages = req.user.purchasedPackages.filter(ele => Package.MutuallyExclusivePackages.includes(ele.toString()));
            if (mutuallyExclusivePackages.length > 0) return { statusCode: 400, message: `mutually exclusive package already purchased`, data: mutuallyExclusivePackages };
        }
    }
    switch (true) {
        case !hasPackageId && !hasProducts:
            return { statusCode: 400, message: `either add packageId or products to checkout`, data: null };
        case hasPackageId && !hasProducts:
            totalPrice = Package.priceDetails.totalPrice;
            currency = Package.priceDetails.currency;
            break;
        case !hasPackageId && hasProducts:
            newProducts = [];
            for (const product of products) {
                let newProductDetails = {
                    user: req.user._id,
                    course: product.courseId,
                    intake: new Date(product.intake),
                    category: product.category
                }
                course = await courseModel.findById(newProductDetails.course, "elite startDate university")
                if (!course) errorStack.push({ ...product, errorMessage: `invalid courseId` });  //product course check
                intakeExists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(newProductDetails.intake).getUTCMonth())
                if (intakeExists.length <= 0) errorStack.push({ ...product, errorMessage: `intake doesn't exist` }); //product intake check
                if (intakeExists.length > 0 && intakeExists[0].deadlineMonth && !isNaN(intakeExists[0].deadlineMonth)) newProductDetails.deadline = new Date(new Date().getFullYear(), intakeExists[0].deadlineMonth, 1);  // adding deadline
                let priceObject = await priceModel.findOne({ productCategory: newProductDetails.category }, "price currency")
                totalPrice += Number(priceObject.price)
                let alreadyExists = await productModel.find({ course: newProductDetails.course, user: req.user._id, intake: new Date(newProductDetails.intake), category: product.category }, "_id")
                if (alreadyExists.length > 0) errorStack.push({ ...product, errorMessage: `this product already taken` }); // duplicates check
                if (newProductDetails.category === ProductCategoryEnum.PREMIUM && course.elite) errorStack.push({ ...product, errorMessage: `${newProductDetails.category} mismatch` }); // product elite or premium check
                if (newProductDetails.category === ProductCategoryEnum.ELITE && !course.elite) errorStack.push({ ...product, errorMessage: `${newProductDetails.category} mismatch` }); // product elite or premium check
                newProducts.push(newProductDetails)
            }
            if (errorStack.length > 0) return { statusCode: 400, message: `Invalid products`, data: errorStack };
            insertedProducts = await productModel.insertMany(newProducts);
            newProductIds = insertedProducts.map(product => product._id);
            break;
        case hasPackageId && hasProducts:
            totalPrice = Package.priceDetails.totalPrice;
            currency = Package.priceDetails.currency;
            const rules = new Map();
            Package.products.forEach(ele => { rules.set(ele.category, ele.quantity) });
            let productsAdded = new Map(rules)
            newProducts = [];
            for (const product of products) {
                let newProductDetails = {
                    user: req.user._id,
                    course: product.courseId,
                    intake: new Date(product.intake),
                    category: product.category
                }
                const availableQuantity = productsAdded.get(newProductDetails.category) || 0;
                if (availableQuantity <= 0) errorStack.push({ ...product, errorMessage: `limit exceeded` })       // quantity check based on category
                productsAdded.set(newProductDetails.category, availableQuantity - 1);
                course = await courseModel.findById(newProductDetails.course, "location elite startDate university")
                if (!course) errorStack.push({ ...product, errorMessage: `invalid courseId` });             // product course check
                if (!Package.country.includes(course.location.country)) errorStack.push({ ...product, errorMessage: `country mismatched` }); // product country check
                intakeExists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(newProductDetails.intake).getUTCMonth())
                if (intakeExists.length <= 0) errorStack.push({ ...product, errorMessage: `intake doesn't exist` });   // product intake check
                if (intakeExists.length > 0 && intakeExists[0].deadlineMonth && !isNaN(intakeExists[0].deadlineMonth)) newProductDetails.deadline = new Date(new Date().getFullYear(), intakeExists[0].deadlineMonth, 1);  // adding deadline
                let alreadyExists = await productModel.find({ course: newProductDetails.course, user: req.user._id, intake: new Date(newProductDetails.intake), category: product.category }, "_id")
                if (alreadyExists.length > 0) errorStack.push({ ...product, errorMessage: `this product already taken` }); // product duplicate check
                if (newProductDetails.category === ProductCategoryEnum.PREMIUM && course.elite) errorStack.push({ ...product, errorMessage: `${newProductDetails.category} mismatch` }); // product elite or premium check
                if (newProductDetails.category === ProductCategoryEnum.ELITE && !course.elite) errorStack.push({ ...product, errorMessage: `${newProductDetails.category} mismatch` }); // product elite or premium check
                newProducts.push(newProductDetails)
            }
            if (errorStack.length > 0) return { statusCode: 400, message: `Invalid products`, data: errorStack };
            insertedProducts = await productModel.insertMany(newProducts);
            newProductIds = insertedProducts.map(product => product._id);
            break;
        default: return { statusCode: 500, message: `some internal server error`, data: null };
    }
    if (totalPrice === 0 || req.user.IEH.verifiedAccess === true) {
        const order = await orderModel.create({
            student: req.user._id,
            Package: packageId ? packageId : null,
            products: newProductIds,
            paymentDetails: {
                paymentStatus: "paid",
                amount: 0,
                amount_due: 0,
                created_at: new Date(),
                currency: "INR",
            },
            status: "pending",
        })
        // add product details
        await productModel.updateMany({ _id: { $in: newProductIds } }, { $set: { order: order._id } })
        await studentModel.findOneAndUpdate({ _id: req.user._id }, { $push: { orders: order._id, purchasedPackages: packageId ? packageId : null, logs: { action: `order placed`, details: `orderId:${order._id}` } } })
        return { statusCode: 200, message: 'order placed', data: { order, razorPay: null } };
    }
    const orderOptions = {
        currency: "INR",
        amount: Number(totalPrice) * 100,
        notes: {
            "note_key": `purchase initiated by ${req.user.firstName} ${req.user.lastName}`,
            "item_ids": { "package": packageId ? packageId : null, "products": newProductIds }
        }
    }
    const razorPay = await RazorpayInstance.orders.create(orderOptions);
    const order = await orderModel.create({
        student: req.user._id,
        Package: packageId ? packageId : null,
        products: newProductIds,
        paymentDetails: {
            paymentStatus: "pending",
            razorpay_order_id: razorPay.id,
            amount: razorPay.amount,
            amount_due: razorPay.amount_due,
            created_at: razorPay.created_at,
            currency: razorPay.currency,
            misc: razorPay
        },
        status: "pending",
        logs: [{ action: "new Order Created", details: JSON.stringify(orderOptions.notes) }],
    })
    await productModel.updateMany({ _id: { $in: newProductIds } }, { $set: { order: order._id } })
    await studentModel.findOneAndUpdate({ _id: req.user._id }, { $push: { orders: order._id, logs: { action: `order placed`, details: `orderId:${order._id}` } } })
    return { statusCode: 200, message: 'order placed', data: { razorPay, order } };
})
export const reCheckout = errorWrapper(async (req, res, next) => {
    const { error, value } = Joi.object({ orderId: Joi.string().required() }).validate(req.query)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { orderId } = value;
    const order = await orderModel.findOne({ _id: orderId, student: req.user._id });
    if (!order) return { statusCode: 400, message: `invalid orderId or you might not have permission`, data: { orderId: orderId } };
    if (order.paymentDetails.paymentStatus === "paid") return { statusCode: 400, message: `already paid, no need for reCheckout`, data: { order: order } };
    const orderOptions = {
        currency: order.paymentDetails.currency,
        amount: Number(order.paymentDetails.amount),
        notes: {
            "note_key": `purchase initiated by ${req.user.firstName} ${req.user.lastName}`,
            "item_ids": { "package": order.Package ? order.Package : null, "products": order.products }
        }
    }
    const razorPay = await RazorpayInstance.orders.create(orderOptions);
    order.paymentDetails.paymentStatus = "pending"
    order.paymentDetails.razorpay_order_id = razorPay.id
    order.paymentDetails.amount = razorPay.amount
    order.paymentDetails.amount_due = razorPay.amount_due
    order.paymentDetails.created_at = razorPay.created_at
    order.paymentDetails.currency = razorPay.currency
    order.paymentDetails.misc = razorPay
    order.logs.push({ action: "re-checkout initiated", details: JSON.stringify(orderOptions.notes) })
    await order.save()
    await studentModel.findOneAndUpdate({ _id: req.user._id }, { $push: { logs: { action: `order attempted for re-Checkout`, details: `orderId:${order._id}` } } })
    return { statusCode: 200, message: 'order placed', data: { razorPay, order } };
})
export const paymentVerification = async (req, res, next) => {
    const session = await startSession();
    try {
        session.startTransaction();  // Start transaction
        const { razorpay_order_id } = req.body;
        const order = await orderModel.findOneAndUpdate(
            { "paymentDetails.razorpay_order_id": razorpay_order_id },
            {
                $set: {
                    "paymentDetails.paymentStatus": req.razorPay.status,
                    "paymentDetails.amount": req.razorPay.amount,
                    "paymentDetails.amount_due": req.razorPay.amount_due,
                    "paymentDetails.currency": req.razorPay.currency,
                    "paymentDetails.misc": req.razorPay,
                },
                $push: { "logs": { action: "payment made", details: razorpay_order_id } }
            },
            { new: true, session }
        );
        const student = await studentModel.findById(order.student, "advisors").session(session);
        await userModel.populate(student, { path: 'advisors.info', select: 'role expertiseCountry' });
        const hasPackageId = Boolean(order.Package);
        const hasProducts = Array.isArray(order.products) && order.products.length > 0;
        if (hasProducts) {
            for (const product of order.products) {
                const Product = await productModel.findById(product).session(session);
                let course = await courseModel.findById(Product.course, "location.country").session(session);
                let country = course.location.country;
                let counsellors = [], processCoordinators = []
                for (const ele of student.advisors) {
                    if (ele.info.role === "counsellor" && (ele.assignedCountries.includes(country) || ele.info.expertiseCountry.includes(country))) counsellors.push(ele)
                    else if (ele.info.role === "processCoordinator" && (ele.assignedCountries.includes(country) || ele.info.expertiseCountry.includes(country))) processCoordinators.push(ele)
                }
                switch (Product.category) {
                    case ProductCategoryEnum.ELITE:
                    case ProductCategoryEnum.PREMIUM:
                        if (counsellors.length > 0) Product.advisors.push(counsellors[0].info._id);
                        else {
                            const Counsellor = await getNewAdvisor("counsellor", country);
                            teamModel.findByIdAndUpdate(Counsellor._id, { $push: { students: { profile: req.user._id, stage: "Fresh Lead" } } }, { session });
                            chatModel.create({ participants: [student._id, Counsellor._id] }, { session });
                            student.advisors.push({ info: Counsellor._id, assignedCountries: [country] });
                            Product.advisors.push(Counsellor._id);
                        }
                        if (processCoordinators.length > 0) {
                            if (!processCoordinators[0].assignedCountries.includes(country)) processCoordinators[0].assignedCountries.push(country);
                            Product.advisors.push(processCoordinators[0].info._id);
                            teamModel.findByIdAndUpdate(processCoordinators[0].info._id, { $push: { applications: Product._id } }, { session });
                        } else {
                            const ProcessCoordinator = await getNewAdvisor("processCoordinator", country);
                            teamModel.findByIdAndUpdate(ProcessCoordinator._id, { $push: { applications: Product._id } }, { session });
                            student.advisors.push({ info: ProcessCoordinator._id, assignedCountries: [country] });
                            chatModel.create({ participants: [student._id, ProcessCoordinator._id] }, { session });
                            Product.advisors.push(ProcessCoordinator._id);
                        }
                        Product.log = [{ status: "Processing", stages: [{ name: "Waiting For Counsellor's Approval" }] }];
                        Product.status = "Processing";
                        Product.stage = "Waiting For Counsellor's Approval";
                        break;
                    case ProductCategoryEnum.SOP_LOR:
                        if (counsellors.length > 0) Product.advisors.push(counsellors[0].info._id);
                        else {
                            const Counsellor = await getNewAdvisor("counsellor", country);
                            teamModel.findByIdAndUpdate(Counsellor._id, { $push: { students: { profile: req.user._id, stage: "Fresh Lead" } } });
                            student.advisors.push({ info: Counsellor._id, assignedCountries: [country] });
                            Product.advisors.push(Counsellor._id);
                        }
                        Product.log = [{ status: "Processing", stages: [{ name: "Waiting For Counsellor's Connection" }] }];
                        Product.status = "Processing";
                        Product.stage = "Waiting For Counsellor's Connection";
                        break;

                    case ProductCategoryEnum.VISA:
                        Product.log = [{ status: "Processing", stages: [{ name: "Waiting For Visa expert Connection" }] }];
                        Product.status = "Processing";
                        Product.stage = "Waiting For Visa expert Connection";
                        break;
                    case ProductCategoryEnum.LOAN:
                        Product.log = [{ status: "Processing", stages: [{ name: "Waiting For loan expert Connection" }] }];
                        Product.status = "Processing";
                        Product.stage = "Waiting For loan expert Connection";
                        break;
                }
                await Product.save({ session });
            }

            studentModel.findByIdAndUpdate(order.student, { $addToSet: { "activity.products": order.products } }, { session });
        }
        if (hasPackageId) studentModel.findByIdAndUpdate(order.student, { $addToSet: { purchasedPackages: order.Package } }, { session });
        await studentModel.findByIdAndUpdate(order.student, { $push: { logs: { action: `order paid`, details: `orderId:${order._id}` } } }, { session });
        await student.save({ session });
        await session.commitTransaction();  // Commit the transaction
    } catch (error) {
        await session.abortTransaction();
        return res.status(500).json({ success: false, message: 'Transaction failed', error: error.message });
    }
    finally {
        session.endSession();
        return res.status(200).json({ success: true, message: 'Order processed successfully', data: { reference: order._id } });
    }
};
export const orderInfo = errorWrapper(async (req, res, next) => {
    const { orderId } = req.query;
    const order = await orderModel.findOne({ _id: orderId, student: req.user._id });
    if (!order) return { statusCode: 400, message: `invalid orderId or you might not have permission`, data: { orderId: orderId } };
    await Promise.all([
        await packageModel.populate(order, { path: "Package", select: "-logs" }),
        await productModel.populate(order, { path: "products" }),
        await Document.populate(order, { path: "products.docChecklist", select: "data" }),
        await userModel.populate(order, { path: "products.advisors", select: "firstName displayPicSrc lastName email role" })
    ])
    await courseModel.populate(order, { path: "products.course", select: "name discipline tuitionFee studyMode subDiscipline schoolName startDate studyLevel duration applicationDetails currency university elite" })
    await universityModel.populate(order, { path: "products.course.university", select: "name logoSrc location type establishedYear " })
    return { statusCode: 200, message: 'order info', data: order };
})
export const addingProductsToOrder = errorWrapper(async (req, res, next) => {
    await userModel.populate(req.user, { path: "advisors.info", select: "role expertiseCountry" })
    const { products } = req.body
    let productIds = []
    for (const product of products) {
        const newProductDetails = await productModel.create({
            user: req.user._id,
            course: product.courseId,
            intake: product.intake,
            advisors: [],
            order: req.order._id,
            category: product.category
        })
        let intakeExists
        let course = await courseModel.findById(newProductDetails.course, "location startDate")
        let country = course.location.country
        let counsellors = req.user.advisors.filter(ele => ele.info.role === "counsellor" && ele.assignedCountries.includes(country));
        switch (product.category) {
            case ProductCategoryEnum.PREMIUM:
            case ProductCategoryEnum.ELITE:
                newProductDetails.log = [{ status: "Processing", stages: [{ name: "Waiting For Counsellor's Approval" }] }]
                newProductDetails.status = "Processing"
                newProductDetails.stage = "Waiting For Counsellor's Approval"
                intakeExists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(newProductDetails.intake).getUTCMonth())
                if (!isNaN(intakeExists[0]?.deadlineMonth)) newProductDetails.deadline = new Date(new Date().getFullYear(), intakeExists[0].deadlineMonth, 1);  // adding deadline
                if (counsellors.length > 0) newProductDetails.advisors.push(counsellors[0]._id);
                else {
                    const Counsellors = await teamModel.aggregate([
                        { $match: { role: "counsellor", expertiseCountry: country } },
                        { $project: { _id: 1, students: 1, studentsCount: { $size: "$students" } } },
                        { $sort: { studentsCount: 1 } },
                        { $limit: 1 }
                    ]);
                    await teamModel.findByIdAndUpdate(Counsellors[0]._id, { $push: { students: { profile: req.user._id, stage: "Fresh Lead" } } });
                    await chatModel.create({ participants: [req.user._id, Counsellors[0]._id] });
                    req.user.advisors.push({ info: Counsellors[0]._id, assignedCountries: [country] })
                    newProductDetails.advisors.push(Counsellors[0]._id)
                } // adding counsellor
                let processCoordinators = req.user.advisors.filter(ele => ele.info.role === "processCoordinator" && (ele.assignedCountries.includes(country) || ele.info.expertiseCountry.includes(country)));
                if (processCoordinators.length > 0) {
                    if (!processCoordinators[0].assignedCountries.includes(country)) processCoordinators[0].assignedCountries.push(country);
                    newProductDetails.advisors.push(processCoordinators[0].info._id)
                    await teamModel.findByIdAndUpdate(processCoordinators[0].info._id, { $push: { applications: newProductDetails._id } })
                }
                else {
                    const processCoordinators = await teamModel.aggregate([{ $match: { role: "processCoordinator", expertiseCountry: country } }, { $project: { _id: 1, applications: 1, applicationsCount: { $cond: { if: { $isArray: "$applications" }, then: { $size: "$applications" }, else: 0 } } } }, { $sort: { applicationsCount: 1 } }, { $limit: 1 }]);
                    await teamModel.findByIdAndUpdate(processCoordinators[0]._id, { $push: { applications: newProductDetails._id } });
                    req.user.advisors.push({ info: processCoordinators[0]._id, assignedCountries: [country] })
                    await chatModel.create({ participants: [req.user._id, processCoordinators[0]._id] });
                    newProductDetails.advisors.push(processCoordinators[0]._id)
                }// adding processCoordinator
                break;
            case ProductCategoryEnum.SOP_LOR:
                if (counsellors.length > 0) newProductDetails.advisors.push(counsellors[0]._id);
                else {
                    const Counsellors = await teamModel.aggregate([
                        { $match: { role: "counsellor", expertiseCountry: country } },
                        { $project: { _id: 1, students: 1, studentsCount: { $size: "$students" } } },
                        { $sort: { studentsCount: 1 } },
                        { $limit: 1 }
                    ]);
                    await teamModel.findByIdAndUpdate(Counsellors[0]._id, { $push: { students: { profile: req.user._id, stage: "Fresh Lead" } } });
                    await chatModel.create({ participants: [req.user._id, Counsellors[0]._id] });
                    req.user.advisors.push({ info: Counsellors[0]._id, assignedCountries: [country] })
                    newProductDetails.advisors.push(Counsellors[0]._id)
                } // adding counsellor
                newProductDetails.log = [{ status: "Processing", stages: [{ name: "Waiting For Counsellor's Connection" }] }];
                newProductDetails.status = "Processing";
                newProductDetails.stage = "Waiting For Counsellor's Connection";
                break;
            case ProductCategoryEnum.VISA:
                newProductDetails.log = [{ status: "Processing", stages: [{ name: "Waiting For Visa expert Connection" }] }];
                newProductDetails.status = "Processing";
                newProductDetails.stage = "Waiting For Visa expert Connection";
                break;
            case ProductCategoryEnum.LOAN:
                newProductDetails.log = [{ status: "Processing", stages: [{ name: "Waiting For loan expert Connection" }] }];
                newProductDetails.status = "Processing";
                newProductDetails.stage = "Waiting For loan expert Connection";
                break;
        }
        await newProductDetails.save();
        productIds.push(newProductDetails._id)
    }
    req.order.products.push(...productIds)
    req.user.activity.products.push(...productIds)
    req.user.logs.push({
        action: `products added to package`,
        details: `productIds:${productIds}`
    })
    await req.order.save()
    await req.user.save()
    await packageModel.populate(req.order, { path: "Package" })
    await productModel.populate(req.order, { path: "products" })
    return { statusCode: 200, message: 'order', data: req.order };
});
export const requestCancellation = errorWrapper(async (req, res, next) => {
    const updatedApplication = await productModel.findOneAndUpdate({ _id: req.params.applicationId }, { $set: { cancellationRequest: true } }, { new: true });
    if (!updatedApplication) return { statusCode: 400, message: `Invalid application ID`, data: { applicationId: req.params.applicationId } };
    await Document.populate(updatedApplication, { path: "docChecklist.doc", select: "data", })
    await userModel.populate(updatedApplication, [
        { path: "user", select: "firstName lastName email displayPicSrc" },
        { path: "counsellor", select: "firstName lastName email displayPicSrc" }
    ])
    req.user.logs.push({
        action: `cancellation requested`,
        details: `applicationId:${req.params.applicationId}`
    })
    await req.user.save()
    await courseModel.populate(updatedApplication, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails university elite" });
    await universityModel.populate(updatedApplication, { path: "course.university", select: "name logoSrc location type establishedYear " });
    return { statusCode: 200, message: 'Application cancellation Request sent to processCoordinator', data: updatedApplication };
})
// ..............applications documents...................
export const uploadInApplication = errorWrapper(async (req, res, next) => {
    const { applicationId, checklistItemId } = req.body;
    const application = await productModel.findById(applicationId);
    if (!application) return { statusCode: 400, message: `invalid application ID`, data: { applicationId: applicationId } };
    const checklistItem = application.docChecklist.find(ele => ele._id.toString() == checklistItemId)
    if (!checklistItem) return { statusCode: 400, message: `invalid checklist ID`, data: { checklistItemId: checklistItemId } };
    const { originalname, path, mimetype } = req.file;
    const data = fs.readFileSync(path);
    const upload = { name: originalname, data: data, contentType: mimetype, user: req.user._id, viewers: [req.user._id, application.processCoordinator], type: "Application" }
    if (application.counsellor) upload.viewers.push(application.counsellor)
    const newDoc = await Document.create(upload);
    fs.unlinkSync(path);
    checklistItem.doc = newDoc._id
    req.user.logs.push({
        action: `document uploaded in checklist`,
        details: `applicationId:${applicationId}&checklistItemId:${checklistItemId}`
    })
    await req.user.save()
    await Promise.all([
        await application.save(),
        await courseModel.populate(application, { path: "course", select: "name discipline tuitionFee currency studyMode subDiscipline schoolName studyLevel duration university elite", }),
        await universityModel.populate(application, { path: "course.university", select: "name logoSrc location type establishedYear " }),
        Document.populate(application, { path: "docChecklist.doc", select: "data", })
    ])
    if (req.user.preference.currency) {
        const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates");

        if (application.course.currency.code !== req.user.preference.currency) {
            if (!rates[application.course.currency.code] || !rates[req.user.preference.currency]) return { statusCode: 400, message: `Exchange rates for the specified currencies are not available`, data: { currency: req.user.preference.currency } };
            application.course.tuitionFee.tuitionFee = costConversion(application.course.tuitionFee.tuitionFee, application.course.currency.code, req.user.preference.currency, rates[application.course.currency.code], rates[req.user.preference.currency]);
            application.course.currency = { code: req.user.preference.currency, symbol: currencySymbols[req.user.preference.currency] };
        }
    }
    return { statusCode: 200, message: 'Application checklist updated', data: application };
})
export const deleteUploadedFromApplication = errorWrapper(async (req, res, next) => {
    const { applicationId, checklistItemId, documentId } = req.body;
    const doc = await Document.findById(documentId)
    if (!doc) return { statusCode: 400, message: `invalid document ID`, data: { documentId: documentId } };
    const application = await productModel.findById(applicationId);
    if (!application) return { statusCode: 400, message: `invalid application ID`, data: { applicationId: applicationId } };
    const checklistItem = application.docChecklist.find(ele => ele._id.toString() == checklistItemId)
    if (!checklistItem) return { statusCode: 400, message: `invalid checklist ID`, data: { checklistItemId: checklistItemId } };
    if (doc.user.toString() != req.user._id.toString()) return { statusCode: 400, message: `you don't have access to delete or modify this content`, data: { applicationId, checklistItemId, documentId } };
    if (checklistItem.doc.toString() != documentId) return { statusCode: 400, message: `list item docId doesn't match with documentId`, data: { applicationId, checklistItemId, documentId } };
    checklistItem.doc = null
    checklistItem.isChecked = false
    req.user.logs.push({ action: `document deleted in application`, details: `applicationId:${applicationId}` })
    await Promise.all([
        await application.save(),
        await req.user.save(),
        await deleteFileInWorkDrive(doc.data.resource_id),
        await Document.findByIdAndDelete(documentId),
        await courseModel.populate(application, { path: "course", select: "name discipline tuitionFee currency studyMode subDiscipline schoolName studyLevel duration university elite", }),
        await universityModel.populate(application, { path: "course.university", select: "name logoSrc location type establishedYear " }),
        await Document.populate(application, { path: "docChecklist.doc", select: "data", })
    ])
    if (req.user.preference.currency) {
        const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates");
        if (application.course.currency.code !== req.user.preference.currency) {
            if (!rates[application.course.currency.code] || !rates[req.user.preference.currency]) {
                return { statusCode: 400, message: `Exchange rates for the specified currencies are not available`, data: { currency: req.user.preference.currency } };
            }
            application.course.tuitionFee.tuitionFee = costConversion(application.course.tuitionFee.tuitionFee, application.course.currency.code, req.user.preference.currency, rates[application.course.currency.code], rates[req.user.preference.currency]);
            application.course.currency = { code: req.user.preference.currency, symbol: currencySymbols[req.user.preference.currency] };
        }
    }
    return { statusCode: 200, message: `doc deleted`, data: application };
})
export const forceForwardApply = errorWrapper(async (req, res, next) => {
    const { applicationId } = req.body;
    const application = await productModel.findById(applicationId)
    if (!application) return { statusCode: 400, message: `invalid ApplicationId`, data: { applicationId: applicationId } };
    if (application.user.toString() != req.user._id.toString()) return { statusCode: 400, message: `invalid Access`, data: { applicationId: applicationId } };
    if (application.approval.counsellorApproval !== false) return { statusCode: 400, message: `Wait for Counsellors Response`, data: { applicationId: applicationId } };
    application.approval.userConsent = true
    await application.save()
    req.user.logs.push({ action: `Application forwarded forcefully`, details: `applicationId:${applicationId}` })
    await req.user.save()
    return { statusCode: 200, message: `Applied Forcefully`, data: application };
})
export const removeForceApply = errorWrapper(async (req, res, next) => {
    const { applicationId } = req.body;
    const application = await productModel.findById(applicationId)
    if (!application) return { statusCode: 400, message: `invalid ApplicationId`, data: { applicationId: applicationId } };
    if (application.user.toString() != req.user._id.toString()) return { statusCode: 400, message: `invalid Access`, data: { applicationId: applicationId } };
    if (application.approval.counsellorApproval !== false) return { statusCode: 400, message: `Wait for Counsellors Response`, data: { applicationId: applicationId } };
    application.approval.userConsent = false
    await application.save()
    req.user.logs.push({ action: `Removed forceful apply`, details: `applicationId:${applicationId}` })
    await req.user.save()
    return { statusCode: 200, message: `removed forced apply`, data: application };
})