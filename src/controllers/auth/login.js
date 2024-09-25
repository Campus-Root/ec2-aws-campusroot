import { errorWrapper } from "../../middleware/errorWrapper.js";
import bcrypt from "bcrypt"
import 'dotenv/config'
import fs from "fs";
import Handlebars from "handlebars";
import userModel from "../../models/User.js";
import sendMail from "../../utils/sendEMAIL.js";
import path from 'path';
import { cookieOptions } from "../../index.js";
import Joi from "joi";
import { loginSchema } from "../../schemas/student.js";
import { deleteTokens, generateTokens } from "../../utils/redisTokens.js";
import { sendOTP } from "../../utils/sendSMS.js";
import { fileURLToPath } from "url";
import { getNewAdvisor } from "../../utils/dbHelperFunctions.js";
import leadsModel from "../../models/leads.js";
import { teamModel } from "../../models/Team.js";
import chatModel from "../../models/Chat.js";
export const Login = errorWrapper(async (req, res, next, session) => {
    const { error, value } = loginSchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { email, password, phoneNumber, countryCode, DeviceToken } = value;
    let user;
    if (email && password) {
        // Find user by email if email and password exist
        user = await userModel.findOne({ email: email }).session(session);
        if (!user) return { statusCode: 401, message: `Invalid email ID. Please try again`, data: null };
        if (!user.password) return { statusCode: 401, message: `Login with Google`, data: null };
        // Validate password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            if (user.failedLoginAttempts > 2) {
                user.nextLoginTime = new Date();
                user.nextLoginTime.setTime(user.nextLoginTime.getTime() + (20 * 60 * 1000)); // Adding 20 minutes
                await user.save({ session });
                return { statusCode: 401, message: `Account locked. Please try after 20 min.`, data: null };
            }
            user.failedLoginAttempts++;
            await user.save({ session });
            return { statusCode: 401, message: `Invalid Password. Please try again`, data: null };
        }
    } else if (phoneNumber && countryCode) {
        // Find user by phoneNumber and countryCode if they exist
        user = await userModel.findOne({ "phone.number": phoneNumber, "phone.countryCode": countryCode }).session(session);
        if (!user) {
            student = await studentModel.create({ "phone.number": phoneNumber, "phone.countryCode": countryCode })
            const otp = Math.floor(100000 + Math.random() * 900000), expiry = new Date(new Date().getTime() + 5 * 60000);
            student.phoneLoginOtp = { data: otp, expiry: expiry, }
            const verification = [{
                type: "email",
                status: false,
                token: { data: null, expiry: new Date() }
            }, {
                type: "phone",
                status: false,
                token: { data: null, expiry: new Date() }
            }]
            student.verification = verification
            student.suggestedPackages = [process.env.DEFAULT_SUGGESTED_PACKAGE_MONGOID]  // adding suggested package by default
            const RSA = await getNewAdvisor("remoteStudentAdvisor");
            const leadObject = await leadsModel.create([{
                queryDescription: "Registration initiated",
                student: student._id,
                remoteStudentAdvisor: RSA._id,
                leadSource: "WebSite Visit",
                leadStatus: [{ status: "New Lead" }],
                leadRating: "medium priority",
                logs: [{ action: "lead Initiated" }]
            }],)
            await teamModel.findByIdAndUpdate(RSA._id, { $push: { leads: leadObject._id } }, { session });
            await chatModel.create({ participants: [student._id, RSA._id] }, { session });
            student.advisors.push({ info: RSA._id, assignedCountries: [] });
            const doc = await createFolder(student._id, process.env.DEFAULT_STUDENT_PARENTID_FOLDER_ZOHO)
            student.docData = {
                folder: doc.id,
                name: doc.attributes.name,
                parent: doc.attributes.parent_id,
                download_url: doc.attributes.download_url,
                modified_by_zuid: doc.attributes.modified_by_zuid
            }
            const smsResponse = await sendOTP({ to: student.phone.countryCode + student.phone.number, otp: otp, region: "International" });
            if (!smsResponse.return) return { statusCode: 500, data: smsResponse, message: "Otp not sent" }

            student.logs.push({
                action: `otp sent for register`,
                details: ``
            })
            await student.save({ session });
            return ({ statusCode: 200, message: `otp sent for registration, verify before expiry`, data: { expiry: expiry } });
        }
        const otp = Math.floor(100000 + Math.random() * 900000), expiry = new Date(new Date().getTime() + 5 * 60000);
        user.phoneLoginOtp = { data: otp, expiry: expiry, }
        const smsResponse = await sendOTP({ to: user.phone.countryCode + user.phone.number, otp: otp, region: "International" });
        if (!smsResponse.return) return { statusCode: 500, data: smsResponse, message: "Otp not sent" }
        user.logs.push({
            action: `otp sent for login`,
            details: ``
        })
        await user.save({ session })
        return ({ statusCode: 200, message: `otp sent for login, verify before expiry`, data: { expiry: expiry } });
    } else return { statusCode: 400, message: `Invalid request. Provide either email/password or phoneNumber/countryCode`, data: null };
    const { newAccessToken, newRefreshToken } = await generateTokens(user._id, req.headers['user-agent'], DeviceToken)
    user.failedLoginAttempts = 0
    user.logs.push({ action: "Logged In" })
    await user.save({ session })
    let missingFields = []
    if (user.userType === "student") {
        if (!user?.phone?.countryCode && !user?.phone?.number) missingFields.push("phone");
        if (!user?.preference?.country) missingFields.push("country");
        if (!user?.preference?.courses) missingFields.push("coursePreference");
        if (!user?.education || Object.keys(user.education).length < 1) missingFields.push("education");
        if (!user?.tests || user.tests.length < 1) missingFields.push("tests");
    }
    res.cookie("CampusRoot_Refresh", newRefreshToken, cookieOptions).cookie("CampusRoot_Email", email, cookieOptions)
    req.AccessToken = newAccessToken;
    return { statusCode: 200, message: `Login Successful`, data: { AccessToken: newAccessToken, role: user.role || user.userType, missingFields: missingFields } }
});
export const verifyStudentLoginOTP = errorWrapper(async (req, res, next, session) => {
    const { error, value } = Joi.object({
        countryCode: Joi.string().required(),
        phoneNumber: Joi.string().required(),
        otp: Joi.string().required(),
        DeviceToken: Joi.string().allow('')
    }).validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { countryCode, phoneNumber, otp, DeviceToken } = value;
    const user = await userModel.findOne({ "phone.number": phoneNumber, "phone.countryCode": countryCode }).session(session);
    if (!user) return { statusCode: 401, message: `Invalid phone number. Please try again`, data: null };
    if (user.phoneLoginOtp.data !== otp) return { statusCode: 400, data: null, message: "invalid otp" }
    if (new Date() > new Date(user.phoneLoginOtp.expiry)) return { statusCode: 400, data: null, message: "otp expired, generate again" }
    if (!user.verification[1].status) {
        user.verification[1].status = true
        user.logs.push({
            action: `otp verification successful`,
            details: ``
        })
    }
    let missingFields = []
    if (!user?.firstName || !user?.lastName) missingFields.push("name");
    if (!user?.email) missingFields.push("email");
    if (!user?.preference?.country) missingFields.push("country");
    if (!user?.preference?.courses) missingFields.push("coursePreference");
    if (!user?.education || Object.keys(user.education).length < 1) missingFields.push("education");
    if (!user?.tests || user.tests.length < 1) missingFields.push("tests");
    const { newAccessToken, newRefreshToken } = await generateTokens(user._id, req.headers['user-agent'], DeviceToken)
    user.failedLoginAttempts = 0
    user.logs.push({ action: "Logged In" })
    user.phoneLoginOtp = {}
    await user.save({ session })
    res.cookie("CampusRoot_Refresh", newRefreshToken, cookieOptions).cookie("CampusRoot_Email", user.email, cookieOptions)
    req.AccessToken = newAccessToken;
    return { statusCode: 200, message: `Login Successful`, data: { AccessToken: newAccessToken, role: user.role || user.userType, missingFields: missingFields } }
})

