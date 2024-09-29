import { studentModel } from "../../models/Student.js";
import 'dotenv/config';
import { teamModel } from "../../models/Team.js";
import sendMail from "../../utils/sendEMAIL.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
// import chatModel from "../../models/Chat.js";
import { jwtDecode } from "jwt-decode";
import { cookieOptions } from "../../index.js";
import axios from "axios";
import qs from "qs";
import { generateTokens } from "../../utils/redisTokens.js";
import { createFolder } from "../../utils/CRMintegrations.js";
import { getNewAdvisor } from "../../utils/dbHelperFunctions.js";
import leadsModel from "../../models/leads.js";
import chatModel from "../../models/Chat.js";
// export const StudentRegister = errorWrapper(async (req, res, next, session) => {
//     const { firstName, lastName, email, password, displayPicSrc, country, DeviceToken } = req.body;
//     const { error, value } = registerSchema.validate(req.body)
//     if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
//     const alreadyExists = await studentModel.findOne({ email: email });
//     if (alreadyExists) return { statusCode: 400, data: null, message: `Email already registered` };
//     const student = await studentModel.create({ firstName, lastName, email, password: await bcrypt.hash(password, 12), displayPicSrc, preference: { country: country } });
//     const verification = [{
//         type: "email",
//         status: false,
//         token: { data: (Math.random() + 1).toString(16).substring(2), expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
//     }, {
//         type: "phone",
//         status: false,
//         token: { data: null, expiry: new Date() }
//     }]
//     student.verification = verification
//     student.suggestedPackages = [process.env.DEFAULT_SUGGESTED_PACKAGE_MONGOID]  // adding suggested package by default
//     const RSA = await getNewAdvisor("remoteStudentAdvisor");
//     const leadObject = await leadsModel.create([{
//         name: `${firstName} ${lastName}`,
//         queryDescription: "Registration initiated",
//         student: student._id,
//         remoteStudentAdvisor: RSA._id,
//         leadSource: "WebSite Visit",
//         leadStatus: [{ status: "New Lead" }],
//         leadRating: "medium priority",
//         logs: [{ action: "lead Initiated" }]
//     }],)
//     await teamModel.findByIdAndUpdate(RSA._id, { $push: { leads: leadObject._id } },);
//     await chatModel.create({ participants: [student._id, RSA._id] },);
//     student.advisors.push({ info: RSA._id, assignedCountries: country });
//     let subject = "Confirm Your Email to Activate Your CampusRoot Account"
//     const __dirname = path.dirname(fileURLToPath(import.meta.url));
//     const filePath = path.join(__dirname, '../../../static/emailTemplate.html');
//     const source = fs.readFileSync(filePath, "utf-8").toString();
//     const template = Handlebars.compile(source)
//     const replacement = { userName: `${firstName} ${lastName}`, URL: `${process.env.SERVER_URL}/api/v1/auth/verify/${email}/${verification[0].token.data}` }
//     const htmlToSend = template(replacement)
//     sendMail({ to: email, subject: subject, html: htmlToSend });
//     student.logs.push({
//         action: "Registration Done",
//         details: "traditional registration done"
//     })
//     const { newAccessToken, newRefreshToken } = await generateTokens(student._id, req.headers['user-agent'], DeviceToken)
//     const doc = await createFolder(student._id, process.env.DEFAULT_STUDENT_PARENTID_FOLDER_ZOHO)
//     student.docData = {
//         folder: doc.id,
//         name: doc.attributes.name,
//         parent: doc.attributes.parent_id,
//         download_url: doc.attributes.download_url,
//         modified_by_zuid: doc.attributes.modified_by_zuid
//     }
//     await student.save();
//     res.cookie("CampusRoot_Refresh", newRefreshToken, cookieOptions).cookie("CampusRoot_Email", email, cookieOptions);
//     req.AccessToken = newAccessToken;
//     return { statusCode: 200, message: `student registration successful`, data: { AccessToken: newAccessToken, role: student.role || student.userType, missingFields: ["phone", "education", "coursePreference", "tests"] } };
// });
export const TeamRegister = errorWrapper(async (req, res, next, session) => {
    const { email, firstName, lastName, role, expertiseCountry } = req.body;
    if (!email || !firstName || !lastName  || !role || !expertiseCountry.length) return { statusCode: 400, data: null, message: `Incomplete details` };
    const alreadyExists = await teamModel.findOne({ email: email });
    if (alreadyExists) return {
        statusCode: 400, data: null, message: `Email Already Registered`
    };
    const user = await teamModel.create({ email, firstName, lastName, role, expertiseCountry });
    user.logs.push({
        action: `${role} Registration done`,
        details: `traditional registration done`
    })
    const doc = await createFolder(firstName + '-' + lastName + '-' + user._id, process.env.DEFAULT_MEMBER_PARENTID_FOLDER_ZOHO)
    user.docData = {
        folder: doc.id,
        name: doc.attributes.name,
        parent: doc.attributes.parent_id,
        download_url: doc.attributes.download_url,
        modified_by_zuid: doc.attributes.modified_by_zuid
    }
    await user.save();
    return ({ statusCode: 200, message: `${role} Registration successful`, data: { email, firstName, lastName, role } });
});
export const googleLogin = errorWrapper(async (req, res, next, session) => {
    const { credential } = req.body;
    if (!credential) return next("credential undefined", 400)
    try {
        const { given_name, family_name, email, picture, email_verified, sub } = jwtDecode(credential)
        const teamMember = await teamModel.findOne({ email: email })
        if (teamMember) return res.redirect(`${process.env.STUDENT_URL}/team`)
        let student = await studentModel.findOne({ email: email });
        if (student) {
            if (student.socialAuth?.google?.id) {
                const { newAccessToken, newRefreshToken } = await generateTokens(student._id, req.headers['user-agent'])
                student.otp.emailLoginOtp.verified = true;
                student.logs.push({ action: `Logged in using Google auth` });
                let missingFields = [];
                if (!student?.firstName || !student?.lastName) missingFields.push("name");
                if (!student?.email) missingFields.push("email");
                if (!student?.phone || !student?.phone?.number || !student?.phone?.countryCode) missingFields.push("phone");
                if (!student?.preference || !student?.preference?.country || student.preference.country.length === 0) missingFields.push("country");
                if (!student?.preference || !student?.preference?.courses || student.preference.courses.length === 0) missingFields.push("coursePreference");
                if (JSON.stringify(student.education) === JSON.stringify({ school: {}, plus2: {}, underGraduation: {}, postGraduation: {} })) missingFields.push("education");
                if (!student?.tests || student.tests.length === 0) missingFields.push("tests");
                await student.save();
                res.cookie("CampusRoot_Refresh", newRefreshToken, cookieOptions)
                req.AccessToken = newAccessToken;
                return ({ statusCode: 200, message: `Google Authentication Successful`, data: { AccessToken: newAccessToken, role: student.userType, missingFields: missingFields } });
            } else {
                student.firstName = student.firstName || given_name || null;
                student.lastName = student.lastName || family_name || null;
                student.displayPicSrc = (student.displayPicSrc != "https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg") ? student.displayPicSrc : picture;
                student.socialAuth.google = { id: sub };
                student.otp.emailLoginOtp.verified = true;
                student.logs.push({ action: `Logged in using Google auth. displayPicSrc and email details updated` });
                let missingFields = []
                if (!student?.firstName || !student?.lastName) missingFields.push("name");
                if (!student?.email) missingFields.push("email");
                if (!student?.phone || !student?.phone?.number || !student?.phone?.countryCode) missingFields.push("phone");
                if (!student?.preference || !student?.preference?.country || student.preference.country.length === 0) missingFields.push("country");
                if (!student?.preference || !student?.preference?.courses || student.preference.courses.length === 0) missingFields.push("coursePreference");
                if (JSON.stringify(student.education) === JSON.stringify({ school: {}, plus2: {}, underGraduation: {}, postGraduation: {} })) missingFields.push("education");
                if (!student?.tests || student.tests.length === 0) missingFields.push("tests");
                const { newAccessToken, newRefreshToken } = await generateTokens(student._id, req.headers['user-agent'])
                await student.save();
                res.cookie("CampusRoot_Refresh", newRefreshToken, cookieOptions)
                req.AccessToken = newAccessToken;
                return ({ statusCode: 200, message: `Google Authentication Successful`, data: { AccessToken: newAccessToken, role: student.userType, missingFields: missingFields } });
            }
        } else {
            student = await studentModel.create({ firstName: given_name || null, lastName: family_name || null, email: email, displayPicSrc: picture, "socialAuth.google": { id: sub }, "otp.emailLoginOtp.verified": true });
            student.suggestedPackages = [process.env.DEFAULT_SUGGESTED_PACKAGE_MONGOID] // adding suggested package by default
            const RSA = await getNewAdvisor("remoteStudentAdvisor");
            const leadObject = await leadsModel.create({
                name: `${student.firstName} ${student.lastName}`,
                queryDescription: "Registration initiated",
                student: student._id,
                remoteStudentAdvisor: RSA._id,
                leadSource: "WebSite Visit",
                leadStatus: [{ status: "New Lead", }],
                leadRating: "medium priority",
                logs: [{ action: "lead Initiated" }]
            })
            await teamModel.findByIdAndUpdate(RSA._id, { $push: { leads: leadObject._id } });
            await chatModel.create({ participants: [student._id, RSA._id] });
            student.advisors.push({ info: RSA._id, assignedCountries: [] });
            student.logs.push({ action: `Registered in using Google auth`, details: `Social registration done` });
            const { newAccessToken, newRefreshToken } = await generateTokens(student._id, req.headers['user-agent'])
            const doc = await createFolder(given_name + '-' + family_name + '-' + student._id, process.env.DEFAULT_STUDENT_PARENTID_FOLDER_ZOHO)
            student.docData = {
                folder: doc.id,
                name: doc.attributes.name,
                parent: doc.attributes.parent_id,
                download_url: doc.attributes.download_url,
                modified_by_zuid: doc.attributes.modified_by_zuid
            }
            await student.save();
            res.cookie("CampusRoot_Refresh", newRefreshToken, cookieOptions)
            req.AccessToken = newAccessToken;
            return ({ statusCode: 200, message: `Google Registration Successful`, data: { AccessToken: newAccessToken, role: student.userType, missingFields: ["country", "phone", "education", "coursePreference", "tests"] } });
        }
    }
    catch (error) {
        console.log(error);
        return { statusCode: 400, data: null, message: error.message }
    }
})
export const linkedLogin = errorWrapper(async (req, res, next, session) => {
    const { code, redirectUri } = req.body;
    try {
        const response = await axios.post(`https://www.linkedin.com/oauth/v2/accessToken`,
            qs.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: process.env.LINKEDIN_CLIENT_ID,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const accessToken = response.data.access_token;
        console.log({ accessToken });
    } catch (error) {
        return { statusCode: 500, message: `auth token not granted, change code`, data: error };
    }

    try {
        const profileResponse = await axios.get(`https://api.linkedin.com/v2/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        console.log({ profileResponse });
    } catch (error) {
        return { statusCode: 500, message: `profile response not granted, change code`, data: error };
    }

    try {
        const emailResponse = await axios.get(`https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        console.log({ emailResponse });
    } catch (error) {
        return { statusCode: 500, message: `email response not granted, change code`, data: error };
    }



    return { statusCode: 200, message: `success`, data: { accessToken, profileResponse, emailResponse } };


});
