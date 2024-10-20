import { errorWrapper } from "../../middleware/errorWrapper.js";
import 'dotenv/config'
import { readFileSync } from "fs";
import Handlebars from "handlebars";
import userModel from "../../models/User.js";
import sendMail from "../../utils/sendEMAIL.js";
import path from 'path';
import { cookieOptions } from "../../index.js";
import Joi from "joi";
import { loginSchema, OTPVerificationSchema } from "../../schemas/student.js";
import { deleteTokens, generateTokens } from "../../utils/redisTokens.js";
import { sendWAOTP } from "../../utils/sendSMS.js";
import { fileURLToPath } from "url";
import { getNewAdvisor } from "../../utils/dbHelperFunctions.js";
import leadsModel from "../../models/leads.js";
import { teamModel } from "../../models/Team.js";
import chatModel from "../../models/Chat.js";
import { studentModel } from "../../models/Student.js";
import { createFolder } from "../../utils/CRMintegrations.js";
// export const Login = errorWrapper(async (req, res, next, session) => {
//     const { error, value } = loginSchema.validate(req.body)
//     if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
//     const { email, password, phoneNumber, countryCode, DeviceToken } = value;
//     let user;
//     if (email && password) {
//         // Find user by email if email and password exist
//         user = await userModel.findOne({ email: email }).session(session);
//         if (!user) return { statusCode: 401, message: `Invalid email ID. Please try again`, data: null };
//         if (!user.password) return { statusCode: 401, message: `Login with Google`, data: null };
//         // Validate password
//         const isPasswordValid = await bcrypt.compare(password, user.password);
//         if (!isPasswordValid) {
//             if (user.failedLoginAttempts > 2) {
//                 user.nextLoginTime = new Date();
//                 user.nextLoginTime.setTime(user.nextLoginTime.getTime() + (20 * 60 * 1000)); // Adding 20 minutes
//                 await user.save({ session });
//                 return { statusCode: 401, message: `Account locked. Please try after 20 min.`, data: null };
//             }
//             user.failedLoginAttempts++;
//             await user.save({ session });
//             return { statusCode: 401, message: `Invalid Password. Please try again`, data: null };
//         }
//     } else if (phoneNumber && countryCode) {
//         // Find user by phoneNumber and countryCode if they exist
//         user = await userModel.findOne({ "phone.number": phoneNumber, "phone.countryCode": countryCode });
//         if (!user) {
//             let student = await studentModel.create({ "phone.number": phoneNumber, "phone.countryCode": countryCode })
//             const otp = Math.floor(100000 + Math.random() * 900000), expiry = new Date(new Date().getTime() + 5 * 60000);
//             student.phoneLoginOtp = { data: otp, expiry: expiry, }
//             const verification = [
//                 { type: "email", status: false, token: { data: null, expiry: new Date() } },
//                 { type: "phone", status: false, token: { data: null, expiry: new Date() } }
//             ];
//             student.verification = verification
//             student.suggestedPackages = [process.env.DEFAULT_SUGGESTED_PACKAGE_MONGOID]  // adding suggested package by default
//             const RSA = await getNewAdvisor("remoteStudentAdvisor");
//             const leadObject = await leadsModel.create({
//                 queryDescription: "Registration initiated",
//                 student: student._id,
//                 remoteStudentAdvisor: RSA._id,
//                 leadSource: "WebSite Visit",
//                 leadStatus: [{ status: "New Lead" }],
//                 leadRating: "medium priority",
//                 logs: [{ action: "lead Initiated" }]
//             });


