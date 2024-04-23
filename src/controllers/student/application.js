import courseModel from "../../models/Course.js";
import chatModel from "../../models/Chat.js"
import universityModel from "../../models/University.js";
import fs from "fs";
import Document from "../../models/Uploads.js";
import { teamModel } from "../../models/Team.js";
import applicationModel from "../../models/application.js";
import { studentModel } from "../../models/Student.js";
import userModel from "../../models/User.js";
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import 'dotenv/config';
import exchangeModel from "../../models/ExchangeRates.js";
import { costConversion } from "../../utils/currencyConversion.js";
import { currencySymbols } from "../../utils/enum.js";
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
export const apply = errorWrapper(async (req, res, next) => {
    let { universityId, courseId, intake } = req.body
    // if (!req.user.verification[0].status) return next(generateAPIError(`do verify your email to process the application`, 400));
    // if (!req.user.verification[1].status) return next(generateAPIError(`do verify your phone number to process the application`, 400));
    if (! await universityModel.findById(universityId)) return next(generateAPIError(`invalid university Id`, 400));
    const course = await courseModel.findById(courseId, "startDate")
    if (!course) return next(generateAPIError(`invalid course Id`, 400));
    if (!intake || new Date(intake) <= new Date()) return next(generateAPIError(`invalid intake`, 400));
    const Exists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(intake).getUTCMonth())
    if (Exists.length <= 0) return next(generateAPIError(`intake doesn't exist`, 400));
    if (!req.user.advisors.find(ele => ele.role === "processCoordinator")) {
        const processCoordinators = await teamModel.aggregate([{ $match: { role: "processCoordinator" } },
        {
            $project: {
                _id: 1, applications: 1,
                applicationsCount: {
                    $cond: {
                        if: { $isArray: "$applications" },
                        then: { $size: "$applications" },
                        else: 0
                    }
                }
            }
        }, { $sort: { applicationsCount: 1 } }, { $limit: 1 }]);
        req.user.advisors.push({
            info: processCoordinators[0]._id,
            role: "processCoordinator"
        })
        await teamModel.findOneAndUpdate({ _id: processCoordinators[0]._id }, { $push: { students: { profile: req.user._id } }, });
        await chatModel.create({ participants: [req.user._id, processCoordinators[0]._id] });
        await Document.updateMany({ user: req.user._id, type: "General" }, { $push: { viewers: processCoordinators[0]._id } })
    }
    const alreadyExists = await applicationModel.find({ user: req.user._id, intake: intake, course: courseId })
    if (alreadyExists.length > 0) return next(generateAPIError(`Already applied for this intake`, 400));
    let counsellor = req.user.advisors.filter(ele=>ele.role=="counsellor")
    let processCoordinator = req.user.advisors.filter(ele=>ele.role=="processCoordinator")
    const newApplication = await applicationModel.create({
        counsellor: counsellor.info,
        university: universityId,
        course: courseId,
        intake: intake,
        user: req.user._id,
        processCoordinator: processCoordinator.info,
        log: [{ status: "Processing", stages: [{ name: "Waiting For Counsellor's Approval" }] }],
        status: "Processing",
        stage: "Waiting For Counsellor's Approval"
    });
    await teamModel.findOneAndUpdate({ _id: processCoordinator.info }, { $push: { applications: newApplication._id } })
    req.user.activity.applications.processing.push(newApplication._id)
    req.user.logs.push({
        action: `application process Initiated`,
        details: `applicationId:${newApplication._id}`
    })
    await req.user.save()
    await applicationModel.populate(req.user, { path: "activity.applications.processing" })
    await userModel.populate(req.user, [{ path: "activity.applications.processing.user", select: "firstName lastName email displayPicSrc" }, { path: "activity.applications.processing.processCoordinator", select: "firstName lastName email displayPicSrc" }])
    await universityModel.populate(req.user, { path: "activity.applications.processing.university", select: "name logoSrc location type establishedYear " })
    await courseModel.populate(req.user, { path: "activity.applications.processing.course", select: "name tuitionFee currency studyMode discipline subDiscipline schoolName studyLevel duration", })
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
        req.user.activity.applications.processing.forEach(applyCurrencyConversion);
    }
    res.status(200).json({ success: true, message: 'New Application Registered', data: req.user.activity.applications.processing.slice(-1), AccessToken: req.AccessToken ? req.AccessToken : null });
})
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
    res.status(200).json({ success: true, message: 'New Application Registered', data: application, AccessToken: req.AccessToken ? req.AccessToken : null });
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