import courseModel from "../../models/Course.js";
import universityModel from "../../models/University.js";
import applicationModel from "../../models/application.js";
import { studentModel } from "../../models/Student.js";
import Document from "../../models/Uploads.js";
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import userModel from "../../models/User.js";
import meetingModel from "../../models/meetings.js";
import leadsModel from "../../models/leads.js";
export const profile = errorWrapper(async (req, res, next) => {
    const profile = {
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        displayPicSrc: req.user.displayPicSrc,
        email: req.user.email,
        linkedIn: req.user.linkedIn,
    }
    return res.status(200).json({ success: true, message: `all Details of Counsellor`, data: profile, AccessToken: req.AccessToken ? req.AccessToken : null })
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
    const profile = {
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        displayPicSrc: req.user.displayPicSrc,
        email: req.user.email,
        linkedIn: req.user.linkedIn,
    }
    return res.status(200).json({ success: true, message: `updated Details of Counsellor`, data: profile, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const downloadDoc = errorWrapper(async (req, res, next) => {
    const { documentId } = req.params
    const document = await Document.findById(documentId)
    if (!document) return next(generateAPIError(`invalid Document Id`, 401));
    // if (!document.viewers.includes(req.user._id) && document.user.toString() != req.user._id) return next(generateAPIError(`invalid access to document`, 401));
    return res.contentType(document.contentType).send(document.data);
})
export const singleStudentProfile = errorWrapper(async (req, res, next) => {
    const { id } = req.params;
    const student = await studentModel.findById(id);
    if (!student) return next(generateAPIError(`Invalid StudentId`, 400));
    await meetingModel.populate(student, [{ path: "activity.meetings", select: "data user member", },])
    await applicationModel.populate(student, { path: "activity.applications.processing activity.applications.accepted activity.applications.rejected activity.applications.completed activity.applications.cancelled", populate: { path: "university course docChecklist.doc", select: "name logoSrc location type establishedYear  contentType createdAt", }, })
    await courseModel.populate(student, [{ path: "recommendations.data.course activity.shortListed.course activity.applications.processing.course activity.applications.accepted.course activity.applications.rejected.course activity.applications.completed.course activity.applications.cancelled.course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails", },])
    await Document.populate(student, [{ path: "documents.personal.resume documents.personal.passportBD documents.personal.passportADD documents.academic.secondarySchool documents.academic.plus2 documents.academic.degree documents.academic.bachelors.transcripts documents.academic.bachelors.bonafide documents.academic.bachelors.CMM documents.academic.bachelors.PCM documents.academic.bachelors.OD documents.academic.masters.transcripts documents.academic.masters.bonafide documents.academic.masters.CMM documents.academic.masters.PCM documents.academic.masters.OD documents.test.general documents.test.languageProf documents.workExperiences workExperience.docId tests.docId", select: "name contentType createdAt", },])
    await universityModel.populate(student, [{ path: "recommendations.data.university activity.shortListed.university activity.applications.processing.university activity.applications.accepted.university activity.applications.rejected.university activity.applications.completed.university activity.applications.cancelled.university", select: "name logoSrc location type establishedYear ", },])
    await userModel.populate(student, [{ path: "advisors.info activity.meetings.user activity.meetings.member", select: "firstName lastName email displayPicSrc", },])
    return res.status(200).json({ success: true, message: `All details of Student`, data: student, AccessToken: req.AccessToken ? req.AccessToken : null });
});
export const singleApplications = errorWrapper(async (req, res, next) => {
    const { id } = req.params
    const application = await applicationModel.findById(id)
    if (!application) return next(generateAPIError(`invalid applicationId`, 400));
    await userModel.populate(application, [
        { path: "user", select: "firstName lastName email displayPicSrc" },
        { path: "counsellor", select: "firstName lastName email displayPicSrc" }
    ])
    await Document.populate(application, { path: "docChecklist.doc", select: "name contentType createdAt" })
    await universityModel.populate(application, { path: "university", select: "name logoSrc location type establishedYear " });
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails" });
    return res.status(200).json({ success: true, message: `single applications details`, data: application, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const listings = errorWrapper(async (req, res, next) => {
    const { page } = req.body, filter = {}, perPage = 20, skip = (page - 1) * perPage; // Number of items per page
    let totalPages = 0, totalDocs
    switch (req.params.name) {
        case "students":
            filter["advisors.info"] = req.user._id
            const listOfStudents = await studentModel.find(filter, "firstName lastName email displayPicSrc phone verification isPlanningToTakeAcademicTest isPlanningToTakeLanguageTest recommendations").skip(skip).limit(perPage);
            await courseModel.populate(listOfStudents, [{ path: "applications.course", select: "name unisName startDate" }])
            const studentsWithStages = req.user.students.reduce((acc, item) => {
                acc[item.profile.toString()] = item.stage;
                return acc;
            }, {});
            const students = listOfStudents.map(element => {
                return {
                    ...element._doc,
                    stage: studentsWithStages[element._id.toString()]
                };
            });
            totalDocs = await studentModel.countDocuments(filter)
            totalPages = Math.ceil(totalDocs / perPage);
            return res.status(200).json({ success: true, message: `students list`, data: { list: students, currentPage: page, totalPages: totalPages, totalItems: totalDocs }, AccessToken: req.AccessToken ? req.AccessToken : null })
        case "applications":


            // const { stage, status, course, university } = req.body.filterData;
            // if (stage) filter.stage = { $in: stage };
            // if (status) filter.status = { $in: status };
            // if (university) filter.university = { $in: university };
            // if (course) filter.course = { $in: course };
            // filter.processCoordinator = { $eq: req.user._id };
            // filter.$or = [{ "approval.counsellorApproval": true }, { "approval.userConsent": true }];
            // const applications = await applicationModel.find(filter, "university course intake user counsellor cancellationRequest status stage approval").populate("university", "name logoSrc").populate("user counsellor", "name email").populate("course", "name subDiscipline discipline").skip(skip).limit(perPage);
            // totalPages = Math.ceil(await applicationModel.countDocuments(filter) / perPage);
            // return res.status(200).json({ success: true, message: `list of applications`, data: { list: applications, currentPage: page, totalPages: totalPages }, AccessToken: req.AccessToken ? req.AccessToken : null })


            filter[req.user.role] = req.user._id
            const applications = await applicationModel.find(filter, "course intake deadline user approval stage status cancellationRequest createdAt updatedAt").skip(skip).limit(perPage)
            await userModel.populate(applications, { path: "user processCoordinator", select: "firstName lastName email displayPicSrc" })
            await courseModel.populate(applications, { path: "course", select: "name unisName startDate" })
            return res.status(200).json({ success: true, message: `applications list`, data: applications, AccessToken: req.AccessToken ? req.AccessToken : null })
        case "leads":
            filter[req.user.role] = req.user._id
            const leads = await leadsModel.find(filter, "name email phone queryDescription ifPhoneIsSameAsWhatsapp whatsappNumber student leadSource leadRating").skip(skip).limit(perPage)
            return res.status(200).json({ success: true, message: `leads list`, data: leads, AccessToken: req.AccessToken ? req.AccessToken : null })

        default: return next(generateAPIError(`invalid params`, 400));
    }
})
