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

/*
order initiated by razorpay{
  amount: 5000,
  amount_due: 5000,
  amount_paid: 0,
  attempts: 0,
  created_at: 1721380929,
  currency: 'INR',
  entity: 'order',
  id: 'order_OaRJnxZkPhxJFo',
  notes: [],
  offer_id: null,
  receipt: 'order_rcptid_11',
  status: 'created'
}
{
  razorpay_order_id: 'order_OaRJnxZkPhxJFo',
  razorpay_payment_id: 'pay_OaRMYUzco7OJUW',
  razorpay_signature: '514f1a4f0636e441562ed15ffe8383b1d3fb159d5547b8ab80bb65fd5163eacc'
}






{
    "success": true,
    "message": "purchased package successfully",
    "data": {
        "priceDetails": {
            "currency": {
                "symbol": "₹",
                "code": "INR"
            },
            "totalPrice": 15000,
            "availableCoupons": []
        },
        "_id": "669a715fcd929a47f8ec7d3d",
        "variety": "Custom",
        "name": "viz spl edited",
        "description": "A magical door to beautiful fortune",
        "country": [
            "Ireland",
            "United Kingdom",
            "United States of America"
        ],
        "imageSrc": "none for now either",
        "requirements": [],
        "benefits": [
            "Total Number of Institutions: 7",
            "Admissions Counselling",
            "University Shortlist & Selection",
            "Application Submission",
            "Application Documentation",
            "Admission Status Follow - up",
            "Visa Application",
            "Documentation for Visa",
            "Mock Interview Sessions",
            "SOP, LOR & Other Content Check and Tips",
            "Advance Assistance in SOP, LOR and Other Content",
            "Scholarship Search and Application",
            "Education Loan Assistance (Gyan Dhan)",
            "Accommodation Assistance",
            "Forex Arrangement"
        ],
        "products": [
            {
                "category": "elite application",
                "quantity": 3,
                "_id": "669a79f7924fea37a6abb335"
            },
            {
                "category": "premium application",
                "quantity": 4,
                "_id": "669a79f7924fea37a6abb336"
            },
            {
                "category": "statement of purpose",
                "quantity": 7,
                "_id": "669a79f7924fea37a6abb337"
            },
            {
                "category": "VISA process",
                "quantity": 1,
                "_id": "669a79f7924fea37a6abb338"
            },
            {
                "category": "letter of recommendation",
                "quantity": 3,
                "_id": "669a79f7924fea37a6abb339"
            }
        ],
        "termsAndConditions": "A life without risks isn't a life, it's an existence",
        "active": false,
    }
*/

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
            const razorPay = await RazorpayInstance.orders.create(orderOptions);
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
    // switch (cases) {
    //     case "none":

    //     case "package":

    // const rules = new Map();
    // Package.products.forEach(ele => {
    //     rules.set(ele.category, ele.quantity)
    // });
    // let products = []
    // for (let [key, value] of rules) {
    //     for (let i = 0; i < value; i++) {
    //         let product = productModel.create({
    //             user: req.user._id,
    //             category: key
    //         })
    //         products.push(product._id)
    //     }
    // }
    // orderOptions = {

    // }

    // const order = RazorpayInstance.orders.create({

    // })
    // order = await orderModel.create({
    //     student: req.user._id,
    //     Package: packageId,
    //     // products: products,
    //     paymentDetails: {
    //         paymentStatus: "pending",
    //     },
    //     
    // })


    // return res.status(200).json({ success: true, message: 'purchased package successfully', data: { orders: req.user.orders, purchasedPackages: req.user.purchasedPackages }, AccessToken: req.AccessToken ? req.AccessToken : null });
    // case "products":
    // let Products = []
    // let invalidCategories = products.filter(ele => !Object.values(ProductCategoryEnum).includes(ele.category))
    // if (invalidCategories.length > 0) return next(generateAPIError(`invalid categories:${invalidCategories}`, 400));
    // for (const ele of products) {
    //     let product = productModel.create({
    //         user: req.user._id,
    //         category: ele.category,
    //         university: ele.data.university ? ele.data.university : null,
    //         course: ele.data.course ? ele.data.course : null,
    //         intake: ele.data.intake ? ele.data.intake : null,
    //         deadline: ele.data.deadline ? ele.data.deadline : null,
    //     })
    //     Products.push(product._id)
    // }
    // order = await orderModel.create({
    //     student: req.user._id,
    //     products: products,
    //     paymentDetails: {
    //         paymentStatus: "completed",
    //     },
    //     status: "completed",
    // })
    // await studentModel.findOneAndUpdate({ _id: req.user._id }, {
    //     $push: { orders: order._id },
    // })
    // req.user.logs.push({
    //     action: `order placed, products purchased`,
    //     details: `orderId:${order._id}`
    // })
    // await orderModel.populate(req.user, { path: "orders" })

    // payment gateway process

    // send checkout request (payment details to front-end)



})

