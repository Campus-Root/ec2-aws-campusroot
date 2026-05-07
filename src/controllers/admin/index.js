import courseModel from "../../models/Course.js";
import { studentModel } from "../../models/Student.js";
import { teamModel } from "../../models/Team.js";
import universityModel from "../../models/University.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
export const allStudents = errorWrapper(async (req, res, next) => {
    const students = await studentModel.find({}, "firstName lastName email displayPicSrc recommendation advisors activity")
    return { statusCode: 200, message: `all students`, data: students };
});

export const singleStudent = errorWrapper(async (req, res, next) => {
    const { id } = req.params
    const student = await studentModel.findById(id)
    await student.populate("advisors.info", "firstName lastName email")
    await student.populate("activity.products")
    await student.populate("activity.wishList")
    await courseModel.populate(student, [{ path: "activity.cart.course", select: "name" },]);
    await universityModel.populate(student, [{ path: "activity.cart.course.university", select: "name code logoSrc" },]);
    if (!student) return { statusCode: 400, data: null, message: `Invalid id` }
    return { statusCode: 200, message: `single student details`, data: student };
});


export const allCounsellors = errorWrapper(async (req, res, next) => {
    const counsellors = await teamModel.find({ role: "counsellor" }, "firstName lastName email students displayPicSrc").populate("students", "firstName lastName  email displayPicSrc")
    return { statusCode: 200, message: `all counsellors`, data: counsellors };
});

export const allprocessCoordinators = errorWrapper(async (req, res, next) => {
    const processCoordinators = await teamModel.find({ role: "processCoordinator" }, "firstName lastName email students displayPicSrc").populate("students", "firstName lastName email displayPicSrc")
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
    const { studentId, fromId, toId } = req.body
    const student = await studentModel.findById(studentId)
    if (!student) return { statusCode: 400, data: null, message: `Invalid StudentId` };
    const toBeReplaced = student.advisors.find(ele => ele.info.toString() == fromId)
    if (!toBeReplaced) return { statusCode: 400, data: null, message: ` fromId Advisor not found` };
    toBeReplaced.info = toId
    await student.save()
    return { statusCode: 200, message: `Student transferred successfully`, data: student };
})