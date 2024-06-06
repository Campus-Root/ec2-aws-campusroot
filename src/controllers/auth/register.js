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
import { cookieOptions } from "../../index.js";
import { DestinationTypeEnum, LanguageTypeEnum } from "../../utils/enum.js";
const ACCESS_SECRET = process.env.ACCESS_SECRET
const REFRESH_SECRET = process.env.REFRESH_SECRET

export const StudentRegister = errorWrapper(async (req, res, next) => {
    const { firstName, lastName, email, password, displayPicSrc, country, language } = req.body;
    if (!password || !email || !firstName || !lastName) return next(generateAPIError(`Incomplete details`, 400));
    const alreadyExists = await studentModel.findOne({ email: email });
    if (alreadyExists) return next(generateAPIError(`Email already registered`, 400));
    if (!Object.values(DestinationTypeEnum).includes(country)) return next(generateAPIError(`select destination country`, 400));
    if (!Object.values(LanguageTypeEnum).includes(language)) return next(generateAPIError(`select language communication`, 400));
    const student = new studentModel({ firstName, lastName, email, password: await bcrypt.hash(password, 12), displayPicSrc, preference: { country: [country], language: language } });
    const Counsellors = await teamModel.aggregate([{ $match: { role: "counsellor" } }, { $project: { _id: 1, students: 1, students: { $size: "$students" } } }, { $sort: { students: 1 } }, { $limit: 1 }]);
    const Counsellor = await teamModel.findById(Counsellors[0]._id);
    student.advisors.push({ info: Counsellors[0]._id, role: "counsellor" })
    await student.save()
    Counsellor.students.push({ profile: student._id, stage: "Fresh Lead" });
    const verification = [{
        type: "email",
        status: false,
        token: { data: (Math.random() + 1).toString(16).substring(2), expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    }, {
        type: "phone",
        status: false,
        token: { data: null, expiry: new Date() }
    }]
    student.verification = verification
    let subject = "Confirm Your Email to Activate Your CampusRoot Account"
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.join(__dirname, '../../../static/emailTemplate.html');
    const source = fs.readFileSync(filePath, "utf-8").toString();
    const template = Handlebars.compile(source)
    const replacement = { userName: `${firstName} ${lastName}`, URL: `${process.env.SERVER_URL}/api/v1/auth/verify/${email}/${verification[0].token.data}` }
    const htmlToSend = template(replacement)
    await sendMail({ to: email, subject: subject, html: htmlToSend });
    student.logs.push({
        action: "Registration Done",
        details: "traditional registration done"
    })
    let AccessToken = jwt.sign({ id: user._id }, ACCESS_SECRET, { expiresIn: "1h" })
    let RefreshToken = jwt.sign({ id: user._id }, REFRESH_SECRET, { expiresIn: "1y" })
    let token = student.tokens.find(token => token.source === req.headers['user-agent']);
    if (token) {
        token.AccessToken = AccessToken;
        token.RefreshToken = RefreshToken;
    } else {
        student.tokens.push({
            AccessToken: AccessToken,
            RefreshToken: RefreshToken,
            source: req.headers['user-agent']
        });
    }
    await student.save();
    await Counsellor.save();
    await chatModel.create({ participants: [student._id, Counsellors[0]._id] });
    res.cookie("CampusRoot_Refresh", RefreshToken, cookieOptions).cookie("CampusRoot_Email", email, cookieOptions);
    return res.status(200).json({ success: true, message: `student registration successful`, data: { AccessToken, role: student.role || student.userType } });
});
export const verifyEmail = errorWrapper(async (req, res, next) => {
    const { email, emailVerificationString } = req.params;
    const user = await studentModel.findOne({ email: email });
    if (!user) return res.redirect(`${process.env.STUDENT_URL}/email-verification/?success=false`);
    if (new Date() > user.verification[0].token.expiry) return res.redirect(`${process.env.STUDENT_URL}/email-verification/?success=false&info=expired`);
    if (user.verification[0].token.data !== emailVerificationString) return res.redirect(`${process.env.STUDENT_URL}/email-verification/?success=false&info=invalid`);
    if (user.verification[0].status === true) return res.redirect(`${process.env.STUDENT_URL}/email-verification/?success=false&info=alreadyVerified`);
    user.verification[0].status = true;
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
    const replacement = { userName: `${user.firstName} ${user.lastName}` }
    const htmlToSend = template(replacement)
    await sendMail({ to: email, subject: subject, html: htmlToSend });
    return res.redirect(`${process.env.STUDENT_URL}/email-verification/?success=true`);
});
export const TeamRegister = errorWrapper(async (req, res, next) => {
    const { email, firstName, lastName, password, role } = req.body;
    if (!email || !firstName || !lastName || !password || !role) return next(generateAPIError(`Incomplete details`, 400));
    const alreadyExists = await teamModel.findOne({ email: email });
    if (alreadyExists) return next(generateAPIError(`Email Already Registered`, 400));
    const user = await teamModel.create({ email, firstName, lastName, password: await bcrypt.hash(password, 12), role });
    user.logs.push({
        action: `${role} Registration done`,
        details: `traditional registration done`
    })
    await user.save();
    return res.status(200).json({ success: true, message: `${role} Registration successful`, data: { email, firstName, lastName, role }, AccessToken: req.AccessToken ? req.AccessToken : null });
});
export const googleLogin = errorWrapper(async (req, res, next) => {
    if (!req.body.credential) return next("credential undefined", 400)
    try {
        const { given_name, family_name, email, picture, email_verified, sub } = jwtDecode(req.body.credential)
        const teamMember = await teamModel.findOne({ email: email })
        if (teamMember) return res.redirect(`${process.env.STUDENT_URL}/team`)
        let student = await studentModel.findOne({ email: email });
        const verification = [{
            type: "email",
            status: false,
            token: {
                data: (Math.random() + 1).toString(16).substring(2),
                expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        }, {
            type: "phone",
            status: false,
            token: {
                data: null,
                expiry: new Date()
            }
        }]
        if (student) {
            if (student.socialAuth && student.socialAuth.google && student.socialAuth.google.id) {
                let AccessToken = jwt.sign({ id: student._id }, ACCESS_SECRET, { expiresIn: "1h" });
                let RefreshToken = jwt.sign({ id: student._id }, REFRESH_SECRET, { expiresIn: "1y" });
                student.logs.push({ action: `Logged in using Google auth` });
                let token = student.tokens.find(token => token.source === req.headers['user-agent']);
                if (token) {
                    token.AccessToken = AccessToken;
                    token.RefreshToken = RefreshToken;
                } else {
                    student.tokens.push({
                        AccessToken: AccessToken,
                        RefreshToken: RefreshToken,
                        source: req.headers['user-agent']
                    });
                }
                await student.save();
                res.cookie("CampusRoot_Refresh", RefreshToken, cookieOptions).cookie("CampusRoot_Email", email, cookieOptions);
                return res.status(200).json({ success: true, message: `Google Authentication Successful`, data: { AccessToken, role: student.userType } });
            } else {
                student.firstName = given_name || null;
                student.lastName = family_name || null;
                student.displayPicSrc = picture;
                student.socialAuth.google = { id: sub };
                if (email_verified) student.verification[0].status = email_verified;
                student.logs.push({ action: `Logged in using Google auth. displayPicSrc and email details updated` });
                let AccessToken = jwt.sign({ id: student._id }, ACCESS_SECRET, { expiresIn: "1h" });
                let RefreshToken = jwt.sign({ id: student._id }, REFRESH_SECRET, { expiresIn: "1y" });
                let token = student.tokens.find(token => token.source === req.headers['user-agent']);
                if (token) {
                    token.AccessToken = AccessToken;
                    token.RefreshToken = RefreshToken;
                } else {
                    student.tokens.push({
                        AccessToken: AccessToken,
                        RefreshToken: RefreshToken,
                        source: req.headers['user-agent']
                    });
                }
                await student.save();
                res.cookie("CampusRoot_Refresh", RefreshToken, cookieOptions).cookie("CampusRoot_Email", email, cookieOptions);
                return res.status(200).json({ success: true, message: `Google Authentication Successful`, data: { AccessToken, role: student.userType } });
            }
        } else {
            student = await studentModel.create({ firstName: given_name || null, lastName: family_name || null, email: email, displayPicSrc: picture, "socialAuth.google": { id: sub }, preference: { country: ["United States of America"], language: "English" } });
            student.verification = verification
            student.verification[0].status = email_verified;
            if (!email_verified) {
                let subject = "Confirm Your Email to Activate Your CampusRoot Account";
                const __dirname = path.dirname(fileURLToPath(import.meta.url));
                const filePath = path.join(__dirname, '../../../static/emailTemplate.html');
                const source = fs.readFileSync(filePath, "utf-8").toString();
                const template = Handlebars.compile(source);
                const replacement = { userName: `${firstName} ${lastName}`, URL: `${process.env.SERVER_URL}/api/v1/auth/verify/${email}/${verification[0].token.data}` }
                const htmlToSend = template(replacement);
                await sendMail({ to: email, subject: subject, html: htmlToSend });
            }
            const Counsellors = await teamModel.aggregate([{ $match: { role: "counsellor" } }, { $project: { _id: 1, students: 1, students: { $size: "$students" } } }, { $sort: { students: 1 } }, { $limit: 1 }]);
            student.advisors.push({ info: Counsellors[0]._id, role: "counsellor" })
            const Counsellor = await teamModel.findById(Counsellors[0]._id);
            Counsellor.students.push({ profile: student._id, stage: "Fresh Lead" });
            await Counsellor.save();
            student.logs.push({ action: `Registered in using Google auth`, details: `Social registration done` });
            let AccessToken = jwt.sign({ id: student._id }, ACCESS_SECRET, { expiresIn: "1h" });
            let RefreshToken = jwt.sign({ id: student._id }, REFRESH_SECRET, { expiresIn: "1y" });
            let token = student.tokens.find(token => token.source === req.headers['user-agent']);
            if (token) {
                token.AccessToken = AccessToken;
                token.RefreshToken = RefreshToken;
            } else {
                student.tokens.push({
                    AccessToken: AccessToken,
                    RefreshToken: RefreshToken,
                    source: req.headers['user-agent']
                });
            }
            await student.save();
            await chatModel.create({ participants: [student._id, Counsellors[0]._id] });
            res.cookie("CampusRoot_Refresh", RefreshToken, cookieOptions).cookie("CampusRoot_Email", email, cookieOptions);
            return res.status(200).json({ success: true, message: `Google Registration Successful`, data: { AccessToken, role: student.userType } });
        }
    }
    catch (error) {
        return next(generateAPIError(error.message, 400))
    }
})
