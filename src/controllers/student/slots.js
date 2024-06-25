import userModel from "../../models/User.js";
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import meetingModel from "../../models/meetings.js";
import { oauth2Client } from "../../utils/oAuthClient.js";
import { google } from "googleapis";
import 'dotenv/config';
export const bookSlot = errorWrapper(async (req, res, next) => {
    const { startTime, endTime, attendees, timeZone, notes } = req.body
    const { team } = req.params
    // if (req.user.verification[0].status === false) return next(generateAPIError(`do verify your email to book a slot`, 400));
    // if (req.user.verification[1].status === false) return next(generateAPIError(`do verify your phone number to book a slot`, 400));
    if (!new Date(startTime)) return next(generateAPIError("invalid startTime", 400))
    if (!new Date(endTime)) return next(generateAPIError("invalid endTime", 400))
    if (!timeZone) return next(generateAPIError("invalid timeZone", 400))
    await userModel.populate(req.user, { path: "advisors.info", select: "googleTokens" })
    let counsellor = req.user.advisors.find(ele => ele.role === 'counsellor'), processCoordinator = req.user.advisors.find(ele => ele.role === 'processCoordinator')
    let event, meet
    switch (team) {
        case "counsellor":
            oauth2Client.setCredentials(counsellor.info.googleTokens);
            event = {
                summary: `Counselling Session - ${req.user.firstName} ${req.user.lastName}`,
                description: notes,
                start: { dateTime: new Date(startTime), timeZone: timeZone, },
                end: { dateTime: new Date(endTime), timeZone: timeZone, },
                attendees: [{ email: req.user.email }],
                conferenceData: { createRequest: { requestId: Math.random().toString(16).slice(2), }, },
                reminders: { useDefault: false, overrides: [{ method: "email", minutes: 24 * 60 }, { method: "popup", minutes: 10 },], },
            };
            meet = { user: req.user._id, member: counsellor.info._id }
            break;
        case "processCoordinator":
            oauth2Client.setCredentials(processCoordinator.info.googleTokens);
            event = {
                summary: `Application Processing Session - ${req.user.firstName} ${req.user.lastName}`,
                description: notes,
                start: { dateTime: new Date(startTime), timeZone: timeZone, },
                end: { dateTime: new Date(endTime), timeZone: timeZone, },
                attendees: [{ email: req.user.email }],
                conferenceData: { createRequest: { requestId: Math.random().toString(16).slice(2), }, },
                reminders: { useDefault: false, overrides: [{ method: "email", minutes: 24 * 60 }, { method: "popup", minutes: 10 },], },
            };
            meet = { user: req.user._id, member: processCoordinator.info._id }
            break;
        default: return next(generateAPIError(`invalid team parameter`, 400));
    }
    if (attendees) attendees.forEach(ele => event.attendees.push({ email: ele }));
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { data } = await calendar.events.insert({ calendarId: 'primary', requestBody: event, conferenceDataVersion: 1, sendUpdates: "all", });
    meet.data = data;
    meet.status = "upcoming"
    const meeting = await meetingModel.create(meet)
    req.user.activity.meetings.push(meeting._id)
    req.user.logs.push({
        action: `slot booked at ${startTime}`,
        details: `meetingId:${meeting._id}`
    })
    await req.user.save()
    await userModel.populate(meeting, { path: "user member", select: "firstName lastName email displayPicSrc role" })
    return res.status(200).json({ success: true, message: `slot booking successful`, data: meeting, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const modifySlot = errorWrapper(async (req, res, next) => {
    const { meetingId, option, startTime, endTime, timeZone } = req.body
    const meeting = await meetingModel.findById(meetingId)
    if (!meeting || !meeting.data.id) return next(generateAPIError("invalid meetingId", 400))
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    if (meeting.status === "cancelled") return next(generateAPIError("cannot modify cancelled meeting", 400))
    let msg, response
    switch (option) {
        case "cancelEvent":
            response = await calendar.events.patch({ calendarId: 'primary', eventId: meeting.data.id, requestBody: { status: 'cancelled' }, sendUpdates: 'all' });
            meeting.data = response.data
            meeting.status = "cancelled"
            msg = 'Event cancelled successfully'
            req.user.logs.push({ action: `Event cancelled`, details: `meetingId:${meetingId}` })
            break;
        case "rescheduleEvent":
            if (!startTime && !endTime) return next(generateAPIError("invalid start and end time", 400))
            if (!timeZone) return next(generateAPIError("invalid timeZone", 400))
            const updatedEvent = {
                ...meeting.data,
                start: { dateTime: new Date(startTime), timeZone: timeZone, },
                end: { dateTime: new Date(endTime), timeZone: timeZone, },
            };
            response = await calendar.events.update({ calendarId: 'primary', eventId: meeting.data.id, requestBody: updatedEvent, sendUpdates: 'all' });
            meeting.data = response.data
            meeting.status = "rescheduled"
            msg = 'Event rescheduled successfully'
            req.user.logs.push({ action: `Event rescheduled ${startTime}`, details: `meetingId:${meetingId}` })
            break;
        default: return next(generateAPIError("invalid option", 400))
    }

    await req.user.save()
    await meeting.save()
    await userModel.populate(meeting, { path: "user member", select: "firstName lastName email displayPicSrc role" })
    return res.status(200).json({ success: true, message: msg, data: meeting, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const getEvents = errorWrapper(async (req, res, next) => {
    // add meeting for processCordinator
    await userModel.populate(req.user, { path: "advisors.info", select: "googleTokens" })
    let counsellor = req.user.advisors.find(ele => ele.role === 'counsellor'), processCoordinator = req.user.advisors.find(ele => ele.role === 'processCoordinator')
    const { team } = req.params
    switch (team) {
        case "counsellor":
            oauth2Client.setCredentials(counsellor.info.googleTokens);
            break;
        case "processCoordinator":
            oauth2Client.setCredentials(processCoordinator.info.googleTokens);
            break;
        default: return next(generateAPIError(`invalid team parameter`, 400));
    }
    const { data } = await google.calendar({ version: 'v3', auth: oauth2Client }).events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 2499,    // cannot be larger than 2500 by default 250
        singleEvents: true,
        // orderBy: 'updated',
        orderBy: "startTime",
        timeMax: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    const busySlots = data.items.map(event => ({
        summary: event.summary,
        start: new Date(event.start.dateTime).toISOString(),
        end: new Date(event.end.dateTime).toISOString(),
    }));
    let today = new Date();
    today.setMinutes(0, 0, 0)
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const result = []
    const endTime = new Date(thirtyDaysLater.getFullYear(), thirtyDaysLater.getMonth(), thirtyDaysLater.getDate(), 12, 30, 0);
    while (today < endTime) {
        let todayStartTime = new Date(today).setHours(3, 30, 0);  // morning time in gmt
        let todayEndTime = new Date(today).setHours(12, 30, 0);// evening time in gmt
        let currentTime = (today < todayStartTime) ? new Date(todayStartTime) : new Date(today);
        if (today.getDay() !== 0) {
            const availableSlots = [];
            let lunchStart = new Date(today).setHours(7, 30, 0);
            let lunchEnd = new Date(today).setHours(8, 30, 0);
            while (currentTime < todayEndTime) {
                let slotEnd = new Date(currentTime.getTime() + 30 * 60 * 1000)    // duration time in gmt
                let isSlotAvailable = ((
                    !busySlots.some(busySlot =>
                        ((currentTime <= new Date(busySlot.start)) && (new Date(busySlot.start) < slotEnd)) ||
                        ((new Date(busySlot.start) <= currentTime) && (currentTime < new Date(busySlot.end)))
                    )) &&
                    (!(currentTime >= lunchStart) || !(slotEnd <= lunchEnd))
                )
                if (isSlotAvailable) availableSlots.push({
                    startTime: currentTime,
                    endTime: slotEnd
                })
                currentTime = slotEnd;
            }
            result.push({
                date: new Date(today),
                availableSlots: availableSlots
            })
        }
        today.setDate(today.getDate() + 1)
        today.setHours(3, 30, 0, 0);
    }
    return res.status(200).json({ success: true, message: `free slots for next 30 days`, data: result, AccessToken: req.AccessToken ? req.AccessToken : null });
})