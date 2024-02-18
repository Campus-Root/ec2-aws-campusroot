import nodemailer from "nodemailer";
import 'dotenv/config';
let HOST = process.env.EMAIL_SMTP_HOST, AUTH = process.env.EMAIL_SMTP_AUTH, PASS = process.env.EMAIL_SMTP_PASS;

async function sendMail(emailData) {
    try {
        console.log("nodemailer started");
        let transporter = nodemailer.createTransport({
            host: HOST,
            port: 465,
            secure: true,
            auth: {
                user: AUTH,
                pass: PASS,
            },
        });
        console.log("transporter created");
        let info = await transporter.sendMail({
            from: `"CAMPUSROOT" <${AUTH}>`, // sender address
            to: emailData.to, // list of receivers
            subject: emailData.subject, // Subject line
            html: emailData.html, // html body
        });

        console.log("Message sent: %s", info.messageId);
        return info
    } catch (error) {
        console.error(error);
    }
}
export default sendMail;