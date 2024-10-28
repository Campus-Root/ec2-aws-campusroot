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
                const { data, error } = await axios.post("https://api.aoc-portal.com/v1/sms", {
                    "sender": "OWOEDU",
                    "to": to,
                    "text": `Your One Window OTP is ${otp} to reset your password. It’s valid for 10 minutes. Please don’t share this code with anyone.\n\nThank you,\nOne Window Overseas Education Pvt Ltd`,
                    "type": "TRANS"
                }, {
                    headers: {
                        "apikey": "8opmJMY3d8fAjquBZj6OcLCDcBdN9Q",
                        "Content-Type": "application/json"
                    }
                })
                if (error === null) return { return: true, message: ["otp sent"], data: data.data }
                break;
            case "International":
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
                                data.name || "User", String(otp)
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
            default:
                return { return: false, message: "otp not sent as region is invalid", data: null }
        }
        return { return: false, message: "something went wrong", data: null }
    } catch (error) {
        console.error('Error:', error);
        return { return: false, message: "otp not sent", data: error }
    }
};