//             await teamModel.findByIdAndUpdate(RSA._id, { $push: { leads: leadObject._id } });
//             await chatModel.create([{ participants: [student._id, RSA._id] }]);
//             student.advisors.push({ info: RSA._id, assignedCountries: [] });
//             const doc = await createFolder(student._id, process.env.DEFAULT_STUDENT_PARENTID_FOLDER_ZOHO)
//             student.docData = {
//                 folder: doc.id,
//                 name: doc.attributes.name,
//                 parent: doc.attributes.parent_id,
//                 download_url: doc.attributes.download_url,
//                 modified_by_zuid: doc.attributes.modified_by_zuid
//             }
//             const smsResponse = await sendWAOTP({ to: student.phone.countryCode + student.phone.number, otp: otp, region: "International" });
//             if (!smsResponse.return) return { statusCode: 500, data: smsResponse, message: "Otp not sent" }

//             student.logs.push({ action: `OTP sent for registration`, details: `` });
//             await student.save();
//             return ({ statusCode: 200, message: `otp sent for registration, verify before expiry`, data: { expiry: expiry } });
//         }
//         const otp = Math.floor(100000 + Math.random() * 900000), expiry = new Date(new Date().getTime() + 5 * 60000);
//         user.phoneLoginOtp = { data: otp, expiry: expiry, }
//         const smsResponse = await sendWAOTP({ to: user.phone.countryCode + user.phone.number, otp: otp, region: "International" });
//         if (!smsResponse.return) return { statusCode: 500, data: smsResponse, message: "Otp not sent" }
//         user.logs.push({
//             action: `otp sent for login`,
//             details: ``
//         })
//         await user.save({ session })
//         return ({ statusCode: 200, message: `otp sent for login, verify before expiry`, data: { expiry: expiry } });
//     } else return { statusCode: 400, message: `Invalid request. Provide either email/password or phoneNumber/countryCode`, data: null };
//     const { newAccessToken, newRefreshToken } = await generateTokens(user._id, req.headers['user-agent'], DeviceToken)
//     user.failedLoginAttempts = 0
//     user.logs.push({ action: "Logged In" })
//     await user.save({ session })
//     let missingFields = []
//     if (user.userType === "student") {
//         if (!user?.phone?.countryCode && !user?.phone?.number) missingFields.push("phone");
//         if (!user?.preference?.country) missingFields.push("country");
//         if (!user?.preference?.courses) missingFields.push("coursePreference");
//         if (!user?.education || Object.keys(user.education).length < 1) missingFields.push("education");
//         if (!user?.tests || user.tests.length < 1) missingFields.push("tests");
//     }
//     res.cookie("CampusRoot_Refresh", newRefreshToken, cookieOptions).cookie("CampusRoot_Email", email, cookieOptions)
//     req.AccessToken = newAccessToken;
//     return { statusCode: 200, message: `Login Successful`, data: { AccessToken: newAccessToken, role: user.role || user.userType, missingFields: missingFields } }
// });
export const Login = errorWrapper(async (req, res, next) => {
    const { error, value } = loginSchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { email, phoneNumber, countryCode } = value;
    const otp = Math.floor(100000 + Math.random() * 900000), expiry = new Date(new Date().getTime() + 10 * 60000);
    let user, finder, type
    if (email) {
        finder = { email: email }
        type = "emailLoginOtp"
    }
    else if (phoneNumber && countryCode) {
        finder = { "phone.number": phoneNumber, "phone.countryCode": countryCode }
        type = "phoneLoginOtp"
    }
    user = await userModel.findOne(finder);
    switch (type) {
        case "emailLoginOtp":
            let subject = "OneWindow Ed.tech Pvt. Ltd. - One-Time Password"
            const __dirname = path.dirname(fileURLToPath(import.meta.url));
            const filePath = path.join(__dirname, '../../../static/forgotPassword.html');
            const source = readFileSync(filePath, "utf-8").toString();
            const template = Handlebars.compile(source);
            const emailResponse = await sendMail({ to: email, subject: subject, html: template({ otp: otp }) });
            if (!emailResponse.status) return { statusCode: 500, data: emailResponse, message: "Otp not sent" }
            break;
        case "phoneLoginOtp":
            const smsResponse = await sendWAOTP({ to: countryCode + phoneNumber, otp: otp, region: "International" });
            if (!smsResponse.return) return { statusCode: 500, data: smsResponse, message: "Otp not sent" }
            break;
    }
    if (!user) {
        user = await studentModel.create(finder)
        user.suggestedPackages = [process.env.DEFAULT_SUGGESTED_PACKAGE_MONGOID]
        const RSA = await getNewAdvisor("remoteStudentAdvisor");
        const leadObject = await leadsModel.create({
            queryDescription: "Registration initiated",
            student: user._id,
            remoteStudentAdvisor: RSA._id,
            leadSource: "WebSite Visit",
            leadStatus: [{ status: "New Lead" }],
            leadRating: "medium priority",
            logs: [{ action: "lead Initiated" }]
        });
        await teamModel.findByIdAndUpdate(RSA._id, { $push: { leads: leadObject._id } });
        await chatModel.create([{ participants: [user._id, RSA._id] }]);
        user.advisors.push({ info: RSA._id, assignedCountries: [] });
        const doc = await createFolder(user._id, process.env.DEFAULT_STUDENT_PARENTID_FOLDER_ZOHO)
        user.docData = {
            folder: doc.id,
            name: doc.attributes.name,
            parent: doc.attributes.parent_id,
            download_url: doc.attributes.download_url,
            modified_by_zuid: doc.attributes.modified_by_zuid
        }
    }
    user.otp[type].data = otp
    user.otp[type].expiry = expiry
    user.logs.push({ action: `otp sent for login`, details: `` })
    await user.save()
    return ({ statusCode: 200, message: `otp sent for login, verify before expiry`, data: { expiry: expiry } });
}

);
export const TeamLogin = errorWrapper(async (req, res, next) => {
    const { error, value } = Joi.object({ email: Joi.string().required() }).validate(req.body);
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { email } = value;
    const user = await userModel.findOne({ email: email });
    if (!user) return { statusCode: 401, message: `Invalid email ID. Please try again using valid email`, data: null };
    const otp = Math.floor(100000 + Math.random() * 900000), expiry = new Date(new Date().getTime() + 10 * 60000);
    let subject = "OneWindow Ed.tech Pvt. Ltd. - One-Time Password"
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.join(__dirname, '../../../static/forgotPassword.html');
    const source = readFileSync(filePath, "utf-8").toString();
    const template = Handlebars.compile(source);
    const emailResponse = await sendMail({ to: email, subject: subject, html: template({ otp: otp }) });
    if (!emailResponse.status) return { statusCode: 500, data: emailResponse, message: "Otp not sent" }
    user.otp.emailLoginOtp.data = otp 
    user.otp.emailLoginOtp.expiry = expiry
    user.logs.push({ action: `otp sent for login`, details: `` })
    await user.save()
    return { statusCode: 200, message: `otp sent for login, verify before expiry`, data: { expiry: expiry } };
});
export const verifyStudentLoginOTP = errorWrapper(async (req, res, next, session) => {
    const { error, value } = OTPVerificationSchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { countryCode, phoneNumber, otp, DeviceToken, type, email } = value;
    let finder, token
    switch (type) {
        case "email":
            finder = { email: email }
            token = "emailLoginOtp"
            break;
        case "phone":
            finder = { "phone.number": phoneNumber, "phone.countryCode": countryCode }
            token = "phoneLoginOtp"
            break;
        default: return { statusCode: 401, message: `Invalid type. Please try again`, data: null };
    }
    let user = await userModel.findOne(finder).session(session);
    if (!user) return { statusCode: 401, message: `Invalid ${type}. Please try again`, data: null };
    if (user.otp[token]["data"] !== otp) return { statusCode: 400, data: null, message: "invalid otp" }
    if (new Date() > new Date(user.otp[token]["expiry"])) return { statusCode: 400, data: null, message: "otp expired, generate again" }
    user.otp[token]["data"] = null
    user.otp[token]["verified"] = true
    let missingFields = [];
    if (user.userType === "student") {
        if (!user?.firstName || !user?.lastName) missingFields.push("name");
        if (!user?.email) missingFields.push("email");
        if (!user?.phone || !user?.phone?.number || !user?.phone?.countryCode) missingFields.push("phone");
        if (!user?.preference || !user?.preference?.country || user.preference.country.length === 0) missingFields.push("country");
        if (!user?.preference || !user?.preference?.courses || user.preference.courses.length === 0) missingFields.push("coursePreference");
        if (JSON.stringify(user.education) === JSON.stringify({ school: {}, plus2: {}, underGraduation: {}, postGraduation: {} })) missingFields.push("education");
        if (!user?.tests || user.tests.length === 0) missingFields.push("tests");
    }
    const { newAccessToken, newRefreshToken } = await generateTokens(user._id, req.headers['user-agent'], DeviceToken)
    user.failedLoginAttempts = 0
    user.logs.push({ action: "Logged In" })
    await user.save({ session })
    res.cookie("CampusRoot_Refresh", newRefreshToken, cookieOptions)
    req.AccessToken = newAccessToken;
    return { statusCode: 200, message: `Login Successful`, data: { AccessToken: newAccessToken, role: user.role || user.userType, missingFields: missingFields } }
})

