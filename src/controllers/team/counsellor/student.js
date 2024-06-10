import courseModel from "../../../models/Course.js";
import universityModel from "../../../models/University.js";
import { studentModel } from "../../../models/Student.js";
import { generateAPIError } from "../../../errors/apiError.js";
import { errorWrapper } from "../../../middleware/errorWrapper.js";
import { possibilityOfAdmitEnum, studentCounsellingStagesEnum } from "../../../utils/enum.js";

export const switchStage = errorWrapper(async (req, res, next) => {
    const { studentId, stage, nextActionDate, note } = req.body
    if (!await studentModel.findById(studentId)) return next(generateAPIError(`invalid StudentId`, 400));
    const student = req.user.students.find(ele => ele.profile.toString() == studentId)
    if (!student) return next(generateAPIError(`invalid access`, 400));
    if (!Object.values(studentCounsellingStagesEnum).includes(stage)) return next(generateAPIError(`invalid stage`, 400));
    console.log(nextActionDate, new Date(nextActionDate));
    if (!new Date(nextActionDate) || new Date(nextActionDate) >= new Date()) return next(generateAPIError(`invalid nextActionDate`, 400));
    student.nextActionDate = nextActionDate
    student.stage = stage
    req.user.logs.push({
        action: "student stage shifted",
        details: `studentId:${studentId}&stage:${stage}&note:${note}&nextActionDate:${nextActionDate}`
    })
    await req.user.save()
    await studentModel.populate(student, { path: "profile", select: "firstName lastName email displayPicSrc" },)
    return res.status(200).json({ success: true, message: `activity success`, data: student, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const recommend = errorWrapper(async (req, res, next) => {
    const { studentId, universityId, courseId, possibilityOfAdmit } = req.body
    const university = await universityModel.findById(universityId)
    if (!university) return next(generateAPIError(`Invalid UniversityId`, 400));
    const course = await courseModel.findById(courseId)
    if (!course) return next(generateAPIError(`Invalid courseId`, 400));
    const student = await studentModel.findById(studentId)
    if (!student) return next(generateAPIError(`invalid StudentId`, 400));
    if (!Object.values(possibilityOfAdmitEnum).includes(possibilityOfAdmit)) return next(generateAPIError(`invalid possibilityOfAdmit`, 400));
    if (student.recommendations.data.find(ele => ele.course == courseId)) return next(generateAPIError(`course Already recommended`, 400));
    student.recommendations.data.push({ university: universityId, course: courseId, possibilityOfAdmit: possibilityOfAdmit, counsellorRecommended: true });
    student.recommendations.data = student.recommendations.data.sort((a, b) => a.possibilityOfAdmit - b.possibilityOfAdmit)
    await student.save();
    req.user.logs.push({
        action: "course recommended to student",
        details: `studentId:${studentId}&courseId:${courseId}`
    })
    await req.user.save()
    const newRecommend = student.recommendations.data.find(ele => ele.course == courseId)
    await universityModel.populate(newRecommend, { path: "university", select: "name logoSrc location type establishedYear " },)
    await courseModel.populate(newRecommend, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails", },)
    return res.status(200).json({ success: true, message: "Recommendations Generated", data: newRecommend, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const deleteRecommend = errorWrapper(async (req, res, next) => {
    const { studentId, recommendId } = req.body
    const student = await studentModel.findById(studentId)
    if (!student) return next(generateAPIError(`invalid StudentId`, 400));
    const recommendationToBeDeleted = student.recommendations.data.find(ele => ele._id.toString() == recommendId)
    if (!recommendationToBeDeleted) return next(generateAPIError(`invalid recommendId`, 400));
    await studentModel.findByIdAndUpdate(studentId, { $pull: { "recommendations.data": { _id: recommendId } } })
    req.user.logs.push({
        action: "course recommended to student",
        details: `UniversityId:${recommendationToBeDeleted.university}&CourseId:${recommendationToBeDeleted.course}&studentId=${studentId}`
    })
    await req.user.save()
    return res.status(200).json({ success: true, message: "recommendations deleted", data: null, AccessToken: req.AccessToken ? req.AccessToken : null });
})