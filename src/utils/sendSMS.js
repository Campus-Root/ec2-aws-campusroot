import twilio from 'twilio';

import 'dotenv/config';
import axios from 'axios';
let { SMS_TWILIO_SID, SMS_TWILIO_TOKEN, SMS_TWILIO_NUMBER } = process.env;
export const sendSMS = async (data) => {
    try {
        const { to, message } = data
        const accountSid = SMS_TWILIO_SID;
        const authToken = SMS_TWILIO_TOKEN;
        const client = new twilio(accountSid, authToken);
        await client.messages.create({ body: message, from: SMS_TWILIO_NUMBER, to: to })
        return { success: true, message: "otp sent", data: null }
    } catch (error) {
        console.error(error);
        return { success: false, message: "otp not sent", data: error }
    }
}
export const sendOTP = async (data) => {
    try {
        const { to, otp, region } = data
        switch (region) {
            case "Indian":
            // const uniRestResponse = await unirest.post("https://www.fast2sms.com/dev/bulkV2")
            //     .headers({ "authorization": SMS_FAST2SMS_API_KEY })
            //     .form({ "variables_values": `${otp}`, "route": "otp", "numbers": `${to}` });
            // return uniRestResponse.body
            case "International":
                const accountSid = SMS_TWILIO_SID;
                const authToken = SMS_TWILIO_TOKEN;
                const client = new twilio(accountSid, authToken);
                const resp = await client.messages.create({ body: `Dear customer, use this as One Time Password ${otp}. This OTP will be valid for the next 5 mins.`, from: SMS_TWILIO_NUMBER, to: to })
                return { return: true, message: ["otp sent"], data: resp }
            default:
                return { return: false, message: "otp not sent as region is invalid", data: null }
        }
    } catch (error) {
        console.error('Error:', error);
        return { return: false, message: "otp not sent", data: error }
    }
};

export const sendWAOTP = async (data) => {
    try {
        const { to, otp, name } = data
        const token = process.env.WA_TOKEN
        const resp = await axios.post("https://api.aoc-portal.com/v1/whatsapp", {
            "from": "+919642004141",
            "campaignName": "Login",
            "to": to,
            "type": "template",
            "templateName": "otp",
            "components": {
                "body": {
                    "params": [
                        name || "User", String(otp)
                    ]
                }
            }
        }, {
            headers: {
                'apiKey': `${token}`,
                'Content-Type': 'application/json',
            }
        })
        return { return: true, message: ["otp sent"], data: resp }
    }
    catch (error) {
        console.error('Error:', error);
        return { return: false, message: "otp not sent", data: error }
    }
}



