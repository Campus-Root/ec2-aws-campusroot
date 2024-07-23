
import 'dotenv/config'
import axios from 'axios';
import userModel from '../models/User.js';
export const getTokens = async (ids) => {
    try {
        const users = await userModel.find({ _id: { $in: ids }, "tokens.DeviceToken": { $exists: true } }, "tokens.DeviceToken");
        let tokens = [];
        for (const user of users) for (let token of user.tokens) if (token.DeviceToken) tokens.push(token.DeviceToken);
        return (tokens);
    } catch (err) {
        console.error(err);
    }

}

export const sendPushNotification = async ({ tokens, notification }) => {
    try {
        const headers = {
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': '*/*',
            'Content-Type': 'application/json'
        };
        const response = await axios.post(process.env.EXPO_URL, {
            to: tokens,
            sound: "default",
            title: notification.title,
            body: notification.body,
            data: notification.data
        }, { headers });
        console.log('Response:', response.data);
        return true;
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}





