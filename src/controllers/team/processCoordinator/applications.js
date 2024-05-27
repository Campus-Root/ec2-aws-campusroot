import courseModel from "../../../models/Course.js";
import universityModel from "../../../models/University.js";
import Document from "../../../models/Uploads.js";
import applicationModel from "../../../models/application.js";
import { studentModel } from "../../../models/Student.js";
import fs from "fs"
import { generateAPIError } from "../../../errors/apiError.js";
import { errorWrapper } from "../../../middleware/errorWrapper.js";
import { applicationStagesEnum } from "../../../utils/enum.js";
import userModel from "../../../models/User.js";
export const switchStage = errorWrapper(async (req, res, next) => {
    const { applicationId, status, stage, note } = req.body
    const application = await applicationModel.findById(applicationId)
    if (!application) return next(generateAPIError(`invalid applicationId`, 400));
    if (application.processCoordinator.toString() != req.user._id) return next(generateAPIError(`invalid access to this application`, 400));
    if (application.status != status) return next(generateAPIError(`invalid status`, 400));
    if (!Object.values(applicationStagesEnum).includes(stage)) return next(generateAPIError(`invalid stage`, 400));
    const logs = application.log.find(ele => ele.status == status)
    logs.stages.push({ name: stage, message: note })
    application.stage = stage
    await application.save()
    req.user.logs.push({
        action: `switched application stage to ${stage}`,
        details: `applicationId:${applicationId}&status:${status}&stage:${stage}`
    })
    await req.user.save()
    await studentModel.populate(application, { path: "user", select: "firstName lastName email displayPicSrc" })
    await universityModel.populate(application, { path: "university", select: "name logoSrc location type establishedYear " });
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails" });
    return res.status(200).json({ success: true, message: `stage shift success`, data: application, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const addToChecklist = errorWrapper(async (req, res, next) => {
    const { applicationId, name, isChecked, desc } = req.body
    if (!name) return next(generateAPIError(`name of item is required`, 400));
    const application = await applicationModel.findById(applicationId)
    if (!application) return next(generateAPIError(`invalid applicationId`, 400));
    const checklistItem = { name: name }
    if (isChecked) checklistItem.isChecked = isChecked
    if (desc) checklistItem.desc = desc
    if (req.file) {
        const { originalname, path, mimetype } = req.file;
        const data = fs.readFileSync(path);
        const upload = { name: originalname, data: data, contentType: mimetype, user: req.user._id, viewers: [req.user._id, application.processCoordinator], type: "Application" }
        if (application.counsellor) upload.viewers.push(application.counsellor)
        const newDoc = await Document.create(upload);
        checklistItem.doc = newDoc._id
        fs.unlinkSync(path);
    }
    else checklistItem.doc = null
    application.docChecklist.push(checklistItem)
    await application.save()
    req.user.logs.push({
        action: `added item to checklist`,
        details: `applicationId:${applicationId}`
    })
    await req.user.save()
    await Document.populate(application, { path: "docChecklist.doc", select: "name contentType createdAt", })
    await userModel.populate(application, [
        { path: "user", select: "firstName lastName email displayPicSrc" },
        { path: "counsellor", select: "firstName lastName email displayPicSrc" }
    ])
    await universityModel.populate(application, { path: "university", select: "name logoSrc location type establishedYear " });
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails" });
    return res.status(200).json({ success: true, message: `item added to checklist`, data: application, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const editItemInChecklist = errorWrapper(async (req, res, next) => {
    const { applicationId, checklistItemId, action, name, isChecked, desc, type } = req.body
    let application = await applicationModel.findById(applicationId);
    if (!application) return next(generateAPIError(`invalid application ID`, 400));
    const checklistItem = application.docChecklist.find(ele => ele._id.toString() == checklistItemId)
    if (!checklistItem) return next(generateAPIError(`invalid checklist ID`, 400));
    switch (action) {
        case "edit":
            if (name) checklistItem.name = name
            if (isChecked === true) checklistItem.isChecked = true
            if (isChecked === false) checklistItem.isChecked = false
            if (desc) checklistItem.desc = desc
            if (type) checklistItem.type = type
            await application.save()
            break;
        case "delete":
            if(checklistItem.doc) await Document.findByIdAndDelete(checklistItem.doc)
            await application.updateOne({ $pull: { docChecklist: { _id: checklistItemId } } });
            break;
        default: return next(generateAPIError(`bad action, choose one among : delete,edit`, 400));
    }
    application = await applicationModel.findById(applicationId);
    await Document.populate(application, { path: "docChecklist.doc", select: "name contentType createdAt", })
    await userModel.populate(application, [
        { path: "user", select: "firstName lastName email displayPicSrc" },
        { path: "counsellor", select: "firstName lastName email displayPicSrc" }
    ])
    req.user.logs.push({
        action: `checklist updated`,
        details: `applicationId:${applicationId}`
    })
    await req.user.save()
    await universityModel.populate(application, { path: "university", select: "name logoSrc location type establishedYear " });
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails" });
    return res.status(200).json({ success: true, message: `checklist updated successfully`, data: application, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const cancellation = errorWrapper(async (req, res, next) => {
    const { applicationId, cancel } = req.body
    const application = await applicationModel.findById(applicationId)
    if (!application) return next(generateAPIError(`invalid application ID`, 400));
    if (!application.cancellationRequest) next(generateAPIError(`let user request for cancellation`, 400));
    if (cancel == true) {
        application.status = "Cancelled"
        application.log.push({ status: "Cancelled" })
        await studentModel.updateOne({ _id: application.user }, { $pull: { "activity.applications.processing": applicationId }, $push: { "activity.applications.cancelled": applicationId } })
    } else {
        application.cancellationRequest = false
    }
    await application.save()
    req.user.logs.push({
        action: `cancellation request attended`,
        details: `applicationId:${applicationId}`
    })
    await req.user.save()
    await studentModel.populate(application, { path: "user", select: "firstName lastName email displayPicSrc" })
    await universityModel.populate(application, { path: "university", select: "name logoSrc location type establishedYear " });
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails" });
    return res.status(200).json({ success: true, message: "cancellation request attended", data: application, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const result = errorWrapper(async (req, res, next) => {
    const { applicationId, result, note } = req.body
    const application = await applicationModel.findById(applicationId)
    if (!application) return next(generateAPIError(`invalid application ID`, 400));
    if (application.status == result) return next(generateAPIError(`already status updated as ${result}`, 400));
    if (application.status != "Processing") return next(generateAPIError(`application is not in processing state`, 400));
    const record = {}
    switch (result) {
        case "Accepted":
            application.status = result
            application.stage = "Result Received"
            record.status = result
            record.stages = [{ name: "Result Received", message: note }]
            await universityModel.updateOne({ _id: application.university }, { $push: { profilesAdmits: application.user } })
            await studentModel.updateOne({ _id: application.user }, { $pull: { "activity.applications.processing": applicationId }, $push: { "activity.applications.accepted": applicationId } })
            break;
        case "Rejected":
            application.status = result
            application.stage = "Result Received"
            record.status = result
            await studentModel.updateOne({ _id: application.user }, { $pull: { "activity.applications.processing": applicationId }, $push: { "activity.applications.rejected": applicationId } })
            break;
        default:
            return next(generateAPIError("invalid result", 400));
    }
    application.log.push(record)
    await application.save()
    req.user.logs.push({
        action: `application result updated`,
        details: `applicationId:${applicationId}`
    })
    await req.user.save()
    await studentModel.populate(application, { path: "user", select: "firstName lastName email displayPicSrc" })
    await universityModel.populate(application, { path: "university", select: "name logoSrc location type establishedYear " });
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails" });
    return res.status(200).json({ success: true, message: `shift successful`, data: application, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const revertResult = errorWrapper(async (req, res, next) => {
    const { applicationId } = req.body
    const application = await applicationModel.findById(applicationId)
    if (!application) return next(generateAPIError(`invalid application ID`, 400));
    switch (application.status) {
        case "Accepted":
            application.log = application.log.filter(ele => ele.status != "Accepted")
            await universityModel.updateOne({ _id: application.university }, { $pull: { profilesAdmits: application.user } })
            await studentModel.updateOne({ _id: application.user }, { $push: { "activity.applications.processing": applicationId }, $pull: { "activity.applications.accepted": applicationId } })
            break;
        case "Rejected":
            application.log = application.log.filter(ele => ele.status != "Rejected")
            await studentModel.updateOne({ _id: application.user }, { $push: { "activity.applications.processing": applicationId }, $pull: { "activity.applications.rejected": applicationId } })
            break;
    }
    application.status = "Processing"
    application.stage = "Waiting for Decision"
    await application.save()
    req.user.logs.push({
        action: `application result reverted`,
        details: `applicationId:${applicationId}`
    })
    await req.user.save()
    await studentModel.populate(application, { path: "user", select: "firstName lastName email displayPicSrc" })
    await universityModel.populate(application, { path: "university", select: "name logoSrc location type establishedYear " });
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails" });
    return res.status(200).json({ success: true, message: `revert done`, data: application, AccessToken: req.AccessToken ? req.AccessToken : null })
})