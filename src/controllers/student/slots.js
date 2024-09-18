import userModel from "../../models/User.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import meetingModel from "../../models/meetings.js";
import { oauth2Client } from "../../utils/oAuthClient.js";
import { google } from "googleapis";
import 'dotenv/config';
export const bookSlot = errorWrapper(async (req, res, next, session) => {
    const { startTime, endTime, attendees, timeZone, notes } = req.body
    const { teamMemberId } = req.params
    // if (req.user.verification[0].status === false) return { statusCode: 400, data: student , message:    `do verify your email to book a slot`};
    // if (req.user.verification[1].status === false) return { statusCode: 400, data: student , message:    `do verify your phone number to book a slot`};
    if (!new Date(startTime)) return { statusCode: 400, data: null, message: "invalid startTime" }
    if (!new Date(endTime)) return {
        statusCode: 400, data: null, message: "invalid endTime"
    }
    if (!timeZone) return {
        statusCode: 400, data: null, message: "invalid timeZone"
    }
    await userModel.populate(req.user, { path: "advisors.info", select: "googleTokens role" })
    let teamMember = req.user.advisors.find(ele => ele.info._id.toString() == teamMemberId)
    if (!teamMember) return { statusCode: 400, data: null, message: `invalid teamMember parameter` };
    const alreadyScheduled = await meetingModel.find({ user: req.user._id, member: teamMember.info._id, "data.end.dateTime": { $gte: new Date() } }, "data.start data.end")
    if (!alreadyScheduled) return { statusCode: 400, data: null, message: `meeting already scheduled at ${alreadyScheduled.data.start.dateTime}` };
    let sessionName
    switch (teamMember.info.role) {
        case "counsellor": sessionName = `Counselling Session - ${req.user.firstName} ${req.user.lastName}`
            break;
        case "processCoordinator": sessionName = `Application Processing Session - ${req.user.firstName} ${req.user.lastName}`
            break;
        default: return {
            statusCode: 400, data: null, message: `invalid teamMemberId`
        };
    }
    oauth2Client.setCredentials(teamMember.info.googleTokens);
    let event = {
        summary: sessionName,
        description: notes,
        start: { dateTime: new Date(startTime), timeZone: timeZone, },
        end: { dateTime: new Date(endTime), timeZone: timeZone, },
        attendees: [{ email: req.user.email }],
        conferenceData: { createRequest: { requestId: Math.random().toString(16).slice(2), }, },
        reminders: { useDefault: false, overrides: [{ method: "email", minutes: 24 * 60 }, { method: "popup", minutes: 10 },], },
    };
    let meet = { user: req.user._id, member: teamMember.info._id }
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
    return ({ statusCode: 200, message: `slot booking successful`, data: meeting });
})
export const modifySlot = errorWrapper(async (req, res, next, session) => {
    const { meetingId, option, startTime, endTime, timeZone } = req.body
    let meeting = await meetingModel.findById(meetingId).populate("member", "googleTokens")
    if (!meeting || !meeting.data.id) return { statusCode: 400, data: null, message: "invalid meetingId" }
    oauth2Client.setCredentials(meeting.member.googleTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    if (meeting.status === "cancelled") return { statusCode: 400, data: null, message: "cannot modify cancelled meeting" }
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
            if (!startTime && !endTime) return {
                statusCode: 400, data: null, message: "invalid start and end time"
            }
            if (!timeZone) return {
                statusCode: 400, data: null, message: "invalid timeZone"
            }
            const latestEvent = await calendar.events.get({
                calendarId: 'primary',
                eventId: meeting.data.id,
            });
            const updatedEvent = {
                ...meeting.data,
                start: { dateTime: new Date(startTime), timeZone: timeZone, },
                end: { dateTime: new Date(endTime), timeZone: timeZone, },
                sequence: latestEvent.data.sequence + 1, // Use the latest sequence number
            };
            response = await calendar.events.update({
                calendarId: 'primary',
                eventId: meeting.data.id,
                requestBody: updatedEvent,
                sendUpdates: 'all',
            });
            meeting.data = response.data
            meeting.status = "rescheduled"
            msg = 'Event rescheduled successfully'
            req.user.logs.push({ action: `Event rescheduled ${startTime}`, details: `meetingId:${meetingId}` })
            break;
        default: return { statusCode: 400, data: null, message: "invalid option" }
    }
    await req.user.save()
    await meeting.save()
    await userModel.populate(meeting, { path: "user member", select: "firstName lastName email displayPicSrc role" })
    return ({ statusCode: 200, message: msg, data: meeting });
})
export const getEvents = errorWrapper(async (req, res, next, session) => {
    await userModel.populate(req.user, { path: "advisors.info", select: "googleTokens" })
    const { teamMemberId } = req.params
    let teamMember = req.user.advisors.find(ele => ele.info._id.toString() == teamMemberId)
    if (!teamMember) return { statusCode: 400, data: null, message: `invalid teamMember parameter` };
    oauth2Client.setCredentials(teamMember.info.googleTokens);
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
    return ({ statusCode: 200, message: `free slots for next 30 days`, data: result });
})


// response = await calendar.events.get({ calendarId: 'primary', eventId: meeting.data.id });