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
const ExchangeRatesId = process.env.EXCHANGERATES_MONGOID
export const Cart = errorWrapper(async (req, res, next) => {
    const { error, value } = CartSchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { action, category, courseId, intake, itemId } = value;
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
            if (found.length == 0) return { statusCode: 400, message: `item doesn't exists`, data: [value] };
            req.user.activity.cart = req.user.activity.cart.filter(ele => ele._id.toString() != itemId)
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
    await courseModel.populate(req.user, { path: "activity.cart.course", select: "name discipline tuitionFee startDate studyMode subDiscipline currency studyMode schoolName studyLevel duration applicationDetails university", },)
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
        await courseModel.populate(student, { path: "activity.wishList", select: "name discipline tuitionFee startDate studyMode subDiscipline currency studyMode schoolName studyLevel duration applicationDetails university", },),
        await universityModel.populate(student, { path: "activity.wishList.university", select: "name logoSrc location type establishedYear ", })
    ])
    return { statusCode: 200, message: `${action} successful`, data: student.activity.wishList };
});
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
                    course: product.course,
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
                    course: product.course,
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
    if (totalPrice == 0) {
        const order = await orderModel.create({
            student: req.user._id,
            Package: packageId ? packageId : null,
            products: newProductIds,
            paymentDetails: {
                paymentStatus: "paid",
                amount: 0,
                amount_due: 0,
                created_at: 1721380929,
                currency: "INR",
            },
            status: "paid",
        })
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
        logs: [{ action: "new Order Created", details: orderOptions.notes }],
    })
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
    order.logs.push({ action: "re-checkout initiated", details: orderOptions.notes })
    await order.save()
    await studentModel.findOneAndUpdate({ _id: req.user._id }, { $push: { logs: { action: `order attempted for re-Checkout`, details: `orderId:${order._id}` } } })
    return { statusCode: 200, message: 'order placed', data: { razorPay, order } };
})
export const paymentVerification = errorWrapper(async (req, res, next) => {
    const { razorpay_order_id } = req.body;
    const order = await orderModel.findOneAndUpdate({ "paymentDetails.razorpay_order_id": razorpay_order_id }, { $set: { "paymentDetails.paymentStatus": req.razorPay.status, "paymentDetails.amount": req.razorPay.amount, "paymentDetails.amount_due": req.razorPay.amount_due, "paymentDetails.currency": req.razorPay.currency, "paymentDetails.misc": req.razorPay } }, { new: true });
    const student = await studentModel.findById(order.student, "advisors")
    const hasPackageId = Boolean(order.Package);
    const hasProducts = Array.isArray(order.products) && order.products.length > 0;
    if (hasProducts) {
        for (const product of order.products) {
            const Product = productModel.findById(product)
            let course = await courseModel.findById(Product.course, "location.country")
            let country = course.location.country
            if ([ProductCategoryEnum.ELITE, ProductCategoryEnum.PREMIUM].includes(Product.category)) {
                counsellor = student.advisors.find(ele => ele.info.role === "counsellor" && ele.assignedCountries.includes(country))
                if (counsellor) Product.advisors.push(counsellor._id)
                else {
                    const Counsellors = await teamModel.aggregate([{ $match: { role: "counsellor", expertiseCountry: country } }, { $project: { _id: 1, students: 1, students: { $size: "$students" } } }, { $sort: { students: 1 } }, { $limit: 1 }]);
                    await teamModel.findByIdAndUpdate(Counsellors[0]._id, { $push: { students: { profile: req.user._id, stage: "Fresh Lead" } } });
                    student.advisors.push({ info: Counsellors[0]._id, assignedCountries: [country] })
                    Product.advisors.push(Counsellors[0]._id)
                }
                processCoordinator = student.advisors.find(ele => ele.info.role === "processCoordinator" && (assignedCountries.includes(country) || info.expertiseCountry.includes(country)))
                if (processCoordinator) {
                    if (!processCoordinator.assignedCountries.includes(country)) processCoordinator.assignedCountries.push(country)
                    Product.advisors.push(processCoordinator.info._id)
                    await teamModel.findByIdAndUpdate(processCoordinator.info._id, { $push: { applications: Product._id } })
                }
                else {
                    const processCoordinators = await teamModel.aggregate([{ $match: { role: "processCoordinator", expertiseCountry: country } }, { $project: { _id: 1, applications: 1, applicationsCount: { $cond: { if: { $isArray: "$applications" }, then: { $size: "$applications" }, else: 0 } } } }, { $sort: { applicationsCount: 1 } }, { $limit: 1 }]);
                    await teamModel.findByIdAndUpdate(processCoordinators[0]._id, { $push: { applications: Product._id } });
                    student.advisors.push({ info: processCoordinators[0]._id, assignedCountries: [country] })
                    await chatModel.create({ participants: [student._id, processCoordinators[0]._id] });
                    Product.advisors.push(processCoordinators[0]._id)
                }
            }
            product.log = [{ status: "Processing", stages: [{ name: "Waiting For Counsellor's Approval" }] }]
            product.status = "Processing"
            product.stage = "Waiting For Counsellor's Approval"
            product.order = order_id;
            await product.save();
        }
        await studentModel.findByIdAndUpdate(order.student, { $addToSet: { "activity.products": order.products } });
    }
    if (hasPackageId) await studentModel.findByIdAndUpdate(order.student, { $addToSet: { purchasedPackages: order.Package } });
    await student.save();
    res.redirect(`${process.env.SERVER_URL}paymentsuccess?reference=${order._id}`);
})
export const orderInfo = errorWrapper(async (req, res, next) => {
    const { orderId } = req.query;
    // https://campusroot.com/paymentsuccess?reference=669fa190dc22145b5fadc789
    const order = await orderModel.findOne({ _id: orderId, student: req.user._id });
    if (!order) return { statusCode: 400, message: `invalid orderId or you might not have permission`, data: { orderId: orderId } };
    await packageModel.populate(order, { path: "Package", select: "-logs" })
    return { statusCode: 200, message: 'order info', data: order };
})
export const order = errorWrapper(async (req, res, next) => {
    await userModel.populate(req.user, { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" })
    const { products } = req.body
    let productIds = [], course, counsellor, processCoordinator, country
    for (const product of products) {
        let newProductDetails = {
            user: req.user._id,
            course: product.course ? product.course : null,
            intake: product.intake ? product.intake : null,
            advisors: [],
            order: req.order._id,
            category: product.category
        }, intakeExists
        switch (product.category) {
            case ProductCategoryEnum.PREMIUM || ProductCategoryEnum.ELITE:
                newProductDetails.log = [{ status: "Processing", stages: [{ name: "Waiting For Counsellor's Approval" }] }]
                newProductDetails.status = "Processing"
                newProductDetails.stage = "Waiting For Counsellor's Approval"
                course = await courseModel.findById(newProductDetails.course, "location startDate")
                intakeExists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(newProductDetails.intake).getUTCMonth())
                if (!isNaN(intakeExists[0].deadlineMonth)) newProductDetails.deadline = new Date(new Date().getFullYear(), intakeExists[0].deadlineMonth, 1);  // adding deadline
                country = course.location.country
                counsellor = req.user.advisors.find(ele => ele.info.role === "counsellor" && ele.assignedCountries.includes(country))
                if (counsellor) newProductDetails.advisors.push(counsellor._id)
                else {
                    const Counsellors = await teamModel.aggregate([{ $match: { role: "counsellor", expertiseCountry: country } }, { $project: { _id: 1, students: 1, students: { $size: "$students" } } }, { $sort: { students: 1 } }, { $limit: 1 }]);
                    await teamModel.findByIdAndUpdate(Counsellors[0]._id, { $push: { students: { profile: req.user._id, stage: "Fresh Lead" } } });
                    await chatModel.create({ participants: [req.user._id, Counsellors[0]._id] });
                    req.user.advisors.push({ info: Counsellors[0]._id, assignedCountries: [country] })
                    newProductDetails.advisors.push(Counsellors[0]._id)
                } // adding counsellor
                processCoordinator = req.user.advisors.find(ele => ele.info.role === "processCoordinator" && (assignedCountries.includes(country) || info.expertiseCountry.includes(country)))
                if (processCoordinator) {
                    if (!processCoordinator.assignedCountries.includes(country)) processCoordinator.assignedCountries.push(country)
                    newProductDetails.advisors.push(processCoordinator.info._id)
                    await teamModel.findByIdAndUpdate(processCoordinator.info._id, { $push: { applications: newProductDetails._id } })
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
                break;
            case ProductCategoryEnum.VISA:
                break;
            case ProductCategoryEnum.LOAN:
                break;
        }
        const newProduct = await productModel.create(newProductDetails)
        productIds.push(newProduct._id)
    }
    req.order.products.push(...productIds)
    req.user.activity.products.push(...productIds)
    req.user.logs.push({
        action: `products added to package`,
        details: `productIds:${productIds}`
    })
    await req.order.save()
    await req.user.save()
    await packageModel.populate(req.user, { path: "orders.Package" })
    await productModel.populate(req.user, { path: "orders.products", path: "activity.products" })
    return { statusCode: 200, message: 'order', data: req.order };
});
export const requestCancellation = errorWrapper(async (req, res, next) => {
    const updatedApplication = await productModel.findOneAndUpdate({ _id: req.params.applicationId }, { $set: { cancellationRequest: true } }, { new: true });
    if (!updatedApplication) return { statusCode: 400, message: `Invalid application ID`, data: { applicationId: req.params.applicationId } };
    await Document.populate(updatedApplication, { path: "docChecklist.doc", select: "name contentType createdAt", })
    await userModel.populate(updatedApplication, [
        { path: "user", select: "firstName lastName email displayPicSrc" },
        { path: "counsellor", select: "firstName lastName email displayPicSrc" }
    ])
    req.user.logs.push({
        action: `cancellation requested`,
        details: `applicationId:${req.params.applicationId}`
    })
    await req.user.save()
    await universityModel.populate(updatedApplication, { path: "university", select: "name logoSrc location type establishedYear " });
    await courseModel.populate(updatedApplication, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails" });
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
        await universityModel.populate(application, { path: "university", select: "name logoSrc location type establishedYear " }),
        await courseModel.populate(application, { path: "course", select: "name discipline tuitionFee currency studyMode subDiscipline schoolName studyLevel duration", }),
        Document.populate(application, { path: "docChecklist.doc", select: "name contentType createdAt", })
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
    await req.user.save()
    await Promise.all([
        await application.save(),
        await Document.findByIdAndDelete(documentId),
        await universityModel.populate(application, { path: "university", select: "name logoSrc location type establishedYear " }),
        await courseModel.populate(application, { path: "course", select: "name discipline tuitionFee currency studyMode subDiscipline schoolName studyLevel duration", }),
        await Document.populate(application, { path: "docChecklist.doc", select: "name contentType createdAt", })
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