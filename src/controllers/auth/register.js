import { studentModel } from "../../models/Student.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import 'dotenv/config';
import { teamModel } from "../../models/Team.js";
import sendMail from "../../utils/sendEMAIL.js";
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import chatModel from "../../models/Chat.js";
import fs from "fs"
import Handlebars from "handlebars";
import path from "path";
import { fileURLToPath } from "url";
import { jwtDecode } from "jwt-decode";

const ACCESS_SECRET = process.env.ACCESS_SECRET
const REFRESH_SECRET = process.env.REFRESH_SECRET

export const StudentRegister = errorWrapper(async (req, res, next) => {
    const { name, email, password, displayPicSrc } = req.body;
    if (!password || !email || !name) return next(generateAPIError(`Incomplete details`, 400));
    const alreadyExists = await studentModel.findOne({ email: email });
    if (alreadyExists) return next(generateAPIError(`Email already registered`, 400));
    const student = new studentModel({ name, email, password: await bcrypt.hash(password, 12), displayPicSrc });
    const Counsellors = await teamModel.aggregate([{ $match: { role: "counsellor" } }, { $project: { _id: 1, students: 1, students: { $size: "$students" } } }, { $sort: { students: 1 } }, { $limit: 1 }]);
    student.counsellor = Counsellors[0]._id;
    const Counsellor = await teamModel.findById(Counsellors[0]._id);
    await student.save()
    Counsellor.students.push({ profile: student._id, stage: "Fresh Lead" });
    student.emailVerificationString = (Math.random() + 1).toString(16).substring(2);
    let subject = "Confirm Your Email to Activate Your CampusRoot Account"
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.join(__dirname, '../../../static/emailTemplate.html');
    const source = fs.readFileSync(filePath, "utf-8").toString();
    const template = Handlebars.compile(source)
    const replacement = { userName: name, URL: `${process.env.SERVER_URL}/api/v1/auth/verify/${email}/${student.emailVerificationString}` }
    const htmlToSend = template(replacement)
    await sendMail({ to: email, subject: subject, html: htmlToSend });
    student.logs.push({
        action: "Registration Done",
        details: "traditional registration done"
    })
    await student.save();
    await Counsellor.save();
    await chatModel.create({ participants: [student._id, student.counsellor] });
    let AccessToken = jwt.sign({ id: student._id }, ACCESS_SECRET, { expiresIn: "1h" });
    let RefreshToken = jwt.sign({ id: student._id }, REFRESH_SECRET, { expiresIn: "1y" });
    res.cookie("CampusRoot_Refresh", RefreshToken, { sameSite: 'none', secure: true, }).cookie("CampusRoot_Email", email, { sameSite: 'none', secure: true, });
    return res.status(200).json({ success: true, message: `student registration successful`, data: { AccessToken, role: student.role || student.userType } });
});
export const verifyEmail = errorWrapper(async (req, res, next) => {
    const { email, emailVerificationString } = req.params;
    const user = await studentModel.findOne({ email: email });
    if (!user) return res.redirect(`${process.env.STUDENT_URL}/email-verification/?success=false`);
    if (user.emailVerificationString !== emailVerificationString) return res.redirect(`${process.env.STUDENT_URL}/email-verification/?success=false`);
    if (user.emailVerified) return res.redirect(`${process.env.STUDENT_URL}/email-verification/?success=false&info=alreadyVerified`);
    user.emailVerified = true;
    user.logs.push({
        action: "Email verified",
        details: "Email Verification Successful"
    })
    await user.save()
    let subject = "CAMPUSROOT Ed.tech Pvt. Ltd. - Verification Successful"
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.join(__dirname, '../../../static/emailTemplate.html');
    const source = fs.readFileSync(filePath, "utf-8").toString();
    const template = Handlebars.compile(source)
    const replacement = { userName: user.name }
    const htmlToSend = template(replacement)
    await sendMail({ to: email, subject: subject, html: htmlToSend });
    return res.redirect(`${process.env.STUDENT_URL}/email-verification/?success=true`);
});
export const TeamRegister = errorWrapper(async (req, res, next) => {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password || !role) return next(generateAPIError(`Incomplete details`, 400));
    const alreadyExists = await teamModel.findOne({ email: email });
    if (alreadyExists) return next(generateAPIError(`Email Already Registered`, 400));
    const user = await teamModel.create({ email, name, password: await bcrypt.hash(password, 12), role });
    let AccessToken = jwt.sign({ id: user._id }, ACCESS_SECRET, { expiresIn: "1h" });
    let RefreshToken = jwt.sign({ id: user._id }, REFRESH_SECRET, { expiresIn: "1y" });
    user.logs.push({
        action: `${role} Registration done`,
        details: `traditional registration done`
    })
    await user.save();
    res.cookie("CampusRoot_Refresh", RefreshToken,).cookie("CampusRoot_Email", email, { sameSite: 'none', secure: true });
    return res.status(200).json({ success: true, message: `${role} Registration successful`, data: { email, name, role }, AccessToken: req.AccessToken ? req.AccessToken : null });
});

