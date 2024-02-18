import admin from "firebase-admin";
import 'dotenv/config'
import userModel from "../models/User.js";
export const sendNotification = async (message, receiverId) => {
    try {
        admin.initializeApp({ credential: admin.credential.cert(process.env.FCM) });
        
        const receiver = await userModel.findById(receiverId, "token")
        message.token = receiver.token
        
        const response = await admin.messaging().send(message)
        console.log('Successfully sent notification:', response);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
}









