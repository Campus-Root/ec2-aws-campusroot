import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import compression from "compression";
import "dotenv/config";

import { initialize } from "./utils/dbConnection.js";
import { startCronJob } from "./utils/cron.js";

import indexRouter from "./routers/index.js";
import webhookRouter from "./webhooks/index.js";

import notFoundMiddleware from "./middleware/notFound.js";
import errorHandlerMiddleware from "./middleware/errorHandler.js";

const app = express();
import path from 'path';
const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'build')));
app.set("trust proxy", 1);
app.disable("x-powered-by");

/* ---------------- COOKIE OPTIONS ---------------- */

export const cookieOptions = {
    secure: true,
    httpOnly: true,
    sameSite: "strict",
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
};

/* ---------------- CORS ---------------- */

const devWhiteList = new Set([
    "https://pes.campusroot.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]);

const exactWhitelist = new Set([
    "https://pes.campusroot.com",
    "https://campusroot.com",
    "https://team.campusroot.com",
    "https://onewindow.co",
    "https://d3mjeyzjhheqlz.cloudfront.net",
]);

const campusrootRegex = /^https:\/\/([a-z0-9-]+\.)*campusroot\.com$/;

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);

            if (devWhiteList.has(origin)) return cb(null, true);

            if (exactWhitelist.has(origin)) return cb(null, true);

            if (campusrootRegex.test(origin)) return cb(null, true);

            return cb(new Error(`CORS blocked: ${origin}`));
        },
        credentials: true,
        methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
        ],
        optionsSuccessStatus: 200,
    })
);

app.options("*", cors());

/* ---------------- BASIC MIDDLEWARE ---------------- */

app.use(compression({ level: 6, threshold: 10 * 100 }));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(cookieParser());

app.use(mongoSanitize());

app.use(
    morgan(":date[web] :method :url :status :res[content-length] - :response-time ms")
);

/* ---------------- HELMET SECURITY ---------------- */

app.use(
    helmet.contentSecurityPolicy({
        useDefaults: true,
        reportOnly: true,
        directives: {
            defaultSrc: ["'self'"],

            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https://lh3.googleusercontent.com",
                "https://res.cloudinary.com",
                "https://icon-library.com",
                "https://flagcdn.com",
                "https://workdrive.zoho.in",
                "https://previewengine-accl.zohopublic.in",
                "https://onewindow.co",
            ],

            connectSrc: [
                "'self'",
                "https://ipapi.co",
                "https://campusroot.com",
                "blob:",
            ],

            scriptSrc: [
                "'self'",
                "https://accounts.google.com",
                "https://cdnjs.cloudflare.com",
                "https://checkout.razorpay.com",
            ],

            workerSrc: ["'self'", "blob:"],

            frameSrc: [
                "'self'",
                "https://accounts.google.com",
                "https://workdrive.zoho.in",
            ],
        },
    })
);

app.use(helmet.frameguard({ action: "sameorigin" }));
app.use(helmet.noSniff());
app.use(
    helmet.referrerPolicy({
        policy: "strict-origin-when-cross-origin",
    })
);

app.use(
    helmet.permittedCrossDomainPolicies({
        permittedPolicies: "none",
    })
);

/* ---------------- ROUTES ---------------- */




app.use("/api/v1", indexRouter);
app.get("/api/test", (req, res) => {
    // referer
    console.log(JSON.stringify(req.headers, null, 2));
    res.send({ success: true, message: "Test successful", data: null })
});
app.use("/webhook/v1", webhookRouter);
app.get('/*', (req, res) => res.sendFile(path.join(__dirname, 'build', 'index.html')));

/* ---------------- ERROR HANDLING ---------------- */

app.use(notFoundMiddleware);

app.use(errorHandlerMiddleware);

/* ---------------- SERVER BOOTSTRAP ---------------- */

const startServer = async () => {
    try {
        await initialize();
        await startCronJob();

        const port = process.env.PORT || 3000;

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();