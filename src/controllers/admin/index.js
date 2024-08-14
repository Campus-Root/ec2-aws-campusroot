import courseModel from "../../models/Course.js";
import { studentModel } from "../../models/Student.js";
import { teamModel } from "../../models/Team.js";
import universityModel from "../../models/University.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
export const allStudents = errorWrapper(async (req, res, next) => {
    const students = await studentModel.find({}, "firstName lastName email displayPicSrc recommendation counsellor activity")
    return { statusCode: 200, message: `all students`, data: students };
});

export const singleStudent = errorWrapper(async (req, res, next) => {
    const { id } = req.params
    const student = await studentModel.findById(id)
    await student.populate("counsellor processCoordinator", "firstName lastName email")
    await student.populate("activity.applied.application")
    await student.populate("recommendation")
    await universityModel.populate(student, [{ path: "activity.applied.application.university", select: "name code logoSrc" },]);
    await courseModel.populate(student, [{ path: "activity.applied.application.course", select: "name" },]);
    if (!student) return { statusCode: 400, data: null, message: `Invalid id` }
    return { statusCode: 200, message: `single student details`, data: student };
});


export const allCounsellors = errorWrapper(async (req, res, next) => {
    const counsellors = await teamModel.find({ role: "counsellor" }, "firstName lastName email students displayPicSrc").populate("students", "firstName lastName  email displayPicSrc recommendation counsellor activity")
    return { statusCode: 200, message: `all counsellors`, data: counsellors };
});

export const allprocessCoordinators = errorWrapper(async (req, res, next) => {
    const processCoordinators = await teamModel.find({ role: "processCoordinator" }, "firstName lastName email students displayPicSrc").populate("students", "firstName lastName email displayPicSrc recommendation counsellor activity")
    return { statusCode: 200, message: `all processCoordinators`, data: processCoordinators };
});

export const allDevelopers = errorWrapper(async (req, res, next) => {
    const developers = await teamModel.find({ role: "developer" }, "firstName lastName email displayPicSrc")
    return { statusCode: 200, message: `all developers`, data: developers };
});


// export const deleteStaff = async (req, res,next) => {
//     try {
//         const {id}=req.params
//         const employee = await teamModel.findById(id)

//         return { statusCode: 200, message: `deleted`, data: null }
//     } catch (error) {
//         console.log(error);
// return { statusCode: 400, data: student , message:    `${error.name}:${error.message}`};
// }
// }
export const search = errorWrapper(async (req, res, next) => {
    const keyword = req.query.search ? { $and: [{ role: req.query.role }, { $or: [{ firstName: { $regex: req.query.search, $options: "i" } }, { lastName: { $regex: req.query.search, $options: "i" } }, { email: { $regex: req.query.search, $options: "i" } }] }] } : {};
    const searchResults = await teamModel.find(keyword, "firstName lastName displayPicSrc email")
    return { statusCode: 200, message: `uname`, data: searchResults };
});

export const student_transfer = errorWrapper(async (req, res, next) => {
    const { studentId, fromId, toId, role } = req.body
    const student = await studentModel.findById(studentId)
    if (!student) return { statusCode: 400, data: null, message: `Invalid StudentId` };
    console.log(student[role].toString(), fromId);
    if (student[role].toString() != fromId) return {
        statusCode: 400, data: null, message: `${role} mismatch from student side`
    };
    const from = await teamModel.findById(fromId)
    if (!from || from.role != role) return {
        statusCode: 400, data: null, message: `Invalid fromId`
    };
    from.students = from.students.filter(ele => ele.profile.toString() == studentId)
    const to = await teamModel.findById(toId)
    if (!to || to.role != role) return {
        statusCode: 400, data: null, message: `Invalid toId`
    };
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
    return { success: true, message: `Shift Successful`, data: to.students };
})