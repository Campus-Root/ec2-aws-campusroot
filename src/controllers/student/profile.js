import { unlinkSync, readFileSync } from "fs";
import Document from "../../models/Uploads.js";
import userModel from "../../models/User.js";
import sendMail from "../../utils/sendEMAIL.js"
import { errorWrapper } from "../../middleware/errorWrapper.js";
import 'dotenv/config';
import Handlebars from "handlebars";
import { isValidObjectId } from "mongoose";
import { teamModel } from "../../models/Team.js";
import chatModel from "../../models/Chat.js";
import institutionModel from "../../models/IndianColleges.js";
import Joi from "joi";
import { loginSchema, uploadInProfileSchema } from "../../schemas/student.js";
import { deleteFileInWorkDrive, uploadFileToWorkDrive } from "../../utils/CRMintegrations.js";
import { getNewAdvisor } from "../../utils/dbHelperFunctions.js";
import { sendOTP } from "../../utils/sendSMS.js";
import path from "path";
import { fileURLToPath } from "url";
import { studentModel } from "../../models/Student.js";
export const profile = errorWrapper(async (req, res, next, session) => {
    await Promise.all([
        userModel.populate(req.user, [
            { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" },
            { path: "blockedBy blockList", select: "firstName displayPicSrc lastName email role userType" }
        ]),
        Document.populate(req.user,
            [{ path: "tests.docId", select: "data", },
            { path: "workExperience.docId", select: "data", },
            { path: "documents.personal.resume", select: "data", },
            { path: "documents.personal.passportBD", select: "data", },
            { path: "documents.personal.passportADD", select: "data", },
            { path: "documents.academic.secondarySchool", select: "data", },
            { path: "documents.academic.plus2", select: "data", },
            { path: "documents.academic.degree", select: "data", },
            { path: "documents.academic.bachelors.transcripts", select: "data", },
            { path: "documents.academic.bachelors.bonafide", select: "data", },
            { path: "documents.academic.bachelors.CMM", select: "data", },
            { path: "documents.academic.bachelors.PCM", select: "data", },
            { path: "documents.academic.bachelors.OD", select: "data", },
            { path: "documents.academic.masters.transcripts", select: "data", },
            { path: "documents.academic.masters.bonafide", select: "data", },
            { path: "documents.academic.masters.CMM", select: "data", },
            { path: "documents.academic.masters.PCM", select: "data", },
            { path: "documents.academic.masters.OD", select: "data", },
            { path: "documents.test.general", select: "data", },
            { path: "documents.test.languageProf", select: "data", },
            { path: "documents.workExperiences", select: "data", },]),
        institutionModel.populate(req.user, { path: "IEH.institution", select: "InstitutionName IEH.logoSrc IEH.members InstitutionType university" })
    ])
    const profile = { ...req.user._doc }
    delete profile.logs;
    return ({ statusCode: 200, message: `complete profile`, data: profile });
})
export const editProfile = errorWrapper(async (req, res, next, session) => {
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
            [{ path: "tests.docId", select: "data", },
            { path: "workExperience.docId", select: "data", },
            { path: "documents.personal.resume", select: "data", },
            { path: "documents.personal.passportBD", select: "data", },
            { path: "documents.personal.passportADD", select: "data", },
            { path: "documents.academic.secondarySchool", select: "data", },
            { path: "documents.academic.plus2", select: "data", },
            { path: "documents.academic.degree", select: "data", },
            { path: "documents.academic.bachelors.transcripts", select: "data", },
            { path: "documents.academic.bachelors.bonafide", select: "data", },
            { path: "documents.academic.bachelors.CMM", select: "data", },
            { path: "documents.academic.bachelors.PCM", select: "data", },
            { path: "documents.academic.bachelors.OD", select: "data", },
            { path: "documents.academic.masters.transcripts", select: "data", },
            { path: "documents.academic.masters.bonafide", select: "data", },
            { path: "documents.academic.masters.CMM", select: "data", },
            { path: "documents.academic.masters.PCM", select: "data", },
            { path: "documents.academic.masters.OD", select: "data", },
            { path: "documents.test.general", select: "data", },
            { path: "documents.test.languageProf", select: "data", },
            { path: "documents.workExperiences", select: "data", },])
    ])
    const profile = { ...req.user._doc }
    delete profile.logs
    delete profile.activity;
    return ({ statusCode: 200, message: `profile edited successfully`, data: profile });
})
export const uploadInProfile = errorWrapper(async (req, res, next, session) => {
    if (!req.file) return { statusCode: 400, data: null, message: `no file found` };
    const { error, value } = uploadInProfileSchema.validate(req.body)
    if (error) {
        if (req.file && req.file.path) unlinkSync(req.file.path);
        return { statusCode: 400, data: [value], message: error.details[0].message };
    }
    const { fieldPath, fileIdentifier } = value;
    const { ...fields } = fieldPath.split(".")
    let isArray = false
    switch (fields[0]) {
        case "test":
            if (req.user.documents[fields[0]][fields[1]].length >= 5) {
                if (req.file && req.file.path) unlinkSync(req.file.path);
                return { statusCode: 400, data: null, message: `Maximum limit of 5 documents reached` };
            }
            isArray = true
            break;
        case "workExperiences":
            if (req.user.documents[fields[0]].length >= 5) {
                if (req.file && req.file.path) unlinkSync(req.file.path);
                return { statusCode: 400, data: null, message: `Maximum limit of 5 documents reached` };
            }
            isArray = true
            break;
    }
    const uploadedFileResponse = await uploadFileToWorkDrive({ originalname: req.file.originalname, path: req.file.path, mimetype: req.file.mimetype, fileIdentifier: fileIdentifier || "", folder_ID: req.user.docData.folder })
    if (!uploadedFileResponse.success) return { statusCode: 500, message: uploadedFileResponse.message, data: uploadedFileResponse.data }
    if (!uploadedFileResponse.data.new) return { statusCode: 200, message: `file updated`, data: null }
    const { FileName, resource_id, mimetype, originalname, preview_url } = uploadedFileResponse.data
    const docDetails = { data: { FileName, resource_id, mimetype, originalname, fileIdentifier, preview_url }, user: req.user._id, type: "General", viewers: [] };
    const newDoc = await Document.create(docDetails);
    if (isArray) {
        fields[1] ? req.user.documents[fields[0]][fields[1]].push(newDoc._id) : req.user.documents[fields[0]].push(newDoc._id)
    } else {
        fields[2] ? req.user.documents[fields[0]][fields[1]][fields[2]] = newDoc._id : req.user.documents[fields[0]][fields[1]] = newDoc._id
    }
    req.user.logs.push({
        action: `file uploaded`,
        details: `file uploaded for ${fieldPath}`
    })
    await Promise.all([
        await req.user.save(),
        await Document.populate(req.user,
            [{ path: "tests.docId", select: "data", },
            { path: "workExperience.docId", select: "data", },
            { path: "documents.personal.resume", select: "data", },
            { path: "documents.personal.passportBD", select: "data", },
            { path: "documents.personal.passportADD", select: "data", },
            { path: "documents.academic.secondarySchool", select: "data", },
            { path: "documents.academic.plus2", select: "data", },
            { path: "documents.academic.degree", select: "data", },
            { path: "documents.academic.bachelors.transcripts", select: "data", },
            { path: "documents.academic.bachelors.bonafide", select: "data", },
            { path: "documents.academic.bachelors.CMM", select: "data", },
            { path: "documents.academic.bachelors.PCM", select: "data", },
            { path: "documents.academic.bachelors.OD", select: "data", },
            { path: "documents.academic.masters.transcripts", select: "data", },
            { path: "documents.academic.masters.bonafide", select: "data", },
            { path: "documents.academic.masters.CMM", select: "data", },
            { path: "documents.academic.masters.PCM", select: "data", },
            { path: "documents.academic.masters.OD", select: "data", },
            { path: "documents.test.general", select: "data", },
            { path: "documents.test.languageProf", select: "data", },
            { path: "documents.workExperiences", select: "data", },]),
    ])
    return ({ statusCode: 200, message: `Document added to ${fieldPath}`, data: { docs: req.user.documents } });
})
export const deleteUploadedInProfile = errorWrapper(async (req, res, next, session) => {
    const { error, value } = uploadInProfileSchema.validate(req.body)
    if (error) return { statusCode: 400, data: [value], message: error.details[0].message };
    const { fieldPath, documentId } = value;
    const existingDoc = await Document.findById(documentId);
    if (!existingDoc) return { statusCode: 400, data: null, message: `Document not found` };
    if (existingDoc.user.toString() !== req.user._id.toString()) return { statusCode: 400, data: null, message: `Unauthorized to delete this document` };
    const fields = fieldPath.split(".")
    switch (fields[0]) {
        case "personal":
            req.user.documents.personal[fields[1]] = null
            break;
        case "academic":
            (fields[1] == "bachelors" || fields[1] == "masters") ? req.user.documents.academic[fields[1]][fields[2]] = null : req.user.documents.academic[fields[1]] = null
            break;
        case "test":
            req.user.documents.test[fields[1]] = req.user.documents.test[fields[1]].filter(doc => doc._id.toString() !== documentId)
            break;
        case "workExperiences":
            req.user.documents.workExperiences = req.user.documents.workExperiences.filter(doc => doc._id.toString() !== documentId)
            break;
        default:
            break;
    }
    req.user.logs.push({ logs: { action: `document deleted`, details: `path:${fieldPath}` } })
    await req.user.save()
    await Promise.all([
        await Document.findByIdAndDelete(documentId),
        await deleteFileInWorkDrive(existingDoc.data.resource_id),
        await Document.populate(req.user,
            [{ path: "tests.docId", select: "data", },
            { path: "workExperience.docId", select: "data", },
            { path: "documents.personal.resume", select: "data", },
            { path: "documents.personal.passportBD", select: "data", },
            { path: "documents.personal.passportADD", select: "data", },
            { path: "documents.academic.secondarySchool", select: "data", },
            { path: "documents.academic.plus2", select: "data", },
            { path: "documents.academic.degree", select: "data", },
            { path: "documents.academic.bachelors.transcripts", select: "data", },
            { path: "documents.academic.bachelors.bonafide", select: "data", },
            { path: "documents.academic.bachelors.CMM", select: "data", },
            { path: "documents.academic.bachelors.PCM", select: "data", },
            { path: "documents.academic.bachelors.OD", select: "data", },
            { path: "documents.academic.masters.transcripts", select: "data", },
            { path: "documents.academic.masters.bonafide", select: "data", },
            { path: "documents.academic.masters.CMM", select: "data", },
            { path: "documents.academic.masters.PCM", select: "data", },
            { path: "documents.academic.masters.OD", select: "data", },
            { path: "documents.test.general", select: "data", },
            { path: "documents.test.languageProf", select: "data", },
            { path: "documents.workExperiences", select: "data", },])
    ])
    return { statusCode: 200, message: `Document deleted from ${fieldPath} `, data: req.user.documents };
})
export const requestCounsellor = errorWrapper(async (req, res, next, session) => {
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
        await userModel.populate(alreadyExistButDifferentCountry, { path: "info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" })
        return ({ statusCode: 200, message: `counsellor assigned for multiple countries`, data: { advisor: alreadyExistButDifferentCountry, chat: null } });
    }
    const Counsellor = await getNewAdvisor("counsellor", country);
    await teamModel.findByIdAndUpdate(Counsellor._id, { $push: { students: { profile: req.user._id, stage: "Fresh Lead" } } });
    req.user.advisors.push({ info: Counsellor._id, assignedCountries: [country] })
    const chat = await chatModel.create({ participants: [req.user._id, Counsellor._id] });
    req.user.logs.push({
        action: `${country} counsellor assigned`,
        details: `counsellorId:${Counsellor._id}&country:${country}}`
    })
    sendMail({
        to: Counsellor.email,
        subject: "Student is requesting your service",
        html: `
            <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Document</title>
                    <style>
                        .container {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            padding: 20px;
                        }
                        img {
                            max-width: 200px;
                            margin-bottom: 20px;
                        }
                        h3 {
                            color: #333;
                        }
                        h2 {
                            color: #0073e6;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <img src="https://campusroot.com/static/media/CampusrootLogo.bb6a8db3a579f4910f3f.png" alt="Campusroot Logo" />
                        <h3>Dear ${Counsellor.firstName} ${Counsellor.lastName},</h3>
                        <h2>Student is waiting for your guidance!</h2>
                    </div>
                </body>
            </html>
        `
    });
    await req.user.save()
    await userModel.populate(req.user, { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" })
    await userModel.populate(chat, { path: "participants", select: "firstName lastName displayPicSrc email userType role" });
    const advisor = req.user.advisors.find(ele => ele.info._id.toString() === Counsellor._id.toString());
    return { statusCode: 200, message: `counsellor assigned`, data: { advisor: advisor, chat: chat } };
})
export const addPhoneOrEmail = errorWrapper(async (req, res, next) => {
    const user = await userModel.findById(req.user._id, "otp logs phone email");
    if (!user) return { statusCode: 401, message: `Invalid user`, data: null };
    const { error, value } = loginSchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { email, phoneNumber, countryCode } = value;
    const otp = Math.floor(100000 + Math.random() * 900000), expiry = new Date(new Date().getTime() + 10 * 60000);
    let type = (email) ? "email" : "phone";
    let alreadyExist
    switch (type) {
        case "email":
            alreadyExist = await studentModel.findOne({ email: email, "otp.emailLoginOtp.verified": true });
            if (alreadyExist) return { statusCode: 401, message: `email already exists`, data: null };
            if (user.otp.emailLoginOtp.verified) return { statusCode: 401, message: `email already verified`, data: null };
            user.otp.emailLoginOtp.data = otp
            user.otp.emailLoginOtp.expiry = expiry
            let subject = "OneWindow Ed.tech Pvt. Ltd. - One-Time Password"
            const __dirname = path.dirname(fileURLToPath(import.meta.url));
            const filePath = path.join(__dirname, '../../../static/forgotPassword.html');
            const source = readFileSync(filePath, "utf-8").toString();
            const template = Handlebars.compile(source);
            const emailResponse = await sendMail({ to: email, subject: subject, html: template({ otp: otp }) });
            if (!emailResponse.status) return { statusCode: 500, data: emailResponse, message: "Otp not sent" }
            user.email = email
            break;
        case "phone":
            alreadyExist = await studentModel.findOne({ "phone.number": phoneNumber, "phone.countryCode": countryCode, "otp.phoneLoginOtp.verified": true });
            if (alreadyExist) return { statusCode: 401, message: `phone already exists`, data: null };
            if (user.otp.phoneLoginOtp.verified) return { statusCode: 401, message: `phone already verified`, data: null };
            user.otp.phoneLoginOtp.data = otp
            user.otp.phoneLoginOtp.expiry = expiry
            const smsResponse = countryCode === "+91" ? await sendOTP({ to: countryCode + phoneNumber, otp: otp, region: "Indian" }) : await sendOTP({ name: `${user.firstName} ${user.lastName}`, to: countryCode + phoneNumber, otp: otp, region: "International" });
            if (!smsResponse.return) return { statusCode: 500, data: smsResponse, message: "Otp not sent" }
            user.phone = { countryCode: countryCode, number: phoneNumber }
            break;
    }
    user.logs.push({ action: `otp sent for verification`, details: `` })
    user.save()
    return { statusCode: 200, message: `otp sent for verification, verify before expiry`, data: { expiry: expiry } };
}

);

export const verifyStudentOTP = errorWrapper(async (req, res, next, session) => {
    const { error, value } = Joi.object({ type: Joi.string().required(), otp: Joi.string().required() }).validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { otp, type } = value;
    let token = (type == "email") ? "emailLoginOtp" : "phoneLoginOtp";
    let user = await userModel.findById(req.user._id).session(session);
    if (!user) return { statusCode: 401, message: `Invalid ${type}. Please try again`, data: null };
    if (user.otp[token]["data"] !== otp) return { statusCode: 400, data: null, message: "invalid otp" }
    if (new Date() > new Date(user.otp[token]["expiry"])) return { statusCode: 400, data: null, message: "otp expired, generate again" }
    user.otp[token]["data"] = null
    user.otp[token]["verified"] = true
    let missingFields = [];
    if (!user?.firstName || !user?.lastName) missingFields.push("name");
    if (!user?.email) missingFields.push("email");
    if (!user?.phone || !user?.phone?.number || !user?.phone?.countryCode) missingFields.push("phone");
    if (!user?.preference || !user?.preference?.country || user.preference.country.length === 0) missingFields.push("country");
    if (!user?.preference || !user?.preference?.courses || user.preference.courses.length === 0) missingFields.push("coursePreference");
    if (JSON.stringify(user.education) === JSON.stringify({ school: {}, plus2: {}, underGraduation: {}, postGraduation: {} })) missingFields.push("education");
    if (!user?.tests || user.tests.length === 0) missingFields.push("tests");
    user.logs.push({ action: `${type} verified` })
    await user.save({ session })
    return { statusCode: 200, message: `verification Successful`, data: { missingFields: missingFields, [token]: user.otp[token] } };
})
export const IEH = errorWrapper(async (req, res, next, session) => {
    const { error, value } = Joi.object({ institutionId: Joi.string(), verificationDocName: Joi.string() }).validate(req.body)
    if (error) {
        unlinkSync(req.file.path ? req.file.path : "");
        return { statusCode: 400, message: error.details[0].message, data: [value] };
    }
    const { institutionId, verificationDocName } = value;
    const institution = await institutionModel.findById(institutionId)
    if (!institution) {
        unlinkSync(req.file.path ? req.file.path : "");
        return { statusCode: 400, message: `invalid institutionId`, data: { institutionId: institutionId } }
    }
    if (!institution.IEH.exists) {
        unlinkSync(req.file.path ? req.file.path : "");
        return { statusCode: 400, message: `this institution doesn't have IEH`, data: { institutionId: institutionId } }
    }
    if (req.user.IEH.verifiedAccess) {
        unlinkSync(req.file.path ? req.file.path : "");
        return { statusCode: 400, message: `already verified`, data: { institutionId: institutionId } }
    }
    // if (req.user.IEH.verificationStatus === "Verification Request Initiated") return { statusCode: 400, message: `already verified`, data: { institutionId: institutionId } }
    let IEH = {
        institution: institutionId,
        verificationStatus: "Verification Request Initiated",
        verificationDocName: verificationDocName,
        verificationDocument: ""
    }
    const uploadedFileResponse = await uploadFileToWorkDrive({ originalname: req.file.originalname, path: req.file.path, mimetype: req.file.mimetype, fileIdentifier: fileIdentifier || "", folder_ID: req.user.docData.folder })
    if (!uploadedFileResponse.success) return { statusCode: 500, message: uploadedFileResponse.message, data: uploadedFileResponse.data }
    if (!uploadedFileResponse.data.new) {
        const { FileName, resource_id, mimetype, originalname, preview_url } = uploadedFileResponse.data
        const docDetails = { data: { FileName, resource_id, mimetype, originalname, fileIdentifier, preview_url }, user: req.user._id, type: "General", viewers: [] };
        const newDoc = await Document.create(docDetails);
        IEH.verificationDocument = newDoc._id
    }

    req.user.IEH = IEH
    req.user.logs.push({
        action: `IEH updated`,
        details: `institutionId:${institutionId}`
    })
    await req.user.save()
    await institutionModel.populate(req.user, { path: "IEH.institution", select: "InstitutionName IEH.logoSrc IEH.members InstitutionType university" })
    return { statusCode: 200, message: `IEH updated`, data: { IEH: req.user.IEH } };
})