export const googleLogin = errorWrapper(async (req, res, next) => {
    if (!req.body.credential) return next("credential undefined", 400)
    try {
        const { name, email, picture, email_verified, sub } = jwtDecode(req.body.credential)
        const teamMember = await teamModel.findOne({ email: email })
        if (teamMember) return res.redirect(`${process.env.STUDENT_URL}/team`)
        let student = await studentModel.findOne({ email: email });
        if (student) {
            if (student.google && student.google.id) {
                let AccessToken = jwt.sign({ id: student._id }, ACCESS_SECRET, { expiresIn: "1h" });
                let RefreshToken = jwt.sign({ id: student._id }, REFRESH_SECRET, { expiresIn: "1y" });
                student.logs.push({ action: `Logged in using Google auth` });
                await student.save();
                res.cookie("CampusRoot_Refresh", RefreshToken, { sameSite: 'none', secure: true }).cookie("CampusRoot_Email", email, { sameSite: 'none', secure: true });
                return res.status(200).json({ success: true, message: `Google Authentication Successful`, data: { AccessToken, role: student.userType } });
            } else {
                // student.name = name;
                student.displayPicSrc = picture;
                student.google = { id: sub };
                if (email_verified) student.emailVerified = email_verified;
                student.logs.push({ action: `Logged in using Google auth. displayPicSrc and email details updated` });
                await student.save();
                let AccessToken = jwt.sign({ id: student._id }, ACCESS_SECRET, { expiresIn: "1h" });
                let RefreshToken = jwt.sign({ id: student._id }, REFRESH_SECRET, { expiresIn: "1y" });
                res.cookie("CampusRoot_Refresh", RefreshToken, { sameSite: 'none', secure: true }).cookie("CampusRoot_Email", email, { sameSite: 'none', secure: true });
                return res.status(200).json({ success: true, message: `Google Authentication Successful`, data: { AccessToken, role: student.userType } });
            }
        } else {
            student = await studentModel.create({ name: name, email: email, displayPicSrc: picture, google: { id: sub }, emailVerified: email_verified });
            if (!email_verified) {
                student.emailVerificationString = (Math.random() + 1).toString(16).substring(2);
                let subject = "Confirm Your Email to Activate Your CampusRoot Account";
                const __dirname = path.dirname(fileURLToPath(import.meta.url));
                const filePath = path.join(__dirname, '../../../static/emailTemplate.html');
                const source = fs.readFileSync(filePath, "utf-8").toString();
                const template = Handlebars.compile(source);
                const replacement = { userName: name, URL: `${process.env.SERVER_URL}/api/v1/auth/verify/${email}/${student.emailVerificationString}` };
                const htmlToSend = template(replacement);
                await sendMail({ to: email, subject: subject, html: htmlToSend });
            }
            const Counsellors = await teamModel.aggregate([{ $match: { role: "counsellor" } }, { $project: { _id: 1, students: 1, students: { $size: "$students" } } }, { $sort: { students: 1 } }, { $limit: 1 }]);
            student.counsellor = Counsellors[0]._id;
            const Counsellor = await teamModel.findById(Counsellors[0]._id);
            Counsellor.students.push({ profile: student._id, stage: "Fresh Lead" });
            await Counsellor.save();
            student.logs.push({ action: `Registered in using Google auth`, details: `Social registration done` });
            await student.save();
            await chatModel.create({ participants: [student._id, student.counsellor] });
            let AccessToken = jwt.sign({ id: student._id }, ACCESS_SECRET, { expiresIn: "1h" });
            let RefreshToken = jwt.sign({ id: student._id }, REFRESH_SECRET, { expiresIn: "1y" });
            res.cookie("CampusRoot_Refresh", RefreshToken, { sameSite: 'none', secure: true }).cookie("CampusRoot_Email", email, { sameSite: 'none', secure: true });
            return res.status(200).json({ success: true, message: `Google Registration Successful`, data: { AccessToken, role: student.userType } });
        }
    }
    catch (error) { return next(generateAPIError(error.message, 400)) }
})
