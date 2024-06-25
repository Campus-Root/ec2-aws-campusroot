import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import 'dotenv/config'
import fs from "fs";
import Handlebars from "handlebars";
import userModel from "../../models/User.js";
import sendMail from "../../utils/sendEMAIL.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { cookieOptions } from "../../index.js";
const ACCESS_SECRET = process.env.ACCESS_SECRET
const REFRESH_SECRET = process.env.REFRESH_SECRET


export const Login = errorWrapper(async (req, res, next) => {
    const { email, password, DeviceToken } = req.body
    if (!email || !password) return next(generateAPIError(`Incomplete details`, 400));
    const user = await userModel.findOne({ email: email })
    if (!user) return next(generateAPIError("Invalid credentials. Please try again", 401));
    if (!user.password) return next(generateAPIError("Login with Google", 401));
    // if (user.nextLoginTime > new Date()) return next(generateAPIError(`Account locked. Please try after ${Math.ceil((user.nextLoginTime - new Date()) / (1000 * 60))} min.`, 401));
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        if (user.failedLoginAttempts > 2) {
            user.nextLoginTime = new Date();
            user.nextLoginTime.setTime(user.nextLoginTime.getTime() + (20 * 60 * 1000)); // Adding 20 minutes
            await user.save();
            return next(generateAPIError('Account locked. Please try after 20 min.', 401));
        }
        user.failedLoginAttempts++;
        user.nextLoginTime = new Date();
        user.nextLoginTime.setTime(user.nextLoginTime.getTime() + (20 * 60 * 1000)); // Adding 20 minutes
        await user.save();
        return next(generateAPIError("Invalid credentials. Please try again", 401));
    }
    let AccessToken = jwt.sign({ id: user._id }, ACCESS_SECRET, { expiresIn: "1h" })
    let RefreshToken = jwt.sign({ id: user._id }, REFRESH_SECRET, { expiresIn: "1m" })
    const source = req.headers['user-agent'];
    let token = user.tokens.find(token => token.source === source);
    let newToken = {
        AccessToken: AccessToken,
        RefreshToken: RefreshToken,
        source: source
    }
    if (token) {
        token.AccessToken = AccessToken;
        token.RefreshToken = RefreshToken;
    } else {
        if (DeviceToken) newToken.DeviceToken = DeviceToken;
        user.tokens.push(newToken);
    }
    user.failedLoginAttempts = 0
    user.logs.push({ action: "Logged In" })
    await user.save()
    return res.cookie("CampusRoot_Refresh", RefreshToken, cookieOptions).cookie("CampusRoot_Email", email, cookieOptions).status(200).json({
        success: true, message: "Login Successful", data: {
            AccessToken,
            role: user.role || user.userType
        }
    });
});

export const forgotPassword = errorWrapper(async (req, res, next) => {
    const { email } = req.body
    if (!email) return next(generateAPIError(`Incomplete details`, 400))
    const user = await userModel.findOne({ email: email })
    if (!user) return next(generateAPIError(`invalid email. Please Register`, 400))
    if (!user.password) return next(generateAPIError(`please try social authentication`, 400))
    const otp = Math.random().toString().substr(2, 4)
    let subject = "CAMPUSROOT Ed.tech Pvt. Ltd. - One-Time Password"
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.join(__dirname, '../../../static/forgotPassword.html');
    const source = fs.readFileSync(filePath, "utf-8").toString();
    const template = Handlebars.compile(source)
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
    return res.status(200).json({ success: true, message: "otp sent to email", data: null });
})
export const verifyOtp = errorWrapper(async (req, res, next) => {
    const { email, otp, password } = req.body
    if (!email) return next(generateAPIError(`Incomplete email`, 400))
    if (!otp) return next(generateAPIError(`Incomplete otp`, 400))
    if (!password) return next(generateAPIError(`Incomplete password`, 400))
    const user = await userModel.findOne({ email: email })
    if (!user) return next(generateAPIError(`invalid email. Please Register`, 401))
    const verification = await bcrypt.compare(otp, user.otp)
    if (!verification) return next(generateAPIError(`Invalid otp`, 400))
    user.password = await bcrypt.hash(password, 12)
    user.logs.push({
        action: "forgot password",
        details: "Verified Otp and new password updated"
    })
    await user.save()
    return res.status(200).json({ success: true, message: `Password Updated Successfully`, data: null })
});


export const Logout = errorWrapper(async (req, res, next) => {
    const user = await userModel.findById(req.user._id, "logs tokens")
    const source = req.headers['user-agent'];
    const logoutAll = req.body.logoutAll
    if (logoutAll) {
        user.tokens = []; // Clear all tokens
        user.logs.push({
            action: "logged out",
            details: "All devices"
        });
        await user.save();
        return res.status(200).json({ success: true, message: `Logged Out from All Devices Successfully`, data: null });
    } else {
        user.tokens = user.tokens.filter(token => token.source !== source);
        user.logs.push({
            action: "logged out",
            details: `Device: ${source}`
        });
        await user.save();
        return res.status(200).json({ success: true, message: `Logged Out Successfully`, data: null })
    }
})