export const paymentVerification = errorWrapper(async (req, res, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest("hex");
    if (expectedSignature !== razorpay_signature) return res.status(400).json({ success: false, message: "payment verification failed, contact for support" });
    const razorPay = await RazorpayInstance.orders.fetch(razorpay_order_id)
    if (razorPay.status !== "paid") return res.status(400).json({ success: false, message: "payment status is not paid" });
    console.log(razorPay, "\n................................................................");
    const order = await orderModel.findOneAndUpdate({ "paymentDetails.razorpay_order_id": razorpay_order_id }, {
        $set: {
            "paymentDetails.paymentStatus": razorPay.status,
            "paymentDetails.amount": razorPay.amount,
            "paymentDetails.amount_due": razorPay.amount_due,
            "paymentDetails.currency": razorPay.currency,
            "paymentDetails.misc": razorPay
        }
    }, { new: true });
    console.log(order, "\n................................................................");
    let student = await studentModel.findByIdAndUpdate(order.student, { $addToSet: { purchasedPackages: order.Package } }, { new: true });
    console.log(student.purchasedPackages, "\n................................................................");
    res.redirect('http://localhost:8080/api/v1/student/paymentVerification')
    // res.redirect(`https://${process.env.SERVER_URL}paymentsuccess?reference=${razorpay_order_id}`);
})
/*
products = [
{
productId:"",
category:"",
data:{
university: ele.data.university ? ele.data.university : null,
course: ele.data.course ? ele.data.course : null,
intake: ele.data.intake ? ele.data.intake : null,
deadline: ele.data.deadline ? ele.data.deadline : null,
}

}]
*/

