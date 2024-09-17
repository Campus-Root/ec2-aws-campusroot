import courseModel from "../../../models/Course.js";
import universityModel from "../../../models/University.js";
import Document from "../../../models/Uploads.js";
import { studentModel } from "../../../models/Student.js";
import fs from "fs"
import { generateAPIError } from "../../../errors/apiError.js";
import { errorWrapper } from "../../../middleware/errorWrapper.js";
import { applicationStagesEnum } from "../../../utils/enum.js";
import userModel from "../../../models/User.js";
import { productModel } from "../../../models/Product.js";
import { deleteFileInWorkDrive } from "../../../utils/CRMintegrations.js";
export const switchStage = errorWrapper(async (req, res, next, session) => {
    const { applicationId, status, stage, note } = req.body
    const application = await productModel.findById(applicationId)
    if (!application) return { statusCode: 400, data: null, message: `invalid applicationId` };
    if (application.processCoordinator.toString() != req.user._id) return {
        statusCode: 400, data: null, message: `invalid access to this application`
    };
    if (application.status != status) return {
        statusCode: 400, data: null, message: `invalid status`
    };
    if (!Object.values(applicationStagesEnum).includes(stage)) return {
        statusCode: 400, data: null, message: `invalid stage`
    };
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
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails university elite" });
    await universityModel.populate(application, { path: "course.university", select: "name logoSrc location type establishedYear " });
    return ({ statusCode: 200, message: `stage shift success`, data: application })
})
export const addToChecklist = errorWrapper(async (req, res, next, session) => {
    const { applicationId, name, isChecked, desc } = req.body
    if (!name) return { statusCode: 400, data: null, message: `name of item is required` };
    const application = await productModel.findById(applicationId)
    if (!application) return {
        statusCode: 400, data: null, message: `invalid applicationId`
    };
    const checklistItem = { name: name }
    if (isChecked) checklistItem.isChecked = isChecked
    if (desc) checklistItem.desc = desc


    if (req.file) {
        const uploadedFileResponse = await uploadFileToWorkDrive({ originalname: req.file.originalname, path: req.file.path, mimetype: req.file.mimetype, fileIdentifier: fileIdentifier || "", folder_ID: req.user.docData.folder })
        if (!uploadedFileResponse.success) return { statusCode: 500, message: uploadedFileResponse.message, data: uploadedFileResponse.data }
        if (uploadedFileResponse.data.new) {
            const { FileName, resource_id, mimetype, originalname, preview_url } = uploadedFileResponse.data
            const docDetails = { data: { FileName, resource_id, mimetype, originalname, fileIdentifier, preview_url }, user: req.user._id, type: "Application", viewers: [] };
            const newDoc = await Document.create(docDetails);
            checklistItem.doc = newDoc._id
        }
    }
    else checklistItem.doc = null
    application.docChecklist.push(checklistItem)
    await application.save()
    req.user.logs.push({
        action: `added item to checklist`,
        details: `applicationId:${applicationId}`
    })
    await req.user.save()
    await Document.populate(application, { path: "docChecklist.doc", select: "data", })
    await userModel.populate(application, [
        { path: "user", select: "firstName lastName email displayPicSrc" },
        { path: "counsellor", select: "firstName lastName email displayPicSrc" }
    ])
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails university elite" });
    await universityModel.populate(application, { path: "course.university", select: "name logoSrc location type establishedYear " });
    return { statusCode: 200, message: `item added to checklist`, data: application }
})
export const editItemInChecklist = errorWrapper(async (req, res, next, session) => {
    const { applicationId, checklistItemId, action, name, isChecked, desc, type } = req.body
    let application = await productModel.findById(applicationId);
    if (!application) return { statusCode: 400, data: null, message: `invalid application ID` };
    const checklistItem = application.docChecklist.find(ele => ele._id.toString() == checklistItemId)
    if (!checklistItem) return {
        statusCode: 400, data: null, message: `invalid checklist ID`
    };
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
            if (checklistItem.doc) {
                const doc = await Document.findById(checklistItem.doc)
                await deleteFileInWorkDrive(doc.data.resource_id)
                await Document.findByIdAndDelete(checklistItem.doc)
            }
            await application.updateOne({ $pull: { docChecklist: { _id: checklistItemId } } });
            break;
        default: return {
            statusCode: 400, data: null, message: `bad action, choose one among : delete,edit`
        };
    }
    application = await productModel.findById(applicationId);
    await Document.populate(application, { path: "docChecklist.doc", select: "data", })
    await userModel.populate(application, [
        { path: "user", select: "firstName lastName email displayPicSrc" },
        { path: "counsellor", select: "firstName lastName email displayPicSrc" }
    ])
    req.user.logs.push({
        action: `checklist updated`,
        details: `applicationId:${applicationId}`
    })
    await req.user.save()
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails university elite" });
    await universityModel.populate(application, { path: "course.university", select: "name logoSrc location type establishedYear " });
    return ({ statusCode: 200, message: `checklist updated successfully`, data: application })
})
export const cancellation = errorWrapper(async (req, res, next, session) => {
    const { applicationId, cancel } = req.body
    const application = await productModel.findById(applicationId)
    if (!application) return { statusCode: 400, data: null, message: `invalid application ID` };
    if (!application.cancellationRequest) return {
        statusCode: 400, data: null, message: `let user request for cancellation`
    };
    if (cancel == true) {
        application.status = "Cancelled"
        application.log.push({ status: "Cancelled" })
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
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails university elite" });
    await universityModel.populate(application, { path: "course.university", select: "name logoSrc location type establishedYear " });
    return ({ statusCode: 200, message: "cancellation request attended", data: application })
})
export const result = errorWrapper(async (req, res, next, session) => {
    const { applicationId, result, note } = req.body
    const application = await productModel.findById(applicationId)
    if (!application) return { statusCode: 400, data: null, message: `invalid application ID` };
    if (application.status == result) return {
        statusCode: 400, data: null, message: `already status updated as ${result}`
    };
    if (application.status != "Processing") return {
        statusCode: 400, data: null, message: `application is not in processing state`
    };
    const record = {}
    switch (result) {
        case "Accepted":
            application.status = result
            application.stage = "Result Received"
            record.status = result
            record.stages = [{ name: "Result Received", message: note }]
            await universityModel.updateOne({ _id: application.university }, { $push: { profilesAdmits: application.user } })
            break;
        case "Rejected":
            application.status = result
            application.stage = "Result Received"
            record.status = result
            break;
        default:
            return {
                statusCode: 400, data: null, message: "invalid result"
            };
    }
    application.log.push(record)
    await application.save()
    req.user.logs.push({
        action: `application result updated`,
        details: `applicationId:${applicationId}`
    })
    await req.user.save()
    await studentModel.populate(application, { path: "user", select: "firstName lastName email displayPicSrc" })
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails university elite" });
    await universityModel.populate(application, { path: "course.university", select: "name logoSrc location type establishedYear " });
    return ({ statusCode: 200, message: `shift successful`, data: application })
})
export const revertResult = errorWrapper(async (req, res, next, session) => {
    const { applicationId } = req.body
    const application = await productModel.findById(applicationId)
    if (!application) return { statusCode: 400, data: null, message: `invalid application ID` };
    switch (application.status) {
        case "Accepted":
            application.log = application.log.filter(ele => ele.status != "Accepted")
            await universityModel.updateOne({ _id: application.university }, { $pull: { profilesAdmits: application.user } })
            break;
        case "Rejected":
            application.log = application.log.filter(ele => ele.status != "Rejected")
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
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails university elite" });
    await universityModel.populate(application, { path: "course.university", select: "name logoSrc location type establishedYear " });
    return ({ statusCode: 200, message: `revert done`, data: application })
})