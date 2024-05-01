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
        userModel.populate(student, [
            {
                path: "advisors.info",
                select: "firstName lastName email displayPicSrc",
            }
        ])
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