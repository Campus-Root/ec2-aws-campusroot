import universityModel from "../../../models/University.js";
import courseModel from "../../../models/Course.js";
import { errorWrapper } from "../../../middleware/errorWrapper.js";
import { teamModel } from "../../../models/Team.js";
import { productModel } from "../../../models/Product.js";

export const approval = errorWrapper(async (req, res, next, session) => {
    const { applicationId, action, justification } = req.body
    const application = await productModel.findById(applicationId);
    if (!application.advisors.includes(req.user._id)) return { statusCode: 400, data: null, message: `invalid access` };
    if (!justification) return { statusCode: 400, data: null, message: `justification necessary` };
    const historyLog = application.log.find(ele => ele.status == "Processing")
    switch (action) {
        case "approve":
            application.info.approval.counsellorApproval = true
            application.info.approval.justification = justification
            application.stage = "Counsellor Approved"
            historyLog.stages.push({ name: "Counsellor Approved", });
            break;
        case "disapprove":
            application.info.approval.counsellorApproval = false
            application.info.approval.justification = justification
            application.stage = "Counsellor Disapproved"
            historyLog.stages.push({ name: "Counsellor Disapproved", });
            break;
        default: return {
            statusCode: 400, data: null, message: `invalid action`
        };
    }
    await application.save()
    req.user.logs.push({
        action: `application: ${action}`,
        details: `applicationId:${applicationId}&action:${action}`
    })
    await req.user.save()
    await teamModel.updateOne({ _id: req.user._id }, { $pull: { newApplications: applicationId } });
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails university elite featured" });
    await universityModel.populate(application, { path: "course.university", select: "name logoSrc location type establishedYear" });
    return ({ statusCode: 200, message: `${action} successful`, data: application })
})
