import mongoose from "mongoose";
import 'dotenv/config';

export const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to db');
    } catch (err) {
        console.log(err);
    }
};
