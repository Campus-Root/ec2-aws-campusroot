import Razorpay from "razorpay";
import 'dotenv/config';
export const RazorpayInstance = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
