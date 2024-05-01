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

export const generatingAuthUrl = errorWrapper(async (req, res, next) => {
    const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/userinfo.email"] });
    res.status(200).json({ success: true, message: `auth url`, data: url });
})
export const googleAuthentication = errorWrapper(async (req, res, next) => {
    const { tokens } = await oauth2Client.getToken(req.query.code)
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({
        version: 'v2',
        auth: oauth2Client,
    });
    const { data } = await oauth2.userinfo.get();
    const user = await teamModel.findOne({ email: data.email })
    if (!user) return next(generateAPIError(`user email mismatch`, 400));
    user.googleTokens = {
        access_token: tokens.access_token,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date,
    }
    if (tokens.refresh_token) user.googleTokens.refresh_token = tokens.refresh_token
    await user.save()
    oauth2Client.setCredentials(user.googleTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const filter = {
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 2499,    // cannot be larger than 2500 by default 250
        singleEvents: true,
        orderBy: 'updated',
    }
    const list = await calendar.events.list(filter);
    return res.status(200).json({ success: true, message: `counsellor calendar`, data: { numberOfItems: list.data.items.length, items: list.data.items } })
})
export const calendarEvents = errorWrapper(async (req, res, next) => {
    if (!req.user.googleTokens.access_token) return next(generateAPIError(`invalid google tokens`, 400));
    oauth2Client.setCredentials(req.user.googleTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const filter = {
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 2499,    // cannot be larger than 2500 by default 250
        singleEvents: true,
        orderBy: 'updated',
    }
    const { data } = await calendar.events.list(filter);
    return res.status(200).json({ success: true, message: `counsellor calendar`, data: { numberOfItems: data.items.length, items: data.items }, AccessToken: req.AccessToken ? req.AccessToken : null })
})