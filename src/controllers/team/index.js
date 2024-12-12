import courseModel from "../../models/Course.js";
import universityModel from "../../models/University.js";
import { studentModel } from "../../models/Student.js";
import Document from "../../models/Uploads.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import userModel from "../../models/User.js";
import { productModel } from "../../models/Product.js"
import meetingModel from "../../models/meetings.js";
import leadsModel from "../../models/leads.js";
import { packageModel } from "../../models/Package.js";
import { orderModel } from "../../models/Order.js";
import mongoose from "mongoose";
export const profile = errorWrapper(async (req, res, next, session) => {
    const profile = {
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        displayPicSrc: req.user.displayPicSrc,
        email: req.user.email,
        linkedIn: req.user.linkedIn,
    }
    return ({ statusCode: 200, message: `all Details of Counsellor`, data: profile })
})
export const profileEdit = errorWrapper(async (req, res, next, session) => {
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
    return ({ statusCode: 200, message: `updated Details of Counsellor`, data: profile })
})
export const downloadDoc = errorWrapper(async (req, res, next, session) => {
    const { documentId } = req.params
    const document = await Document.findById(documentId)
    if (!document) return { statusCode: 400, data: null, message: `invalid Document Id` };
    // if (!document.viewers.includes(req.user._id) && document.user.toString() != req.user._id) return { statusCode: 400, data: student , message:    `invalid access to document`};
    return res.contentType(document.contentType).send(document.data);
})
export const singleStudentProfile = errorWrapper(async (req, res, next, session) => {
    const { id } = req.params;
    const student = await studentModel.findById(id);
    if (!student) return { statusCode: 400, data: null, message: `Invalid StudentId` };
    await meetingModel.populate(student, [{ path: "activity.meetings", select: "data user member", },])
    await orderModel.populate(student, { path: "orders", select: "paymentDetails Package status priceDetails cancellationReason cancellationDate logs products" })
    await packageModel.populate(student, { path: "suggestedPackages purchasedPackages orders.Package", select: "name description country priceDetails.totalPrice priceDetails.currency requirements benefits products termsAndConditions active" })
    await productModel.populate(student, [{ path: "activity.products orders.products" }])
    await courseModel.populate(student, [{ path: "recommendations.data.course activity.cart.course activity.wishList activity.products.course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails university elite", },])
    await Document.populate(student, [{ path: "documents.personal.resume documents.personal.passportBD documents.personal.passportADD documents.academic.secondarySchool documents.academic.plus2 documents.academic.degree documents.academic.bachelors.transcripts documents.academic.bachelors.bonafide documents.academic.bachelors.CMM documents.academic.bachelors.PCM documents.academic.bachelors.OD documents.academic.masters.transcripts documents.academic.masters.bonafide documents.academic.masters.CMM documents.academic.masters.PCM documents.academic.masters.OD documents.test.general documents.test.languageProf documents.workExperiences workExperience.docId tests.docId", select: "data", },])
    await universityModel.populate(student, [{ path: "recommendations.data.course.university activity.cart.course.university activity.wishList.university activity.products.course.university", select: "name logoSrc location type establishedYear ", },])
    await userModel.populate(student, [{ path: "advisors.info activity.meetings.user activity.meetings.member", select: "firstName lastName email displayPicSrc", },])
    return ({ statusCode: 200, message: `All details of Student`, data: student });
});
export const singleApplications = errorWrapper(async (req, res, next, session) => {
    const { id } = req.params
    const application = await productModel.findById(id)
    if (!application) return { statusCode: 400, data: null, message: `invalid applicationId` };
    await userModel.populate(application, { path: "user processCoordinator counsellor", select: "firstName lastName email displayPicSrc" })
    await Document.populate(application, { path: "docChecklist.doc", select: "data" })
    await courseModel.populate(application, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails university elite" });
    await universityModel.populate(application, { path: "course.university", select: "name logoSrc location type establishedYear " });
    return ({ statusCode: 200, message: `single applications details`, data: application })
})
export const listings = errorWrapper(async (req, res, next, session) => {
    const { page, perPage = 20 } = req.body, filter = {}, skip = (page - 1) * perPage; // Number of items per page
    let totalPages = 0, totalDocs
    switch (req.params.name) {
        case "students":
            req.body.filterData.forEach(ele => {
                if (ele.type === "name") filter["$or"] ? filter["$or"].push([{ email: { $regex: ele.data[0], $options: "i" } }, { firstName: { $regex: ele.data[0], $options: "i" } }, { lastName: { $regex: ele.data[0], $options: "i" } }]) : filter["$or"] = [{ email: { $regex: ele.data[0], $options: "i" } }, { firstName: { $regex: ele.data[0], $options: "i" } }, { lastName: { $regex: ele.data[0], $options: "i" } }]
            });
            filter["advisors.info"] = req.user._id
            const listOfStudents = await studentModel.find(filter, "firstName lastName email displayPicSrc phone recommendations preference").skip(skip).limit(perPage); 
            // await courseModel.populate(listOfStudents, [{ path: "applications.course", select: "name unisName startDate" }])
            const studentsWithStages = new Map()
            req.user.students.forEach((item) => studentsWithStages.set(item.profile.toString(), item.stage));
            let students = listOfStudents.map(element => {
                return {
                    ...element._doc,
                    stage: studentsWithStages.get(element._id.toString())
                };
            });
            let stageFilter = req.body.filterData.find(ele => ele.type === "stage")
            if (stageFilter) students = students.filter(ele => stageFilter.data.includes(ele.stage))
            totalDocs = await studentModel.countDocuments(filter)
            totalPages = Math.ceil(totalDocs / perPage);
            return ({ statusCode: 200, message: `students list`, data: { list: students, currentPage: page, totalPages: totalPages, totalItems: totalDocs } })
        case "applications":
            req.body.filterData.forEach(ele => {
                switch (ele.type) {
                    case "courseId":
                        filter["course"] = { $in: ele.data.map(i => new mongoose.Types.ObjectId(i)) };
                        break;
                    case "universityId":
                        filter["university"] = { $in: ele.data.map(i => new mongoose.Types.ObjectId(i)) };
                        break;
                    case "processCoordinator":
                        filter["$or"] ? filter.$or.push([{ "info.approval.counsellorApproval": true }, { "info.approval.userConsent": true }]) : filter["$or"] = [{ "info.approval.counsellorApproval": true }, { "info.approval.userConsent": true }]
                        break;
                    case "counsellorApproval":
                        filter["info.approval.counsellorApproval"] = { $in: ele.data }
                        break;
                    case "userConsent":
                        filter["info.approval.userConsent"] = { $in: ele.data }
                        break;
                    case "user":
                        filter["user"] = { $in: ele.data }
                        break;
                    case "cancellationRequest":
                        filter["cancellationRequest"] = { $in: ele.data }
                        break;
                    case "stage":
                        filter["stage"] = { $in: ele.data }
                        break;
                    case "status":
                        filter["status"] = { $in: ele.data }
                        break;
                    case "intake":
                        filter["intake"] = { $gte: new Date(fromDate), $lt: new Date(toDate) }
                        break;
                    case "deadline":
                        filter["deadline"] = { $gte: new Date(fromDate), $lt: new Date(toDate) }
                        break;
                    default:
                        break;
                }
            });
            filter.advisors = req.user._id
            const applications = await productModel.find(filter, "course intake deadline user info stage status cancellationRequest createdAt updatedAt").skip(skip).limit(perPage)
            totalDocs = await productModel.countDocuments(filter)
            totalPages = Math.ceil(totalDocs / perPage);
            await userModel.populate(applications, { path: "user advisors", select: "firstName lastName email displayPicSrc" })
            await courseModel.populate(applications, { path: "course", select: "name university unisName startDate" })
            await universityModel.populate(applications, { path: "course.university", select: "name" })
            return ({ statusCode: 200, message: `applications list`, data: { list: applications, currentPage: page, totalPages: totalPages, totalItems: totalDocs } })
        case "leads":
            filter[req.user.role] = req.user._id
            const leads = await leadsModel.find(filter, "name email phone queryDescription ifPhoneIsSameAsWhatsapp whatsappNumber student leadSource leadRating").skip(skip).limit(perPage)
            totalDocs = await studentModel.countDocuments(filter)
            totalPages = Math.ceil(totalDocs / perPage);
            return ({ statusCode: 200, message: `leads list`, data: { list: leads, currentPage: page, totalPages: totalPages, totalItems: totalDocs } })
        default: return { statusCode: 400, data: null, message: `invalid params` };
    }
})
export const newStudents = errorWrapper(async (req, res, next, session) => {
    const { page, perPage = 20 } = req.body, filter = {}, skip = (page - 1) * perPage; // Number of items per page
    let totalPages = 0, totalDocs
    req.body.filterData.forEach(ele => { if (ele.type === "name") filter["$or"] ? filter["$or"].push([{ email: { $regex: ele.data[0], $options: "i" } }, { firstName: { $regex: ele.data[0], $options: "i" } }, { lastName: { $regex: ele.data[0], $options: "i" } }]) : filter["$or"] = [{ email: { $regex: ele.data[0], $options: "i" } }, { firstName: { $regex: ele.data[0], $options: "i" } }, { lastName: { $regex: ele.data[0], $options: "i" } }] });
    filter["advisors"] = { $size: 0 }
    const listOfStudents = await studentModel.find(filter, "firstName lastName email displayPicSrc phone preference").skip(skip).limit(perPage);
    totalDocs = await studentModel.countDocuments(filter)
    totalPages = Math.ceil(totalDocs / perPage);
    return ({ statusCode: 200, message: `students list`, data: { list: listOfStudents, currentPage: page, totalPages: totalPages, totalItems: totalDocs } })
}) 