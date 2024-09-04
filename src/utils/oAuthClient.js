import 'dotenv/config';
import { google } from 'googleapis';
const { WEB_CLIENT_ID, WEB_CLIENT_SECRET, MEMBER_URL } = process.env;
export const oauth2Client = new google.auth.OAuth2(WEB_CLIENT_ID, WEB_CLIENT_SECRET, `${MEMBER_URL}calendar-events`);
