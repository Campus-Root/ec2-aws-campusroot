import fs from "fs";
import Document from "../../models/Uploads.js";
import { studentModel } from "../../models/Student.js";
import userModel from "../../models/User.js";
import sendMail from "../../utils/sendEMAIL.js"
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import { sendOTP } from "../../utils/sendSMS.js";
import 'dotenv/config';
import Handlebars from "handlebars";
import path from "path";
import { fileURLToPath } from "url";
import { isValidObjectId } from "mongoose";
import { teamModel } from "../../models/Team.js";
import chatModel from "../../models/Chat.js";
import { DestinationTypeEnum } from "../../utils/enum.js";
import { packageModel } from "../../models/Package.js";
import { orderModel } from "../../models/Order.js";
export const profile = errorWrapper(async (req, res, next) => {
    await Promise.all([
        await userModel.populate(req.user, { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" }),
        await Document.populate(req.user,
            [{ path: "tests.docId", select: "name contentType createdAt", },
            { path: "workExperience.docId", select: "name contentType createdAt", },
            { path: "documents.personal.resume", select: "name contentType createdAt", },
            { path: "documents.personal.passportBD", select: "name contentType createdAt", },
            { path: "documents.personal.passportADD", select: "name contentType createdAt", },
            { path: "documents.academic.secondarySchool", select: "name contentType createdAt", },
            { path: "documents.academic.plus2", select: "name contentType createdAt", },
            { path: "documents.academic.degree", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.transcripts", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.bonafide", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.CMM", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.PCM", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.OD", select: "name contentType createdAt", },
            { path: "documents.academic.masters.transcripts", select: "name contentType createdAt", },
            { path: "documents.academic.masters.bonafide", select: "name contentType createdAt", },
            { path: "documents.academic.masters.CMM", select: "name contentType createdAt", },
            { path: "documents.academic.masters.PCM", select: "name contentType createdAt", },
            { path: "documents.academic.masters.OD", select: "name contentType createdAt", },
            { path: "documents.test.general", select: "name contentType createdAt", },
            { path: "documents.test.languageProf", select: "name contentType createdAt", },
            { path: "documents.workExperiences", select: "name contentType createdAt", },]),
        await orderModel.populate(req.user, { path: "orders", select: "paymentDetails Package status priceDetails cancellationReason cancellationDate logs" }),
        await packageModel.populate(req.user, { path: "suggestedPackages purchasedPackages orders.Package", select: "name description country priceDetails requirements benefits products termsAndConditions active" })

    ])
    const profile = { ...req.user._doc }
    delete profile.logs;
    return ({ statusCode: 200, message: `complete profile`, data: profile });
})
export const editEmail = errorWrapper(async (req, res, next) => {
    const { email } = req.body
    if (req.user.verification[0].status) return { statusCode: 400, data: null, message: `email already verified, contact Campus Root team for support` };
    const existingEmail = await userModel.find({ email: email }, "email")
    if (existingEmail.length > 0) return {
        statusCode: 400, data: null, message: `email already exists, Enter a new email`
    };
    req.user.email = email;
    req.user.verification[0].token = {
        data: (Math.random() + 1).toString(16).substring(2),
        expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
    req.user.verification[0].status = false
    let subject = "Email verification"
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.join(__dirname, '../../../static/emailTemplate.html');
    const source = fs.readFileSync(filePath, "utf-8").toString();
    const template = Handlebars.compile(source)
    const replacement = { userName: `${req.user.firstName} ${req.user.lastName}`, URL: `${process.env.SERVER_URL}/api/v1/auth/verify/${email}/${req.user.verification[0].token.data}` }
    const htmlToSend = template(replacement)
    await sendMail({
        to: req.user.email, subject: subject, html: htmlToSend
    });
    req.user.logs.push({
        action: "email updated updated & mail sent for verification",
        details: "email updated in profile"
    })
    await req.user.save()
    return ({ statusCode: 200, message: `mail sent for verification`, data: null });
})
export const editPhone = errorWrapper(async (req, res, next) => {
    const { phone } = req.body
    if (!phone.countryCode || !phone.number) return { statusCode: 400, data: null, message: `Enter a valid number` };
    const existingPhone = await studentModel.find({ $and: [{ "phone.countryCode": phone.countryCode }, { "phone.number": phone.number }] }, "phone")
    if (existingPhone.length > 0) return {
        statusCode: 400, data: null, message: `phone number already exists, Enter a new number`
    };
    req.user.phone = phone
    req.user.verification[1].token = { data: Math.floor(100000 + Math.random() * 900000), expiry: new Date(new Date().getTime() + 5 * 60000) }
    var smsResponse = (req.user.phone.countryCode === "+91") ? await sendOTP({ to: req.user.phone.number, otp: req.user.verification[1].token.data, region: "Indian" }) : await sendOTP({ to: req.user.phone.countryCode + req.user.phone.number, otp: req.user.verification[1].token.data, region: "International" });
    if (!smsResponse.return) {
        console.log(smsResponse); return { statusCode: 400, data: null, message: "Otp not sent" }
    }
    req.user.logs.push({
        action: `profile info updated & otp sent for verification`,
        details: `phone updated in profile`
    })
    await req.user.save()
    return ({ statusCode: 200, message: `otp sent for verification, verify it before it expires`, data: { expiry: req.user.verification[1].token.expiry } });
})
export const editProfile = errorWrapper(async (req, res, next) => {
    const { LeadSource, personalDetails, isPlanningToTakeAcademicTest, isPlanningToTakeLanguageTest, familyDetails, extraCurriculumActivities, displayPicSrc, school, plus2, underGraduation, postGraduation, firstName, lastName, tests, workExperience, skills, preference, researchPapers, education } = req.body;
    if (personalDetails) {
        req.user.personalDetails = personalDetails;
        req.user.logs.push({
            action: `profile info updated`,
            details: `personalDetails updated`
        })
    }
    if (isPlanningToTakeAcademicTest) {
        req.user.isPlanningToTakeAcademicTest = isPlanningToTakeAcademicTest;
        req.user.logs.push({
            action: `profile info updated`,
            details: `isPlanningToTakeAcademicTest updated`
        })
    }
    if (isPlanningToTakeLanguageTest) {
        req.user.isPlanningToTakeLanguageTest = isPlanningToTakeLanguageTest;
        req.user.logs.push({
            action: `profile info updated`,
            details: `isPlanningToTakeLanguageTest updated`
        })
    } if (familyDetails) {
        req.user.familyDetails = familyDetails;
        req.user.logs.push({
            action: `profile info updated`,
            details: `familyDetails updated`
        })
    }
    if (extraCurriculumActivities) {
        req.user.extraCurriculumActivities = extraCurriculumActivities;
        req.user.logs.push({
            action: `profile info updated`,
            details: `extraCurriculumActivities updated`
        })
    }
    if (firstName) {
        req.user.firstName = firstName;
        req.user.logs.push({
            action: `profile info updated`,
            details: `firstName updated`
        })
    }
    if (lastName) {
        req.user.lastName = lastName;
        req.user.logs.push({
            action: `profile info updated`,
            details: `lastName updated`
        })
    }
    if (displayPicSrc) {
        req.user.displayPicSrc = displayPicSrc;
        req.user.logs.push({
            action: `profile info updated`,
            details: `displayPicSrc updated`
        })
    }
    if (LeadSource) {
        req.user.LeadSource = LeadSource;
        req.user.logs.push({
            action: `profile info updated`,
            details: `LeadSource updated`
        })
    }
    if (tests) {
        req.user.tests = tests;
        req.user.logs.push({
            action: `profile info updated`,
            details: `tests updated`
        })
    }
    if (workExperience) {
        req.user.workExperience = workExperience;
        req.user.logs.push({
            action: `profile info updated`,
            details: `workExperience updated`
        })
    }
    if (researchPapers) {
        req.user.researchPapers = researchPapers;
        req.user.logs.push({
            action: `profile info updated`,
            details: `researchPapers updated`
        })
    }
    if (school) {
        req.user.education.school = school;
        req.user.logs.push({
            action: `profile info updated`,
            details: `school updated`
        })
    }
    if (plus2) {
        req.user.education.plus2 = plus2;
        req.user.logs.push({
            action: `profile info updated`,
            details: `plus2 updated`
        })
    }
    if (underGraduation) {
        req.user.education.underGraduation = underGraduation;
        req.user.logs.push({
            action: `profile info updated`,
            details: `underGraduation updated`
        })
    }
    if (postGraduation) {
        req.user.education.postGraduation = postGraduation;
        req.user.logs.push({
            action: `profile info updated`,
            details: `postGraduation updated`
        })
    }
    if (skills) {
        req.user.skills = skills;
        req.user.logs.push({
            action: `profile info updated`,
            details: `skills updated`
        })
    }
    if (preference) {
        req.user.preference = preference;
        req.user.logs.push({
            action: `profile info updated`,
            details: `preference updated`
        })
    }
    if (education) {
        req.user.education = education;
        req.user.logs.push({
            action: `profile info updated`,
            details: `education updated`
        })
    }
    await Promise.all([
        await req.user.save(),
        await userModel.populate(req.user, { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" }),
        await Document.populate(req.user,
            [{ path: "tests.docId", select: "name contentType createdAt", },
            { path: "workExperience.docId", select: "name contentType createdAt", },
            { path: "documents.personal.resume", select: "name contentType createdAt", },
            { path: "documents.personal.passportBD", select: "name contentType createdAt", },
            { path: "documents.personal.passportADD", select: "name contentType createdAt", },
            { path: "documents.academic.secondarySchool", select: "name contentType createdAt", },
            { path: "documents.academic.plus2", select: "name contentType createdAt", },
            { path: "documents.academic.degree", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.transcripts", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.bonafide", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.CMM", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.PCM", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.OD", select: "name contentType createdAt", },
            { path: "documents.academic.masters.transcripts", select: "name contentType createdAt", },
            { path: "documents.academic.masters.bonafide", select: "name contentType createdAt", },
            { path: "documents.academic.masters.CMM", select: "name contentType createdAt", },
            { path: "documents.academic.masters.PCM", select: "name contentType createdAt", },
            { path: "documents.academic.masters.OD", select: "name contentType createdAt", },
            { path: "documents.test.general", select: "name contentType createdAt", },
            { path: "documents.test.languageProf", select: "name contentType createdAt", },
            { path: "documents.workExperiences", select: "name contentType createdAt", },])
    ])
    const profile = { ...req.user._doc }
    delete profile.logs
    delete profile.activity;
    return ({ statusCode: 200, message: `profile edited successfully`, data: profile });
})
export const uploadInProfile = errorWrapper(async (req, res, next) => {
    const { fieldPath } = req.body;
    if (!fieldPath) return { statusCode: 400, data: null, message: `fieldPath is required` };
    const allowedFieldPaths = [
        "personal.resume",
        "personal.passportBD",
        "personal.passportADD",
        "academic.secondarySchool",
        "academic.plus2",
        "academic.degree",
        "academic.bachelors.transcripts",
        "academic.bachelors.bonafide",
        "academic.bachelors.CMM",
        "academic.bachelors.PCM",
        "academic.bachelors.OD",
        "academic.masters.transcripts",
        "academic.masters.bonafide",
        "academic.masters.CMM",
        "academic.masters.PCM",
        "academic.masters.OD",
        "test.languageProf",
        "test.general",
        "workExperiences",];
    if (!allowedFieldPaths.includes(fieldPath)) return {
        statusCode: 400, data: null, message: `Invalid fieldPath`
    };
    if (!req.file) return {
        statusCode: 400, data: null, message: `file not uploaded`
    };
    const { originalname, path, mimetype } = req.file;
    const data = fs.readFileSync(path);
    const docDetails = { name: originalname, data: data, contentType: mimetype, user: req.user._id, type: "General", viewers: [req.user._id, req.user.counsellor], };
    if (req.user.processCoordinator) docDetails.viewers.push(req.user.processCoordinator);
    const newDoc = await Document.create(docDetails);
    fs.unlinkSync(path);
    const { ...fields } = fieldPath.split(".")
    switch (fields[0]) {
        case "personal":
            req.user.documents[fields[0]][fields[1]] = newDoc._id
            break;
        case "academic":
            fields[2] ? req.user.documents[fields[0]][fields[1]][fields[2]] = newDoc._id : req.user.documents[fields[0]][fields[1]] = newDoc._id
            break;
        case "test":
            if (req.user.documents[fields[0]][fields[1]].length >= 5) return {
                statusCode: 400, data: null, message: `Maximum limit of 5 documents reached`
            };
            req.user.documents[fields[0]][fields[1]].push(newDoc._id)
            break;
        case "workExperiences":
            if (req.user.documents[fields[0]].length >= 5) return {
                statusCode: 400, data: null, message: `Maximum limit of 5 documents reached`
            };
            req.user.documents[fields[0]].push(newDoc._id)
            break;
        default: return {
            statusCode: 400, data: null, message: `Invalid fieldPath`
        };
    }
    req.user.logs.push({
        action: `document uploaded`,
        details: `path:${fieldPath}&documentId:${newDoc._id}`
    })
    await Promise.all([
        await req.user.save(),
        await Document.populate(req.user,
            [{ path: "tests.docId", select: "name contentType createdAt", },
            { path: "workExperience.docId", select: "name contentType createdAt", },
            { path: "documents.personal.resume", select: "name contentType createdAt", },
            { path: "documents.personal.passportBD", select: "name contentType createdAt", },
            { path: "documents.personal.passportADD", select: "name contentType createdAt", },
            { path: "documents.academic.secondarySchool", select: "name contentType createdAt", },
            { path: "documents.academic.plus2", select: "name contentType createdAt", },
            { path: "documents.academic.degree", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.transcripts", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.bonafide", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.CMM", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.PCM", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.OD", select: "name contentType createdAt", },
            { path: "documents.academic.masters.transcripts", select: "name contentType createdAt", },
            { path: "documents.academic.masters.bonafide", select: "name contentType createdAt", },
            { path: "documents.academic.masters.CMM", select: "name contentType createdAt", },
            { path: "documents.academic.masters.PCM", select: "name contentType createdAt", },
            { path: "documents.academic.masters.OD", select: "name contentType createdAt", },
            { path: "documents.test.general", select: "name contentType createdAt", },
            { path: "documents.test.languageProf", select: "name contentType createdAt", },
            { path: "documents.workExperiences", select: "name contentType createdAt", },]),
    ])
    return ({ statusCode: 200, message: `Document added to ${fieldPath}`, data: { docs: req.user.documents } });
})
export const deleteUploadedInProfile = errorWrapper(async (req, res, next) => {
    const { fieldPath, documentId } = req.body;
    if (!fieldPath) return { statusCode: 400, data: null, message: `fieldPath is required` };
    const allowedFieldPaths = ["personal.resume", "personal.passportBD", "personal.passportADD", "academic.secondarySchool", "academic.plus2", "academic.degree", "academic.bachelors.transcripts", "academic.bachelors.bonafide", "academic.bachelors.CMM", "academic.bachelors.PCM", "academic.bachelors.OD", "academic.masters.transcripts", "academic.masters.bonafide", "academic.masters.CMM", "academic.masters.PCM", "academic.masters.OD", "test.languageProf", "test.general", "workExperiences",];
    if (!allowedFieldPaths.includes(fieldPath)) return { statusCode: 400, data: null, message: `Invalid fieldPath` };
    const existingDoc = await Document.findById(documentId);
    if (!existingDoc) return { statusCode: 400, data: null, message: `Document not found` };
    if (existingDoc.user.toString() !== req.user._id.toString()) return {
        statusCode: 400, data: null, message: `Unauthorized to delete this document`
    };
    const { ...fields } = fieldPath.split(".")
    switch (fields[0]) {
        case "personal":
            if (req.user.documents[fields[0]][fields[1]].toString() != documentId) return { statusCode: 400, data: null, message: `Document Id mis match` };
            req.user.documents[fields[0]][fields[1]] = null
            break;
        case "academic":
            if (!fields[2]) {
                if (req.user.documents[fields[0]][fields[1]].toString() != documentId) return { statusCode: 400, data: null, message: `Document Id mis match` };
                req.user.documents[fields[0]][fields[1]] = null
                break;
            }
            if (req.user.documents[fields[0]][fields[1]][fields[2]].toString() != documentId) return { statusCode: 400, data: null, message: `Document Id mis match` };
            req.user.documents[fields[0]][fields[1]][fields[2]] = null
            break;
        case "test":
            if (!req.user.documents[fields[0]][fields[1]].includes(documentId)) return { statusCode: 400, data: null, message: `Document Id mis match` };
            req.user.documents[fields[0]][fields[1]] = req.user.documents[fields[0]][fields[1]].filter(ele => ele.toString() != documentId)
            break;
        case "workExperiences":
            if (!req.user.documents[fields[0]].includes(documentId)) return { statusCode: 400, data: null, message: `Document Id mis match` };
            req.user.documents[fields[0]] = req.user.documents[fields[0]].filter(ele => ele.toString() != documentId)
            break;
        default: return { statusCode: 400, data: null, message: `Invalid fieldPath` };
    }
    req.user.logs.push({
        action: `document deleted`,
        details: `path:${fieldPath} `
    })
    await Promise.all([
        await req.user.save(),
        await Document.findByIdAndRemove(documentId),
        await Document.populate(req.user,
            [{ path: "tests.docId", select: "name contentType createdAt", },
            { path: "workExperience.docId", select: "name contentType createdAt", },
            { path: "documents.personal.resume", select: "name contentType createdAt", },
            { path: "documents.personal.passportBD", select: "name contentType createdAt", },
            { path: "documents.personal.passportADD", select: "name contentType createdAt", },
            { path: "documents.academic.secondarySchool", select: "name contentType createdAt", },
            { path: "documents.academic.plus2", select: "name contentType createdAt", },
            { path: "documents.academic.degree", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.transcripts", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.bonafide", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.CMM", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.PCM", select: "name contentType createdAt", },
            { path: "documents.academic.bachelors.OD", select: "name contentType createdAt", },
            { path: "documents.academic.masters.transcripts", select: "name contentType createdAt", },
            { path: "documents.academic.masters.bonafide", select: "name contentType createdAt", },
            { path: "documents.academic.masters.CMM", select: "name contentType createdAt", },
            { path: "documents.academic.masters.PCM", select: "name contentType createdAt", },
            { path: "documents.academic.masters.OD", select: "name contentType createdAt", },
            { path: "documents.test.general", select: "name contentType createdAt", },
            { path: "documents.test.languageProf", select: "name contentType createdAt", },
            { path: "documents.workExperiences", select: "name contentType createdAt", },])
    ])
    return { statusCode: 200, message: `Document deleted from ${fieldPath} `, data: req.user.documents };
})
export const verifyEmail = errorWrapper(async (req, res, next) => {
    let subject = "Verify Your Email to Activate Your CampusRoot Account"
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.join(__dirname, '../../../static/emailTemplate.html');
    const source = fs.readFileSync(filePath, "utf-8").toString();
    const template = Handlebars.compile(source)
    req.user.verification[0].status = false
    req.user.verification[0].token = { data: (Math.random() + 1).toString(16).substring(2), expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    const replacement = {
        userName: `${req.user.firstName} ${req.user.lastName} `, URL: `${process.env.SERVER_URL} /api/v1 / auth / verify / ${req.user.email}/${req.user.verification[0].token.data}`
    }
    const htmlToSend = template(replacement)
    await sendMail({ to: req.user.email, subject: subject, html: htmlToSend });
    req.user.logs.push({ action: `Email sent for verification`, details: `` });
    await req.user.save()
    return ({ statusCode: 200, message: `email sent for verification`, data: null });
})
export const sendUserOTP = errorWrapper(async (req, res, next) => {
    const otp = Math.floor(100000 + Math.random() * 900000), expiry = new Date(new Date().getTime() + 5 * 60000);
    if (req.user.phone.number && req.user.verification[1].status) return { statusCode: 400, data: null, message: "already verified" };
    req.user.verification[1].token = { data: otp, expiry: expiry, }
    var smsResponse = (req.user.phone.countryCode === "+91") ? await sendOTP({ to: req.user.phone.number, otp: otp, region: "Indian" }) : await sendOTP({ to: req.user.phone.countryCode + req.user.phone.number, otp: otp, region: "International" });
    if (!smsResponse.return) {
        console.log(smsResponse);
        return { statusCode: 500, data: student, message: "Otp not sent" }
    }
    req.user.logs.push({
        action: `otp sent for verification`,
        details: ``
    })
    await req.user.save()
    return ({ statusCode: 200, message: `otp sent for verification, verify before expiry`, data: { expiry: expiry } });
})
export const verifyUserOTP = errorWrapper(async (req, res, next) => {
    const { otp } = req.body
    const user = await studentModel.findById(req.user._id, "verification logs")
    if (user.verification[1].token.data !== otp) return { statusCode: 400, data: null, message: "invalid otp" }
    if (new Date() > new Date(user.verification[1].token.expiry)) return {
        statusCode: 400, data: null, message: "otp expired, generate again"
    }
    user.verification[1].status = true
    user.logs.push({
        action: `otp verification successful`,
        details: ``
    })
    await user.save()
    return ({ statusCode: 200, message: `phone verification successful`, data: user.verification });
})
export const requestCounsellor = errorWrapper(async (req, res, next) => {
    const { country } = req.body
    await userModel.populate(req.user, { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" })
    let alreadyExist = req.user.advisors.find(ele => ele.info.role === "counsellor" && ele.assignedCountries.includes(country))
    if (alreadyExist && isValidObjectId(alreadyExist.info._id)) return { statusCode: 400, data: null, message: `expert counsellor for selected country is already assigned` };
    let alreadyExistButDifferentCountry = req.user.advisors.find(ele => ele.info.role == "counsellor" && ele.info.expertiseCountry.includes(country))
    if (alreadyExistButDifferentCountry && isValidObjectId(alreadyExistButDifferentCountry.info._id)) {
        alreadyExistButDifferentCountry.assignedCountries.push(country)
        req.user.logs.push({
            action: `${country} counsellor assigned`,
            details: `counsellorId:${alreadyExistButDifferentCountry.info._id}&country:${country}}`
        })
        await req.user.save()
        await userModel.populate(req.user, { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" })
        return ({ statusCode: 200, message: `counsellor assigned for multiple countries`, data: req.user.advisors });
    }
    const Counsellors = await teamModel.aggregate([{ $match: { role: "counsellor", expertiseCountry: country } }, { $project: { _id: 1, students: 1, students: { $size: "$students" } } }, { $sort: { students: 1 } }, { $limit: 1 }]);
    await teamModel.findByIdAndUpdate(Counsellors[0]._id, { $push: { students: { profile: req.user._id, stage: "Fresh Lead" } } });
    req.user.advisors.push({ info: Counsellors[0]._id, assignedCountries: [country] })
    const chat = await chatModel.create({ participants: [req.user._id, Counsellors[0]._id] });
    req.user.logs.push({
        action: `${country} counsellor assigned`,
        details: `counsellorId:${Counsellors[0]}&country:${country}}`
    })
    await req.user.save()
    await userModel.populate(req.user, { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" })
    await userModel.populate(chat, { path: "participants", select: "firstName lastName displayPicSrc email userType role" });
    return ({ statusCode: 200, message: `counsellor assigned`, data: { advisors: req.user.advisors, chat: chat } });
})
