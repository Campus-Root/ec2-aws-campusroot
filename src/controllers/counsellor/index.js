import courseModel from "../../models/Course.js";
import universityModel from "../../models/University.js";
import applicationModel from "../../models/application.js";
import { studentModel } from "../../models/Student.js";
import Document from "../../models/Uploads.js";
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import { teamModel } from "../../models/Team.js";
import { oauth2Client } from "../../utils/oAuthClient.js";
import { google } from "googleapis";
import 'dotenv/config';
import userModel from "../../models/User.js";

export const profile = errorWrapper(async (req, res, next) => {
    await courseModel.populate(req.user, [{ path: "applications.course", select: "name unisName startDate" }])
    await userModel.populate(req.user,
        {
            path: "students.profile", select: "firstName lastName email displayPicSrc phone verification isPlanningToTakeAcademicTest isPlanningToTakeLanguageTest recommendation",
            populate: { path: "recommendation", select: "_id", }
        })
    const profile = {
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        displayPicSrc: req.user.displayPicSrc,
        email: req.user.email,
        linkedIn: req.user.linkedIn,
    }
    const { students } = req.user
    const applications = await applicationModel.find({ counsellor: req.user._id }, "course intake deadline user approval stage status cancellationRequest createdAt updatedAt")
        .populate({ path: "user", select: "firstName lastName email displayPicSrc" })
        .populate({ path: "processCoordinator", select: "firstName lastName email displayPicSrc" })
        .populate({ path: "course", select: "name unisName startDate" })
        .lean();
    return res.status(200).json({ success: true, message: `all Details of Counsellor`, data: { profile, students, applications }, AccessToken: req.AccessToken ? req.AccessToken : null })
})

export const profileEdit = errorWrapper(async (req, res, next) => {
    const { linkedIn } = req.body
    if (linkedIn) {
        req.user.linkedIn = linkedIn
        req.user.logs.push({
            action: "profile edited",
            details: `linkedIn:${linkedIn}`
        })
    }
    await req.user.save()
    return res.status(200).json({ success: true, message: `updated Details of Counsellor`, data: req.user, AccessToken: req.AccessToken ? req.AccessToken : null })
})