export const forgotPassword = errorWrapper(async (req, res, next, session) => {
    const { error, value } = Joi.object({ email: Joi.string().required() }).validate(req.body);
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { email } = value;
    const user = await userModel.findOne({ email: email })
    if (!user) return { statusCode: 400, message: `invalid email. Please Register`, data: null }
    if (!user.password) return { statusCode: 400, message: `Login with Oauth`, data: null }
    const otp = Math.random().toString().substr(2, 4)
    let subject = "CAMPUSROOT Ed.tech Pvt. Ltd. - One-Time Password"
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.join(__dirname, '../../../static/forgotPassword.html');
    const source = fs.readFileSync(filePath, "utf-8").toString();
    const template = Handlebars.compile(source);
    const replacement = { otp: otp }
    const htmlToSend = template(replacement)
    await sendMail({ to: email, subject: subject, html: htmlToSend });
    const hashed = await bcrypt.hash(otp, 12)
    user.otp = hashed
    user.logs.push({
        action: "forgot password",
        details: "Generated Otp and sent to email for verification"
    })
    await user.save()
    return { statusCode: 200, message: 'otp sent to email', data: null };
})
export const verifyOtp = errorWrapper(async (req, res, next, session) => {
    const { error, value } = Joi.object({
        email: Joi.string().required(),
        otp: Joi.string().required(),
        password: Joi.string().required(),
    }).validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { email, otp, password } = value;
    const user = await userModel.findOne({ email: email })
    if (!user) return { statusCode: 401, message: `invalid email. Please Register`, data: null }
    const verification = await bcrypt.compare(otp, user.otp)
    if (!verification) return { statusCode: 400, message: `Invalid otp`, data: null }
    user.password = await bcrypt.hash(password, 12)
    user.logs.push({ action: "forgot password", details: "Verified Otp and new password updated" })
    await user.save()
    return { statusCode: 200, message: `Password Updated Successfully`, data: null }
});
export const Logout = errorWrapper(async (req, res, next, session) => {
    const source = req.headers['user-agent'];
    const logoutAll = req.body.logoutAll;
    (logoutAll) ? await deleteTokens(req.user._id, false) : await deleteTokens(req.user._id, source)
    return { statusCode: 200, message: `Logged Out Successfully`, data: null };
})