import courseModel from "../../models/Course.js";
import universityModel from "../../models/University.js";
import applicationModel from "../../models/application.js";
import { studentModel } from "../../models/Student.js";
import Document from "../../models/Uploads.js";
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import { teamModel } from "../../models/Team.js";
import { oauth2Client } from "../../utils/oAuthClient.js";
import { google } from "googleapis";
import 'dotenv/config';
import userModel from "../../models/User.js";
export const generatingAuthUrl = errorWrapper(async (req, res, next) => {
    const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/userinfo.email"] });
    res.status(200).json({ success: true, message: `auth url`, data: url });
})
export const googleAuthentication = errorWrapper(async (req, res, next) => {
    const { tokens } = await oauth2Client.getToken(req.query.code)
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({
        version: 'v2',
        auth: oauth2Client,
    });
    const { data } = await oauth2.userinfo.get();
    const user = await teamModel.findOne({ email: data.email })
    if (!user) return next(generateAPIError(`user email mismatch`, 400));
    user.googleTokens = {
        access_token: tokens.access_token,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date,
    }
    if (tokens.refresh_token) user.googleTokens.refresh_token = tokens.refresh_token
    await user.save()
    oauth2Client.setCredentials(user.googleTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const filter = {
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 2499,    // cannot be larger than 2500 by default 250
        singleEvents: true,
        orderBy: 'updated',
    }
    const list = await calendar.events.list(filter);
    return res.status(200).json({ success: true, message: `counsellor calendar`, data: { numberOfItems: list.data.items.length, items: list.data.items } })
})
export const calendarEvents = errorWrapper(async (req, res, next) => {
    if (!req.user.googleTokens.access_token) return next(generateAPIError(`invalid google tokens`, 400));
    oauth2Client.setCredentials(req.user.googleTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const filter = {
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 2499,    // cannot be larger than 2500 by default 250
        singleEvents: true,
        orderBy: 'updated',
    }
    const { data } = await calendar.events.list(filter);
    return res.status(200).json({ success: true, message: `counsellor calendar`, data: { numberOfItems: data.items.length, items: data.items }, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const profile = errorWrapper(async (req, res, next) => {
    await userModel.populate(req.user, [{ path: "students.profile", select: "firstName lastName email displayPicSrc" }])
    const profile = {
        _id: req.user._id,
        firstName:req.user.firstName,
        lastName:req.user.lastName,
        displayPicSrc: req.user.displayPicSrc,
        email: req.user.email,
        linkedIn: req.user.linkedIn,
        appointmentLink: req.user.appointmentLink,
    }
    const { students } = req.user
    return res.status(200).json({ success: true, message: `all Details of Counsellor`, data: { profile, students }, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const applications = errorWrapper(async (req, res, next) => {
    const applications = await applicationModel.find({ counsellor: req.user._id }, "university course intake user processCoordinator cancellationRequest status approval log")
        .populate({ path: "user", select: "firstName lastName email displayPicSrc" })
        .populate({ path: "processCoordinator", select: "firstName lastName email displayPicSrc" })
        .populate({ path: "university", select: "name logoSrc location type establishedYear " })
        .populate({ path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails tuitionFee" })
        .lean();

    return res.status(200).json({ success: true, message: `Applications for Counsellor`, data: applications, AccessToken: req.AccessToken ? req.AccessToken : null });
});
export const approval = errorWrapper(async (req, res, next) => {
    const { applicationId, action, justification } = req.body
    const application = await applicationModel.findById(applicationId);
    if (application.counsellor.toString() != req.user._id) return next(generateAPIError(`invalid access`, 400));
    const historyLog = application.log.find(ele => ele.status == "Processing")
    switch (action) {
        case "approve":
            application.approval.counsellorApproval = true
            application.approval.justification = justification
            application.stage = "Counsellor Approved"
            historyLog.stages.push({ name: "Counsellor Approved", });
            break;
        case "disapprove":
            application.approval.counsellorApproval = false
            application.approval.justification = justification
            application.stage = "Counsellor Disapproved"
            historyLog.stages.push({ name: "Counsellor Disapproved", });
            // notify user
            break;
        default: return next(generateAPIError(`invalid action`, 400));
    }
    await application.save()
    req.user.logs.push({
        action: `application: ${action}`,
        details: `applicationId:${applicationId}&action:${action}`
    })
    await req.user.save()
    await teamModel.updateOne({ _id: req.user._id }, { $pull: { newApplications: applicationId } });
    await universityModel.populate(application, { path: "university", select: "name logoSrc location type establishedYear " });
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails" });
    return res.status(200).json({ success: true, message: `${action} successful`, data: application, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const switchStage = errorWrapper(async (req, res, next) => {
    const { studentId, stage, note } = req.body
    if (!await studentModel.findById(studentId)) return next(generateAPIError(`invalid StudentId`, 400));
    const student = req.user.students.find(ele => ele.profile.toString() == studentId)
    if (!student) return next(generateAPIError(`invalid access`, 400));
    student.stage = stage
    req.user.logs.push({
        action: "student stage shifted",
        details: `studentId:${studentId}&stage:${stage}&note:${note}`
    })
    await req.user.save()
    await studentModel.populate(student, { path: "profile", select: "firstName lastName email displayPicSrc" },)
    return res.status(200).json({ success: true, message: `activity success`, data: student, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const singleStudentProfile = errorWrapper(async (req, res, next) => {
    const { id } = req.params;
    const student = await studentModel.findById(id);
    if (!student) return next(generateAPIError(`Invalid StudentId`, 400));
    await Promise.all([
        applicationModel.populate(student, {
            path: "activity.applications.processing activity.applications.accepted activity.applications.rejected activity.applications.completed activity.applications.cancelled",
            populate: {
                path: "university course docChecklist.doc",
                select: "name logoSrc location type establishedYear  contentType createdAt",
            },
        }),
        courseModel.populate(student, [
            {
                path: "recommendation.course activity.shortListed.course activity.applications.processing.course activity.applications.accepted.course activity.applications.rejected.course activity.applications.completed.course activity.applications.cancelled.course",
                select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails",
            },
        ]),
        Document.populate(student, [
            {
                path: "documents.personal.resume documents.personal.passportBD documents.personal.passportADD documents.academic.secondarySchool documents.academic.plus2 documents.academic.degree documents.academic.bachelors.transcripts documents.academic.bachelors.bonafide documents.academic.bachelors.CMM documents.academic.bachelors.PCM documents.academic.bachelors.OD documents.academic.masters.transcripts documents.academic.masters.bonafide documents.academic.masters.CMM documents.academic.masters.PCM documents.academic.masters.OD documents.test.general documents.test.languageProf documents.workExperiences",
                select: "name contentType createdAt",
            },
        ]),
        universityModel.populate(student, [
            {
                path: "recommendation.university activity.shortListed.university activity.applications.processing.university activity.applications.accepted.university activity.applications.rejected.university activity.applications.completed.university activity.applications.cancelled.university",
                select: "name logoSrc location type establishedYear ",
            },
        ]),
    ]);
    return res.status(200).json({ success: true, message: `All details of Student`, data: student, AccessToken: req.AccessToken ? req.AccessToken : null });
});
export const recommend = errorWrapper(async (req, res, next) => {
    const { studentId, universityId, courseId, possibilityOfAdmit } = req.body
    const university = await universityModel.findById(universityId)
    if (!university) return next(generateAPIError(`Invalid UniversityId`, 400));
    const course = await courseModel.findById(courseId)
    if (!course) return next(generateAPIError(`Invalid courseId`, 400));
    const student = await studentModel.findById(studentId)
    if (!student) return next(generateAPIError(`invalid StudentId`, 400));
    if (student.recommendation.find(ele => ele.course == courseId)) return next(generateAPIError(`course Already recommended`, 400));
    student.recommendation.push({ university: universityId, course: courseId, possibilityOfAdmit: possibilityOfAdmit, counsellorRecommended: true });
    student.recommendation = student.recommendation.sort((a, b) => a.possibilityOfAdmit - b.possibilityOfAdmit)
    await student.save();
    req.user.logs.push({
        action: "course recommended to student",
        details: `studentId:${studentId}&courseId:${courseId}`
    })
    await req.user.save()
    const newRecommend = student.recommendation.find(ele => ele.course == courseId)
    await universityModel.populate(newRecommend, { path: "university", select: "name logoSrc location type establishedYear " },)
    await courseModel.populate(newRecommend, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails", },)
    return res.status(200).json({ success: true, message: "Recommendations Generated", data: newRecommend, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const deleteRecommend = errorWrapper(async (req, res, next) => {
    const { studentId, recommendId } = req.body
    const student = await studentModel.findById(studentId)
    if (!student) return next(generateAPIError(`invalid StudentId`, 400));
    const recommendationToBeDeleted = student.recommendation.find(ele => ele._id.toString() == recommendId)
    if (!recommendationToBeDeleted) return next(generateAPIError(`invalid recommendId`, 400));
    await studentModel.findByIdAndUpdate(studentId, { $pull: { recommendation: { _id: recommendId } } })
    req.user.logs.push({
        action: "course recommended to student",
        details: `UniversityId:${recommendationToBeDeleted.university}&CourseId:${recommendationToBeDeleted.course}&studentId=${studentId}`
    })
    await req.user.save()
    return res.status(200).json({ success: true, message: "recommendations deleted", data: null, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const profileEdit = errorWrapper(async (req, res, next) => {
    const { linkedIn } = req.body
    if (linkedIn) {
        req.user.linkedIn = linkedIn
        req.user.logs.push({
            action: "profile edited",
            details: `linkedIn:${linkedIn}`
        })
    }
    await req.user.save()
    return res.status(200).json({ success: true, message: `updated Details of Counsellor`, data: req.user, AccessToken: req.AccessToken ? req.AccessToken : null })
})

