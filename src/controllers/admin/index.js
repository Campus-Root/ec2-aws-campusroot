import courseModel from "../../models/Course.js";
import { studentModel } from "../../models/Student.js";
import { teamModel } from "../../models/Team.js";
import universityModel from "../../models/University.js";
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
export const allStudents = errorWrapper(async (req, res, next) => {
    const students = await studentModel.find({}, "firstName lastName email displayPicSrc recommendation counsellor activity")
    return res.status(200).json({ success: true, message: `all students`, data: students, AccessToken: req.AccessToken ? req.AccessToken : null });
});

export const singleStudent = errorWrapper(async (req, res, next) => {
    const { id } = req.params
    const student = await studentModel.findById(id)
    await student.populate("counsellor processCoordinator", "firstName lastName email")
    await student.populate("activity.applied.application")
    await student.populate("recommendation")
    await universityModel.populate(student, [{ path: "activity.applied.application.university", select: "name code logoSrc" },]);
    await courseModel.populate(student, [{ path: "activity.applied.application.course", select: "name" },]);
    if (!student) return next(generateAPIError(`Invalid id`, 400))
    return res.status(200).json({ success: true, message: `single student details`, data: student, AccessToken: req.AccessToken ? req.AccessToken : null });
});


export const allCounsellors = errorWrapper(async (req, res, next) => {
    const counsellors = await teamModel.find({ role: "counsellor" }, "firstName lastName email students displayPicSrc").populate("students", "firstName lastName  email displayPicSrc recommendation counsellor activity")
    return res.status(200).json({ success: true, message: `all counsellors`, data: counsellors, AccessToken: req.AccessToken ? req.AccessToken : null });
});

export const allprocessCoordinators = errorWrapper(async (req, res, next) => {
    const processCoordinators = await teamModel.find({ role: "processCoordinator" }, "firstName lastName email students displayPicSrc").populate("students", "firstName lastName email displayPicSrc recommendation counsellor activity")
    return res.status(200).json({ success: true, message: `all processCoordinators`, data: processCoordinators, AccessToken: req.AccessToken ? req.AccessToken : null });
});

export const allDevelopers = errorWrapper(async (req, res, next) => {
    const developers = await teamModel.find({ role: "developer" }, "firstName lastName email displayPicSrc")
    return res.status(200).json({ success: true, message: `all developers`, data: developers, AccessToken: req.AccessToken ? req.AccessToken : null });
});


// export const deleteStaff = async (req, res,next) => {
//     try {
//         const {id}=req.params
//         const employee = await teamModel.findById(id)

//         return res.status(200).json({ success: true, message: `deleted`, data: null })
//     } catch (error) {
//         console.log(error);
// return next(generateAPIError(`${error.name}:${error.message}`, 500));
// }
// }
export const search = errorWrapper(async (req, res, next) => {  
    const keyword = req.query.search ? { $and: [{ role: req.query.role }, { $or: [{ firstName: { $regex: req.query.search, $options: "i" } }, { lastName: { $regex: req.query.search, $options: "i" } },{ email: { $regex: req.query.search, $options: "i" } }] }] } : {};
    const searchResults = await teamModel.find(keyword, "firstName lastName displayPicSrc email")
    return res.status(200).json({ success: true, message: `uname`, data: searchResults, AccessToken: req.AccessToken ? req.AccessToken : null });
});

export const student_transfer = errorWrapper(async (req, res, next) => {
    const { studentId, fromId, toId, role } = req.body
    const student = await studentModel.findById(studentId)
    if (!student) return next(generateAPIError(`Invalid StudentId`, 400));
    console.log(student[role].toString(), fromId);
    if (student[role].toString() != fromId) return next(generateAPIError(`${role} mismatch from student side`, 400));
    const from = await teamModel.findById(fromId)
    if (!from || from.role != role) return next(generateAPIError(`Invalid fromId`, 400));
    from.students = from.students.filter(ele => ele.profile.toString() == studentId)
    const to = await teamModel.findById(toId)
    if (!to || to.role != role) return next(generateAPIError(`Invalid toId`, 400));
    to.students.push({ profile: studentId, stage: "Fresh Lead" })
    student[role] = toId
    from.logs.push({
        action: "student transferred",
        details: `studentId:${studentId}&to:${toId}`
    })
    to.logs.push({
        action: "new student added",
        details: `studentId:${studentId}&from:${fromId}`
    })
    student.logs.push({
        action: `${role} changed`,
        details: `from:${fromId}&to:${toId}`
    })
    await from.save()
    await to.save()
    await student.save()
    return res.status(200).json({ success: true, message: `Shift Successful`, data: to.students, AccessToken: req.AccessToken ? req.AccessToken : null });
})