export const order = errorWrapper(async (req, res, next) => {
    const { orderId, products } = req.body;
    // await orderModel.populate(req.user, { path: "orders" })
    // await productModel.populate(req.user, { path: "orders.products" })
    // await packageModel.populate(req.user, { path: "orders.Package" })
    if (!req.user.orders.includes(orderId)) return next(generateAPIError(`invalid orderId`, 400));
    let order = await orderModel.findById(orderId).populate("products").populate("Package");
    if (order.paymentDetails.paymentStatus != "completed") return next(generateAPIError(`please complete payments to add products`, 400));
    const rules = new Map();
    order.Package.products.forEach(ele => { rules.set(ele.category, ele.quantity) });
    let existingProducts = new Map();
    order.products.forEach(product => { existingProducts.set(product.category, (existingProducts.get(product.category) ? existingProducts.get(product.category) : 0) + 1) })
    products.forEach(async ele => {
        if (!rules.has(ele.category)) return next(generateAPIError(`invalid product category:${ele.category}`, 400));
        if (existingProducts.get(ele.category) >= rules.get(ele.category)) return next(generateAPIError(`quantity limit exceeded for ${ele.category}`, 400));
        // country check
        switch (ele.category) {
            case "premium application":
                let course = await courseModel.findById(ele.data.course, "location elite startDate")
                if (!course) return next(generateAPIError(`invalid ${ele.category}`, 400));
                if (!order.Package.country.includes(course.location.country)) return next(generateAPIError(`invalid ${ele.category}`, 400));
                if (course.elite) return next(generateAPIError(`${ele.category} mismatch`, 400));
                if (!ele.data.intake || new Date(ele.data.intake) <= new Date()) return next(generateAPIError(`invalid intake`, 400));
                const Exists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(intake).getUTCMonth())
                if (Exists.length <= 0) return next(generateAPIError(`intake doesn't exist`, 400));
                const existingApplication = await applicationModel.findOne({
                    course: ele.data.course,
                    user: req.user._id,
                    intake: ele.data.intake,
                    category: ele.category
                }, "_id");
                if (existingApplication) return next(generateAPIError(`Already applied for ${ele.category}`, 400));

                break;

            default:
                break;
        }
    });










    // find products that are already full
    order.products.forEach(product => {
        existingProducts.set(product.category, (existingProducts.get(product.category) ? existingProducts.get(product.category) : 0) + 1)
    })
    for (const ele of products) {
        // get product details from db

        // verify its suitability from rules and country from package details
        // add them to the order
        // add products to student





        // let product = order.products.find(product => product.category === ele.category)
        // if (!product) return next(generateAPIError(`invalid product category:${ele.category}`, 400));
        // if (product.university && product.university != ele.data.university) errorStack.push(`university mismatch for ${ele.category}`)
        // if (product.course && product.course != ele.data.course)
    }







    /*
        Package = await packageModel.findById(packageId);
        if (!Package) return next(generateAPIError(`invalid packageId`, 400));

       
        let products = []
        for (let [key, value] of rules) {
            for (let i = 0; i < value; i++) {
                let product = productModel.create({
                user: req.user._id,
                category: key
            })
            products.push(product._id)
        }
        }
        order = await orderModel.create({
            student: req.user._id,
            Package: packageId,
            products: products,
            paymentDetails: {
            paymentStatus: "completed",
            },
            status: "completed",
            })
        await studentModel.findOneAndUpdate({ _id: req.user._id }, {
        $push: { orders: order._id, purchasedPackages: packageId },
        })
                req.user.logs.push({
                    action: `order placed, package purchased`,
                    details: `orderId:${order._id}`
                })
                await orderModel.populate(req.user, { path: "orders" })
                await packageModel.populate(req.user, { path: "purchasedPackages" })
                return res.status(200).json({ success: true, message: 'purchased package successfully', data: { orders: req.user.orders, purchasedPackages: req.user.purchasedPackages }, AccessToken: req.AccessToken ? req.AccessToken : null });
    */




    // if (!req.user.advisors.find(ele => ele.role === "processCoordinator")) {
    //     const processCoordinators = await teamModel.aggregate([{ $match: { role: "processCoordinator" } },
    //     {
    //         $project: {
    //             _id: 1, applications: 1,
    //             applicationsCount: {
    //                 $cond: {
    //                     if: { $isArray: "$applications" },
    //                     then: { $size: "$applications" },
    //                     else: 0
    //                 }
    //             }
    //         }
    //     }, { $sort: { applicationsCount: 1 } }, { $limit: 1 }]);
    //     req.user.advisors.push({
    //         info: processCoordinators[0]._id,
    //         role: "processCoordinator"
    //     })
    //     await teamModel.findOneAndUpdate({ _id: processCoordinators[0]._id }, { $push: { students: { profile: req.user._id } }, });
    //     await chatModel.create({ participants: [req.user._id, processCoordinators[0]._id] });
    //     await Document.updateMany({ user: req.user._id, type: "General" }, { $push: { viewers: processCoordinators[0]._id } })
    // }
    // const alreadyExists = await applicationModel.find({ user: req.user._id, intake: intake, course: courseId })
    // if (alreadyExists.length > 0) return next(generateAPIError(`Already applied for this intake`, 400));
    // let counsellor = req.user.advisors.find(ele => ele.role == "counsellor")
    // let processCoordinator = req.user.advisors.find(ele => ele.role == "processCoordinator")
    // let deadlineDate;
    // if (Exists[0].deadlineMonth != null) {
    //     const currentYear = new Date().getFullYear();
    //     const deadlineYear = Exists[0].deadlineMonth >= new Date().getMonth() ? currentYear : currentYear + 1;
    //     deadlineDate = new Date(deadlineYear, Exists[0].deadlineMonth, 2);
    // }
    // const newApplication = await applicationModel.create({
    //     counsellor: counsellor.info,
    //     university: universityId,
    //     course: courseId,
    //     intake: intake,
    //     deadline: deadlineDate ? deadlineDate : null,
    //     user: req.user._id,
    //     processCoordinator: processCoordinator.info,
    //     log: [{ status: "Processing", stages: [{ name: "Waiting For Counsellor's Approval" }] }],
    //     status: "Processing",
    //     stage: "Waiting For Counsellor's Approval"
    // });
    // await teamModel.findOneAndUpdate({ _id: processCoordinator.info }, { $push: { applications: newApplication._id } })
    // req.user.activity.applications.processing.push(newApplication._id)
    // req.user.logs.push({
    //     action: `application process Initiated`,
    //     details: `applicationId:${newApplication._id}`
    // })
    // await req.user.save()
    // await applicationModel.populate(req.user, { path: "activity.applications.processing" })
    // await userModel.populate(req.user, [{ path: "activity.applications.processing.user", select: "firstName lastName email displayPicSrc" }, { path: "activity.applications.processing.counsellor", select: "firstName lastName email displayPicSrc" }, { path: "activity.applications.processing.processCoordinator", select: "firstName lastName email displayPicSrc" }])
    // await universityModel.populate(req.user, { path: "activity.applications.processing.university", select: "name logoSrc location type establishedYear " })
    // await courseModel.populate(req.user, { path: "activity.applications.processing.course", select: "name tuitionFee currency studyMode discipline subDiscipline schoolName studyLevel duration", })
    // if (req.user.preference.currency) {
    //     const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates");
    //     const applyCurrencyConversion = (element) => {
    //         if (element.course.currency.code !== req.user.preference.currency) {
    //             if (!rates[element.course.currency.code] || !rates[req.user.preference.currency]) {
    //                 next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
    //             }
    //             element.course.tuitionFee.tuitionFee = costConversion(element.course.tuitionFee.tuitionFee, element.course.currency.code, req.user.preference.currency, rates[element.course.currency.code], rates[req.user.preference.currency]);
    //             element.course.currency = { code: req.user.preference.currency, symbol: currencySymbols[req.user.preference.currency] };
    //         }
    //     };
    //     req.user.activity.applications.processing.forEach(applyCurrencyConversion);
    // }
    // res.status(200).json({ success: true, message: 'New Application Registered', data: req.user.activity.applications.processing.slice(-1), AccessToken: req.AccessToken ? req.AccessToken : null });




    // const { courseIds } = req.body;
    // let courses = await courseModel.find({ "_id": { $in: courseIds } }, "university elite")
    // if (courses.length !== courseIds.length) return next(generateAPIError(`invalid courseIds`, 400));
    // let Products = [], quant = new Map()
    // for (const course of courses) {
    //     let Class = (course.elite) ? "elite application" : "premium application"
    //     const product = await applicationModel.create({
    //         university: course.university,
    //         course: course._id,
    //         user: req.user._id,
    //         Class
    //     })
    //     quant.set(Class, (quant.get(Class) || 0) + 1);
    //     Products.push(product._id)
    // }
    // let totalPrice = quant.get("elite application") * 14900 + quant.get("elite application") * 1800
    // req.user.activity.cart.push({
    //     products: Products,
    //     totalPrice: totalPrice,
    //     quotePending: true
    // })
    // await req.user.save()
    // await productModel.populate(req.user, { path: "activity.cart.products", select: "university course user category", })
    // await courseModel.populate(req.user, { path: "activity.cart.products.course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails" })
    // await universityModel.populate(req.user, { path: "activity.cart.products.university", select: "name logoSrc location type establishedYear " })
    // res.status(200).json({ success: true, message: 'Quote Request sent to team member', data: req.user.activity.cart, AccessToken: req.AccessToken ? req.AccessToken : null });
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