// export const forgotPassword = errorWrapper(async (req, res, next, session) => {
//     const { error, value } = Joi.object({ email: Joi.string().required() }).validate(req.body);
//     if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
//     const { email } = value;
//     const user = await userModel.findOne({ email: email })
//     if (!user) return { statusCode: 400, message: `invalid email. Please Register`, data: null }
//     if (!user.password) return { statusCode: 400, message: `Login with Oauth`, data: null }
//     const otp = Math.random().toString().substr(2, 4)
//     let subject = "CAMPUSROOT Ed.tech Pvt. Ltd. - One-Time Password"
//     const __dirname = path.dirname(fileURLToPath(import.meta.url));
//     const filePath = path.join(__dirname, '../../../static/forgotPassword.html');
//     const source = fs.readFileSync(filePath, "utf-8").toString();
//     const template = Handlebars.compile(source);
//     const replacement = { otp: otp }
//     const htmlToSend = template(replacement)
//     await sendMail({ to: email, subject: subject, html: htmlToSend });
//     const hashed = await bcrypt.hash(otp, 12)
//     user.otp = hashed
//     user.logs.push({
//         action: "forgot password",
//         details: "Generated Otp and sent to email for verification"
//     })
//     await user.save()
//     return { statusCode: 200, message: 'otp sent to email', data: null };
// })
// export const verifyOtp = errorWrapper(async (req, res, next, session) => {
//     const { error, value } = Joi.object({
//         email: Joi.string().required(),
//         otp: Joi.string().required(),
//         password: Joi.string().required(),
//     }).validate(req.body)
//     if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
//     const { email, otp, password } = value;
//     const user = await userModel.findOne({ email: email })
//     if (!user) return { statusCode: 401, message: `invalid email. Please Register`, data: null }
//     const verification = await bcrypt.compare(otp, user.otp)
//     if (!verification) return { statusCode: 400, message: `Invalid otp`, data: null }
//     user.password = await bcrypt.hash(password, 12)
//     user.logs.push({ action: "forgot password", details: "Verified Otp and new password updated" })
//     await user.save()
//     return { statusCode: 200, message: `Password Updated Successfully`, data: null }
// });
export const Logout = errorWrapper(async (req, res, next, session) => {
    const source = req.headers['user-agent'];
    const logoutAll = req.body.logoutAll;
    (logoutAll) ? await deleteTokens(req.user._id, false) : await deleteTokens(req.user._id, source)
    return { statusCode: 200, message: `Logged Out Successfully`, data: null };
})