
import 'dotenv/config'
import axios from 'axios';
import { getRedisClient } from "./dbConnection.js";

export const getTokens = async (ids) => {
    try {
        const tokens = [];
        const redisClient = await getRedisClient();
        for (const userId of ids) {
            const keys = await redisClient.keys(`DeviceToken:${userId}:*`);
            const values = await Promise.all(keys.map(key => redisClient.get(key)));
            tokens.push(...values);
        }
        return tokens;
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





