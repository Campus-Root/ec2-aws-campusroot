import courseModel from "../../models/Course.js";
import chatModel from "../../models/Chat.js"
import universityModel from "../../models/University.js";
import fs from "fs";
import Document from "../../models/Uploads.js";
import { teamModel } from "../../models/Team.js";
import { applicationModel } from "../../models/application.js";
import { studentModel } from "../../models/Student.js";
import userModel from "../../models/User.js";
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import 'dotenv/config';
import exchangeModel from "../../models/ExchangeRates.js";
import { costConversion } from "../../utils/currencyConversion.js";
import { currencySymbols, ProductCategoryEnum } from "../../utils/enum.js";
import { productModel } from "../../models/Product.js";
import { packageModel } from "../../models/Package.js";
import { orderModel } from "../../models/Order.js";
import { RazorpayInstance } from "../../utils/razorpay.js";
import crypto from "crypto";
const ExchangeRatesId = process.env.EXCHANGERATES_MONGOID
export const addShortListed = errorWrapper(async (req, res, next) => {
    const { universityId, courseId } = req.body;
    if (!(await universityModel.findById(universityId))) return next(generateAPIError(`invalid universityId`, 400));
    if (!(await courseModel.findById(courseId))) return next(generateAPIError(`invalid courseId`, 400));
    const shortListed = req.user.activity.shortListed;
    const alreadyExists = shortListed.find((ele) => ele.course == courseId);
    if (alreadyExists) return next(generateAPIError(`course already exist in the list`, 400));
    shortListed.push({ university: universityId, course: courseId });
    req.user.logs.push({
        action: `course shortlisted`,
        details: `courseId:${courseId}&universityId:${universityId}`
    })
    await Promise.all([
        await req.user.save(),
        await universityModel.populate(req.user, { path: "activity.shortListed.university", select: "name logoSrc location type establishedYear ", }),
        await courseModel.populate(req.user, { path: "activity.shortListed.course", select: "name discipline tuitionFee startDate studyMode subDiscipline currency studyMode schoolName studyLevel duration applicationDetails", },)
    ])
    if (req.user.preference.currency) {
        const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates");
        const applyCurrencyConversion = (element) => {
            if (element.course.currency.code !== req.user.preference.currency) {
                if (!rates[element.course.currency.code] || !rates[req.user.preference.currency]) {
                    next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
                }
                element.course.tuitionFee.tuitionFee = costConversion(element.course.tuitionFee.tuitionFee, element.course.currency.code, req.user.preference.currency, rates[element.course.currency.code], rates[req.user.preference.currency]);
                element.course.currency = { code: req.user.preference.currency, symbol: currencySymbols[req.user.preference.currency] };
            }
        };
        req.user.activity.shortListed.forEach(applyCurrencyConversion);
    }
    return res.status(200).json({ success: true, message: `added to shortlist successfully`, data: req.user.activity.shortListed.slice(-1), AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const removeShortListed = errorWrapper(async (req, res, next) => {
    const updateResult = await studentModel.updateOne({ _id: req.user._id }, { $pull: { 'activity.shortListed': { _id: req.params.id } } });
    if (updateResult.modifiedCount === 0) return next(generateAPIError(`id doesn't exist in the list`, 400));
    req.user.logs.push({
        action: `course removed from shortlist`,
        details: `courseId:${req.params.id}`
    })
    return res.status(200).json({ success: true, message: `list updated`, data: null, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const checkout = errorWrapper(async (req, res, next) => {       // this is to initiate payments
    const { packageId, products, currency } = req.body;
    let order, Package
    const hasPackageId = Boolean(packageId);
    const hasProducts = Array.isArray(products) && products.length > 0;
    let orderOptions
    switch (true) {
        case !hasPackageId && !hasProducts:
            return next(generateAPIError(`either add packageId or products to checkout`, 400));
        case hasPackageId && hasProducts:
            return next(generateAPIError(`cannot add both products and package at checkout`, 400));
        case hasPackageId && !hasProducts:
            Package = await packageModel.findById(packageId);
            if (!Package) return next(generateAPIError(`invalid packageId`, 400));
            if (!Package.active) return next(generateAPIError(`inactive package selected`, 400))
            let { priceDetails: { totalPrice, currency } } = Package
            orderOptions = {
                currency: currency.code,
                amount: totalPrice,
                notes: {
                    "note_key": `purchase initiated by ${req.user.firstName} ${req.user.lastName}`,
                    "item_ids": [Package._id]
                }
            }
            const razorPay = RazorpayInstance.orders.create(orderOptions);
            order = await orderModel.create({
                student: req.user._id,
                Package: packageId,
                paymentDetails: {
                    paymentStatus: "pending",
                    razorpay_order_id: razorPay.id,
                    amount: razorPay.amount,
                    amount_due: razorPay.amount_due,
                    created_at: 1721380929,
                    currency: razorPay.currency,
                    misc: razorPay
                },
                status: "pending",
            })
            await studentModel.findOneAndUpdate({ _id: req.user._id }, { $push: { orders: order._id }, })
            req.user.logs.push({ action: `order placed`, details: `orderId:${order._id}` })
            await orderModel.populate(req.user, { path: "orders" })
            return res.status(200).json({ success: true, message: 'order placed', data: razorPay, AccessToken: req.AccessToken ? req.AccessToken : null });
        case !hasPackageId && hasProducts:
            return res.status(200).json({ success: true, message: 'purchased products successfully', data: { orders: req.user.orders }, AccessToken: req.AccessToken ? req.AccessToken : null });
        default: return next(generateAPIError(`some internal server error`, 500));
    }


})
export const paymentVerification = errorWrapper(async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest("hex");
    if (expectedSignature !== razorpay_signature) return res.status(400).json({ success: false, message: "payment verification failed, contact for support" });
    const razorPay = await RazorpayInstance.orders.fetch(razorpay_order_id)
    if (razorPay.status !== "paid") return res.status(400).json({ success: false, message: "payment status is not paid" });
    const order = await orderModel.findOneAndUpdate({ "paymentDetails.razorpay_order_id": razorpay_order_id }, {
        $set: {
            "paymentDetails.paymentStatus": razorPay.status,
            "paymentDetails.amount": razorPay.amount,
            "paymentDetails.amount_due": razorPay.amount_due,
            "paymentDetails.currency": razorPay.currency,
            "paymentDetails.misc": razorPay
        }
    }, { new: true });
    await studentModel.findByIdAndUpdate(order.student, { $addToSet: { purchasedPackages: order.Package } }, { new: true });
    res.redirect(`https://${process.env.SERVER_URL}paymentsuccess?reference=${razorpay_order_id}`);
})
export const order = errorWrapper(async (req, res, next) => {
    await userModel.populate(req.user, { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" })
    const { products } = req.body
    let productIds = []
    for (const product of products) {
        const newProduct = await productModel.create({
            user: req.user._id,
            category: product.category,
            university: product.data.university ? product.data.university : null,
            course: product.data.course ? product.data.course : null,
            intake: product.data.intake ? product.data.intake : null,
            deadline: product.data.deadline ? product.data.deadline : null
        })
        switch (product.category) {
            case "premium application" || "elite application":
                course = await courseModel.findById(product.data.course, "location elite startDate")
                let country = course.location.country
                counsellor = advisors.find(ele => info.role === "counsellor" && assignedCountries.includes(country))
                if (counsellor) newProduct.counsellor = counsellor._id
                else {
                    const Counsellors = await teamModel.aggregate([{ $match: { role: "counsellor", expertiseCountry: country } }, { $project: { _id: 1, students: 1, students: { $size: "$students" } } }, { $sort: { students: 1 } }, { $limit: 1 }]);
                    await teamModel.findByIdAndUpdate(Counsellors[0]._id, { $push: { students: { profile: req.user._id, stage: "Fresh Lead" } } });
                    req.user.advisors.push({ info: Counsellors[0]._id, assignedCountries: [country] })
                    newProduct.counsellor = Counsellors[0]._id
                }
                processCoordinator = advisors.find(ele => info.role === "processCoordinator" && (assignedCountries.includes(country) || info.expertiseCountry.includes(country)))
                if (processCoordinator) {
                    if (!processCoordinator.assignedCountries.includes(country)) processCoordinator.assignedCountries.push(country)
                    newProduct.processCoordinator = processCoordinator.info._id
                    await teamModel.findOneAndUpdate({ _id: processCoordinator.info._id }, { $push: { applications: newProduct._id } })
                }
                else {
                    const processCoordinators = await teamModel.aggregate([{ $match: { role: "processCoordinator", expertiseCountry: country } }, { $project: { _id: 1, applications: 1, applicationsCount: { $cond: { if: { $isArray: "$applications" }, then: { $size: "$applications" }, else: 0 } } } }, { $sort: { applicationsCount: 1 } }, { $limit: 1 }]);
                    await teamModel.findByIdAndUpdate(processCoordinators[0]._id, { $push: { applications: newProduct._id } });
                    req.user.advisors.push({ info: processCoordinator[0]._id, assignedCountries: [country] })
                    await chatModel.create({ participants: [req.user._id, processCoordinators[0]._id] });
                    newProduct.processCoordinator = processCoordinator.info._id
                }
                newProduct.log = [{ status: "Processing", stages: [{ name: "Waiting For Counsellor's Approval" }] }]
                newProduct.status = "Processing"
                newProduct.stage = "Waiting For Counsellor's Approval"
                break;
            case "statement of purpose":
                break;
            case "letter of recommendation":
                break;
            case "VISA process":
                break;
            case "education loan process":
                break;
        }
        await newProduct.save()
        productIds.push(newProduct._id)
    }
    req.order.push(...productIds)
    req.user.activity.products.push(...productIds)
    req.user.logs.push({
        action: `products added to package`,
        details: ``
    })
    await req.order.save()
    await req.user.save()
    await packageModel.populate(req.user, { path: "orders.Package" })
    await productModel.populate(req.user, { path: "orders.products" })
    return res.status(200).json({ success: true, message: 'order', data: req.order, AccessToken: req.AccessToken ? req.AccessToken : null });
});
export const requestCancellation = errorWrapper(async (req, res, next) => {
    const updatedApplication = await applicationModel.findOneAndUpdate({ _id: req.params.applicationId }, { $set: { cancellationRequest: true } }, { new: true });
    if (!updatedApplication) return next(generateAPIError(`Invalid application ID`, 400));
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
    res.status(200).json({ success: true, message: 'Application cancellation Request sent to processCoordinator', data: updatedApplication, AccessToken: req.AccessToken ? req.AccessToken : null });
})
// ..............applications documents...................
export const uploadInApplication = errorWrapper(async (req, res, next) => {
    const { applicationId, checklistItemId } = req.body;
    const application = await applicationModel.findById(applicationId);
    if (!application) return next(generateAPIError(`invalid application ID`, 400));
    const checklistItem = application.docChecklist.find(ele => ele._id.toString() == checklistItemId)
    if (!checklistItem) return next(generateAPIError(`invalid checklist ID`, 400));
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
            if (!rates[application.course.currency.code] || !rates[req.user.preference.currency]) {
                next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
            }
            application.course.tuitionFee.tuitionFee = costConversion(application.course.tuitionFee.tuitionFee, application.course.currency.code, req.user.preference.currency, rates[application.course.currency.code], rates[req.user.preference.currency]);
            application.course.currency = { code: req.user.preference.currency, symbol: currencySymbols[req.user.preference.currency] };
        }
    }
    res.status(200).json({ success: true, message: 'Application checklist updated', data: application, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const deleteUploadedFromApplication = errorWrapper(async (req, res, next) => {
    const { applicationId, checklistItemId, documentId } = req.body;
    const doc = await Document.findById(documentId)
    if (!doc) return next(generateAPIError(`invalid document ID`, 400));
    const application = await applicationModel.findById(applicationId);
    if (!application) return next(generateAPIError(`invalid application ID`, 400));
    const checklistItem = application.docChecklist.find(ele => ele._id.toString() == checklistItemId)
    if (!checklistItem) return next(generateAPIError(`invalid checklist ID`, 400));
    if (doc.user.toString() != req.user._id.toString()) return next(generateAPIError(`you don't have access to delete or modify this content`, 400));
    if (checklistItem.doc.toString() != documentId) return next(generateAPIError(`list item docId doesn't match with documentId`, 400));
    checklistItem.doc = null
    checklistItem.isChecked = false
    req.user.logs.push({
        action: `document deleted in application`,
        details: `applicationId:${applicationId}`
    })
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
                next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
            }
            application.course.tuitionFee.tuitionFee = costConversion(application.course.tuitionFee.tuitionFee, application.course.currency.code, req.user.preference.currency, rates[application.course.currency.code], rates[req.user.preference.currency]);
            application.course.currency = { code: req.user.preference.currency, symbol: currencySymbols[req.user.preference.currency] };
        }
    }
    return res.status(200).json({ success: true, message: `doc deleted`, data: application, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const forceForwardApply = errorWrapper(async (req, res, next) => {
    const { applicationId } = req.body;
    const application = await applicationModel.findById(applicationId)
    if (!application) return next(generateAPIError("invalid ApplicationId"))
    if (application.user.toString() != req.user._id.toString()) return next(generateAPIError("invalid Access"))
    if (application.approval.counsellorApproval !== false) return next(generateAPIError("Wait for Counsellors Response"))
    application.approval.userConsent = true
    await application.save()
    req.user.logs.push({
        action: `Application forwarded forcefully`,
        details: `applicationId:${applicationId}`
    })
    await req.user.save()
    return res.status(200).json({ success: true, message: `Applied Forcefully`, data: application, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const removeForceApply = errorWrapper(async (req, res, next) => {
    const { applicationId } = req.body;
    const application = await applicationModel.findById(applicationId)
    if (!application) return next(generateAPIError("invalid ApplicationId"))
    if (application.user.toString() != req.user._id.toString()) return next(generateAPIError("invalid Access"))
    if (application.approval.counsellorApproval !== false) return next(generateAPIError("Wait for Counsellors Response"))
    application.approval.userConsent = false
    await application.save()
    req.user.logs.push({
        action: `Removed forceful apply`,
        details: `applicationId:${applicationId}`
    })
    await req.user.save()
    return res.status(200).json({ success: true, message: `removed forced apply`, data: application, AccessToken: req.AccessToken ? req.AccessToken : null });

})