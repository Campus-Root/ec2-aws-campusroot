import 'dotenv/config';
import axios from 'axios';
let { SMS_REDCLOUD_APIKEY } = process.env;
export const sendOTP = async (data) => {
    try {
        const { to, otp, region } = data
        let response
        switch (region) {
            case "Indian":
                response = await axios.post("https://api.aoc-portal.com/v1/sms", {
                    "sender": "OWOEDU",
                    "to": to,
                    "text": `Your One Window OTP is ${otp}. It’s valid for 10 minutes. Please don’t share this code with anyone.\n\nThank you,\nOne Window Overseas Education Pvt Ltd`,
                    "type": "TRANS"
                }, {
                    headers: {
                        "apikey": SMS_REDCLOUD_APIKEY ,
                        "Content-Type": "application/json"
                    }
                })
                if (response.status === 200) return { return: true, message: ["otp sent"], data: response.data }
                break;
            case "International":
                const token = process.env.WA_TOKEN
                response = await axios.post("https://api.aoc-portal.com/v1/whatsapp", {
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
                return { return: true, message: ["otp sent"], data: response }
            default:
                return { return: false, message: "otp not sent as region is invalid", data: null }
        }
        return { return: false, message: "something went wrong", data: null }
    } catch (error) {
        console.error('Error:', error);
        return { return: false, message: "otp not sent", data: error }
    }
};




