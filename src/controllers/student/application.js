import courseModel from "../../models/Course.js";
import chatModel from "../../models/Chat.js"
import universityModel from "../../models/University.js";
import fs from "fs";
import Document from "../../models/Uploads.js";
import { teamModel } from "../../models/Team.js";
import { eliteApplicationModel, premiumApplicationModel } from "../../models/application.js";
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
import { priceModel } from "../../models/prices.js";
const ExchangeRatesId = process.env.EXCHANGERATES_MONGOID
export const addToCart = errorWrapper(async (req, res, next) => {

})
export const removeFromCart = errorWrapper(async (req, res, next) => {

})
export const wishList = errorWrapper(async (req, res, next) => {
    const { action, courseId } = req.body;
    if (!(await courseModel.findById(courseId))) return next(generateAPIError(`invalid courseId`, 400, [{ action, courseId }]));
    if (!["push", "pull"].includes(action)) return next(generateAPIError(`invalid action`, 400, [{ action, courseId }]));
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
    res.status(200).json({ success: true, message: `wish-list successfully`, data: student.activity.wishList });
});

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
export const checkout = errorWrapper(async (req, res, next) => {
    const { packageId, products, userCurrency } = req.body;
    const hasPackageId = Boolean(packageId);
    const hasProducts = Array.isArray(products) && products.length > 0;
    let newProductIds = [], course, Package, errorStack = [], newProducts;
    switch (true) {
        case !hasPackageId && !hasProducts:
            return next(generateAPIError(`either add packageId or products to checkout`, 400));
        case hasPackageId && !hasProducts:
            Package = await packageModel.findById(packageId);
            if (!Package) return next(generateAPIError(`invalid packageId`, 400, { packageId: packageId }));
            if (!Package.active) return next(generateAPIError(`inactive package selected`, 400, { packageId: packageId }));
            totalPrice = Package.priceDetails.totalPrice;
            currency = Package.priceDetails.currency;
            break;
        case !hasPackageId && hasProducts:
            totalPrice = 0, currency = "INR"
            newProducts = [];
            for (const product of products) {
                let newProductDetails = {
                    user: req.user._id,
                    course: product.data.course ? product.data.course : null,
                    intake: new Date(product.data.intake) ? new Date(product.data.intake) : null
                }
                course = await courseModel.findById(newProductDetails.course, "elite startDate university")
                if (!course) errorStack.push({ ...product, errorMessage: `invalid courseId` });  //product course check
                if (!newProductDetails.intake || new Date(newProductDetails.intake) <= new Date()) errorStack.push({ ...product, errorMessage: `invalid intake` });
                intakeExists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(newProductDetails.intake).getUTCMonth())
                if (intakeExists.length <= 0) errorStack.push({ ...product, errorMessage: `intake doesn't exist` }); //product intake check
                if (!isNaN(intakeExists[0].deadlineMonth)) newProductDetails.deadline = new Date(new Date().getFullYear(), intakeExists[0].deadlineMonth, 1);  // adding deadline
                if (course.university) newProductDetails.university = course.university // adding university
                let priceObject = await priceModel.findOne({ productCategory: product.category }, "price currency")
                totalPrice += Number(priceObject.price)
                let alreadyExists = await productModel.find({ course: newProductDetails.course, user: req.user._id, intake: newProductDetails.intake, category: product.category }, "_id")
                if (alreadyExists.length > 0) errorStack.push({ ...product, errorMessage: `this product already taken` }); // duplicates check
                if (product.category === ProductCategoryEnum.PREMIUM && course.elite) errorStack.push({ ...product, errorMessage: `${product.category} mismatch` }); // product elite or premium check
                if (product.category === ProductCategoryEnum.ELITE && !course.elite) errorStack.push({ ...product, errorMessage: `${product.category} mismatch` }); // product elite or premium check
                if (!Object.values(ProductCategoryEnum).includes(product.category)) errorStack.push({ ...product, errorMessage: `invalid category: ${product.category}` });
                newProducts.push(newProductDetails)
            }
            if (errorStack.length > 0) return next(generateAPIError(`Invalid products`, 400, errorStack));
            for (const product of newProducts) {
                let newProduct
                if (product.category === ProductCategoryEnum.PREMIUM) newProduct = await premiumApplicationModel.create(newProductDetails)
                else if (product.category === ProductCategoryEnum.ELITE) newProduct = await eliteApplicationModel.create(newProductDetails)
                newProductIds.push(newProduct._id)
            }
            break;
        case hasPackageId && hasProducts:
            Package = await packageModel.findById(packageId);
            if (!Package) return next(generateAPIError(`invalid packageId`, 400, { packageId: packageId }));
            if (!Package.active) return next(generateAPIError(`inactive package selected`, 400, { packageId: packageId }));
            totalPrice = Package.priceDetails.totalPrice;
            currency = Package.priceDetails.currency;
            const rules = new Map();
            Package.products.forEach(ele => { rules.set(ele.category, ele.quantity) });
            let productsCanBeAdded = new Map(rules)
            newProducts = [];
            for (const product of products) {
                let newProductDetails = {
                    user: req.user._id,
                    course: product.data.course ? product.data.course : null,
                    intake: new Date(product.data.intake) ? new Date(product.data.intake) : null
                }
                const availableQuantity = productsCanBeAdded.get(product.category) || 0;
                if (availableQuantity <= 0) errorStack.push({ ...product, errorMessage: `limit exceeded` })       // quantity check based on category
                productsCanBeAdded.set(product.category, availableQuantity - 1);
                course = await courseModel.findById(newProductDetails.course, "location elite startDate university")
                if (!course) errorStack.push({ ...product, errorMessage: `invalid courseId` });             // product course check
                if (!Package.country.includes(course.location.country)) errorStack.push({ ...product, errorMessage: `country mismatched` }); // product country check
                if (!newProductDetails.intake || new Date(newProductDetails.intake) <= new Date()) errorStack.push({ ...product, errorMessage: `invalid intake` });
                let intakeExists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(newProductDetails.intake).getUTCMonth())
                if (intakeExists.length <= 0) errorStack.push({ ...product, errorMessage: `intake doesn't exist` });   // product intake check
                if (!isNaN(intakeExists[0].deadlineMonth)) newProductDetails.deadline = new Date(new Date().getFullYear(), intakeExists[0].deadlineMonth, 1);  // adding deadline
                if (course.university) newProductDetails.university = course.university // adding university
                let alreadyExists = await productModel.find({ course: newProductDetails.course, user: req.user._id, intake: newProductDetails.intake, category: product.category }, "_id")
                if (alreadyExists.length > 0) errorStack.push({ ...product, errorMessage: `this product already taken` }); // product duplicate check
                if (product.category === ProductCategoryEnum.PREMIUM && course.elite) errorStack.push({ ...product, errorMessage: `${product.category} mismatch` }); // product elite or premium check
                if (product.category === ProductCategoryEnum.ELITE && !course.elite) errorStack.push({ ...product, errorMessage: `${product.category} mismatch` }); // product elite or premium check
                if (!Object.values(ProductCategoryEnum).includes(product.category)) errorStack.push({ ...product, errorMessage: `invalid category: ${product.category}` });
                newProducts.push(newProductDetails)
            }
            if (errorStack.length > 0) return next(generateAPIError(`Invalid products`, 400, errorStack));
            for (const product of newProducts) {
                let newProduct
                if (product.category === ProductCategoryEnum.PREMIUM) newProduct = await premiumApplicationModel.create(newProductDetails)
                else if (product.category === ProductCategoryEnum.ELITE) newProduct = await eliteApplicationModel.create(newProductDetails)
                newProductIds.push(newProduct._id)
            }
            break;
        default: return next(generateAPIError(`some internal server error`, 500));
    }
    const orderOptions = {
        currency: currency,
        amount: totalPrice * 100,
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
            created_at: 1721380929,
            currency: razorPay.currency,
            misc: razorPay
        },
        status: "pending",
    })
    await studentModel.findOneAndUpdate({ _id: req.user._id }, { $push: { orders: order._id, logs: { action: `order placed`, details: `orderId:${order._id}` } } })
    return res.status(200).json({ success: true, message: 'order placed', data: razorPay, AccessToken: req.AccessToken ? req.AccessToken : null });
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
            if (Product.category === ProductCategoryEnum.PREMIUM || Product.category === ProductCategoryEnum.ELITE) {
                counsellor = student.advisors.find(ele => ele.info.role === "counsellor" && ele.assignedCountries.includes(country))
                if (counsellor) Product.counsellor = counsellor._id
                else {
                    const Counsellors = await teamModel.aggregate([{ $match: { role: "counsellor", expertiseCountry: country } }, { $project: { _id: 1, students: 1, students: { $size: "$students" } } }, { $sort: { students: 1 } }, { $limit: 1 }]);
                    await teamModel.findByIdAndUpdate(Counsellors[0]._id, { $push: { students: { profile: req.user._id, stage: "Fresh Lead" } } });
                    student.advisors.push({ info: Counsellors[0]._id, assignedCountries: [country] })
                    Product.counsellor = Counsellors[0]._id
                }
                processCoordinator = student.advisors.find(ele => ele.info.role === "processCoordinator" && (assignedCountries.includes(country) || info.expertiseCountry.includes(country)))
                if (processCoordinator) {
                    if (!processCoordinator.assignedCountries.includes(country)) processCoordinator.assignedCountries.push(country)
                    Product.processCoordinator = processCoordinator.info._id
                    await teamModel.findByIdAndUpdate(processCoordinator.info._id, { $push: { applications: Product._id } })
                }
                else {
                    const processCoordinators = await teamModel.aggregate([{ $match: { role: "processCoordinator", expertiseCountry: country } }, { $project: { _id: 1, applications: 1, applicationsCount: { $cond: { if: { $isArray: "$applications" }, then: { $size: "$applications" }, else: 0 } } } }, { $sort: { applicationsCount: 1 } }, { $limit: 1 }]);
                    await teamModel.findByIdAndUpdate(processCoordinators[0]._id, { $push: { applications: Product._id } });
                    student.advisors.push({ info: processCoordinators[0]._id, assignedCountries: [country] })
                    await chatModel.create({ participants: [student._id, processCoordinators[0]._id] });
                    Product.processCoordinator = processCoordinators[0]._id
                }
            }
            product.order = order_id;
            await product.save();
        }
    }
    if (hasPackageId) await studentModel.findByIdAndUpdate(order.student, { $addToSet: { purchasedPackages: order.Package } });
    await student.save();
    res.redirect(`${process.env.SERVER_URL}paymentsuccess?reference=${order._id}`);
})
export const order = errorWrapper(async (req, res, next) => {
    await userModel.populate(req.user, { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" })
    const { products } = req.body
    let productIds = [], course, counsellor, processCoordinator, newProduct, country
    for (const product of products) {
        let newProductDetails = {
            user: req.user._id,
            course: product.data.course ? product.data.course : null,
            intake: product.data.intake ? product.data.intake : null,
            order: req.order._id
        }, intakeExists
        switch (product.category) {
            case "premium application":
                newProductDetails.log = [{ status: "Processing", stages: [{ name: "Waiting For Counsellor's Approval" }] }]
                newProductDetails.status = "Processing"
                newProductDetails.stage = "Waiting For Counsellor's Approval"
                newProduct = await premiumApplicationModel.create(newProductDetails)
                course = await courseModel.findById(newProductDetails.course, "location startDate university")
                if (course.university && !newProduct.university) newProduct.university = course.university  // adding university
                intakeExists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(newProduct.intake).getUTCMonth())
                if (!isNaN(intakeExists[0].deadlineMonth)) newProduct.deadline = new Date(new Date().getFullYear(), intakeExists[0].deadlineMonth, 1);  // adding deadline
                country = course.location.country
                counsellor = req.user.advisors.find(ele => ele.info.role === "counsellor" && ele.assignedCountries.includes(country))
                if (counsellor) newProduct.counsellor = counsellor._id
                else {
                    const Counsellors = await teamModel.aggregate([{ $match: { role: "counsellor", expertiseCountry: country } }, { $project: { _id: 1, students: 1, students: { $size: "$students" } } }, { $sort: { students: 1 } }, { $limit: 1 }]);
                    await teamModel.findByIdAndUpdate(Counsellors[0]._id, { $push: { students: { profile: req.user._id, stage: "Fresh Lead" } } });
                    await chatModel.create({ participants: [req.user._id, Counsellors[0]._id] });
                    req.user.advisors.push({ info: Counsellors[0]._id, assignedCountries: [country] })
                    newProduct.counsellor = Counsellors[0]._id
                } // adding counsellor
                processCoordinator = req.user.advisors.find(ele => ele.info.role === "processCoordinator" && (assignedCountries.includes(country) || info.expertiseCountry.includes(country)))
                if (processCoordinator) {
                    if (!processCoordinator.assignedCountries.includes(country)) processCoordinator.assignedCountries.push(country)
                    newProduct.processCoordinator = processCoordinator.info._id
                    await teamModel.findByIdAndUpdate(processCoordinator.info._id, { $push: { applications: newProduct._id } })
                }
                else {
                    const processCoordinators = await teamModel.aggregate([{ $match: { role: "processCoordinator", expertiseCountry: country } }, { $project: { _id: 1, applications: 1, applicationsCount: { $cond: { if: { $isArray: "$applications" }, then: { $size: "$applications" }, else: 0 } } } }, { $sort: { applicationsCount: 1 } }, { $limit: 1 }]);
                    await teamModel.findByIdAndUpdate(processCoordinators[0]._id, { $push: { applications: newProduct._id } });
                    req.user.advisors.push({ info: processCoordinators[0]._id, assignedCountries: [country] })
                    await chatModel.create({ participants: [req.user._id, processCoordinators[0]._id] });
                    newProduct.processCoordinator = processCoordinators[0]._id
                }// adding processCoordinator
                break;
            case ProductCategoryEnum.ELITE:
                newProductDetails.log = [{ status: "Processing", stages: [{ name: "Waiting For Counsellor's Approval" }] }]
                newProductDetails.status = "Processing"
                newProductDetails.stage = "Waiting For Counsellor's Approval"
                newProduct = await eliteApplicationModel.create(newProductDetails)
                course = await courseModel.findById(newProductDetails.course, "location startDate university")
                if (course.university && !newProduct.university) newProduct.university = course.university    // adding university 
                intakeExists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(newProduct.intake).getUTCMonth())
                if (!isNaN(intakeExists[0].deadlineMonth)) newProduct.deadline = new Date(new Date().getFullYear(), intakeExists[0].deadlineMonth, 1);  // adding deadline
                country = course.location.country
                counsellor = req.user.advisors.find(ele => ele.info.role === "counsellor" && ele.assignedCountries.includes(country))
                if (counsellor) newProduct.counsellor = counsellor._id
                else {
                    const Counsellors = await teamModel.aggregate([{ $match: { role: "counsellor", expertiseCountry: country } }, { $project: { _id: 1, students: 1, students: { $size: "$students" } } }, { $sort: { students: 1 } }, { $limit: 1 }]);
                    await teamModel.findByIdAndUpdate(Counsellors[0]._id, { $push: { students: { profile: req.user._id, stage: "Fresh Lead" } } });
                    await chatModel.create({ participants: [req.user._id, Counsellors[0]._id] });
                    req.user.advisors.push({ info: Counsellors[0]._id, assignedCountries: [country] })
                    newProduct.counsellor = Counsellors[0]._id
                }
                processCoordinator = req.user.advisors.find(ele => ele.info.role === "processCoordinator" && (assignedCountries.includes(country) || info.expertiseCountry.includes(country)))
                if (processCoordinator) {
                    if (!processCoordinator.assignedCountries.includes(country)) processCoordinator.assignedCountries.push(country)
                    newProduct.processCoordinator = processCoordinator.info._id
                    await teamModel.findByIdAndUpdate(processCoordinator.info._id, { $push: { applications: newProduct._id } })
                } // adding counsellor
                else {
                    const processCoordinators = await teamModel.aggregate([{ $match: { role: "processCoordinator", expertiseCountry: country } }, { $project: { _id: 1, applications: 1, applicationsCount: { $cond: { if: { $isArray: "$applications" }, then: { $size: "$applications" }, else: 0 } } } }, { $sort: { applicationsCount: 1 } }, { $limit: 1 }]);
                    await teamModel.findByIdAndUpdate(processCoordinators[0]._id, { $push: { applications: newProduct._id } });
                    req.user.advisors.push({ info: processCoordinators[0]._id, assignedCountries: [country] })
                    await chatModel.create({ participants: [req.user._id, processCoordinators[0]._id] });
                    newProduct.processCoordinator = processCoordinators[0]._id
                }// adding processCoordinator
                break;
            case ProductCategoryEnum.SOP:
                break;
            case ProductCategoryEnum.LOR:
                break;
            case ProductCategoryEnum.VISA:
                break;
            case ProductCategoryEnum.LOAN:
                break;
        }
        await newProduct.save()
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
    return res.status(200).json({ success: true, message: 'order', data: req.order, AccessToken: req.AccessToken ? req.AccessToken : null });
});
export const requestCancellation = errorWrapper(async (req, res, next) => {
    const updatedApplication = await productModel.findOneAndUpdate({ _id: req.params.applicationId }, { $set: { cancellationRequest: true } }, { new: true });
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
    const application = await productModel.findById(applicationId);
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
    const application = await productModel.findById(applicationId);
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
    const application = await productModel.findById(applicationId)
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
    const application = await productModel.findById(applicationId)
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