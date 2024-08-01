import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import { teamModel } from "../../models/Team.js";
import { oauth2Client } from "../../utils/oAuthClient.js";
import { google } from "googleapis";

export const generatingAuthUrl = errorWrapper(async (req, res, next) => {
    const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/userinfo.email"] });
    ({ statusCode: 200, message: `auth url`, data: url });
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
    if (!user) return { statusCode: 400, data: null, message: `user email mismatch` };
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
    return ({ statusCode: 200, message: `${user.role} calendar`, data: { numberOfItems: list.data.items.length, items: list.data.items } })
})
export const calendarEvents = errorWrapper(async (req, res, next) => {
    if (!req.user.googleTokens.access_token) return { statusCode: 400, data: null, message: `invalid google tokens` };
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
    return ({ statusCode: 200, message: `${req.user.role} calendar`, data: { numberOfItems: data.items.length, items: data.items } })
})