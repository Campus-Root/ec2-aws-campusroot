import express from "express";
import bodyParser from 'body-parser';
import cookieParser from "cookie-parser";
import cors from "cors";
import { initialize } from "./utils/dbConnection.js";
import morgan from "morgan";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import notFoundMiddleware from "./middleware/notFound.js";
import errorHandlerMiddleware from "./middleware/errorHandler.js";
import compression from 'compression';
import 'dotenv/config';
import { startCronJob } from "./utils/cron.js";
import indexRouter from "./routers/index.js";
import webhookRouter from "./webhooks/index.js";
const app = express();
import path from 'path';
const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'build')));
await startCronJob();
await initialize();
export const cookieOptions = {
	secure: true,
	httpOnly: true,
	sameSite: 'strict',
	expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
}
// const whitelist = ["http://localhost:5500", "null", "http://127.0.0.1:5500", "https://campusroot.com", "http://localhost:3000", "https://team.campusroot.com", "http://127.0.0.1:3000", "https://d3mjeyzjhheqlz.cloudfront.net", "https://onewindow.co"];
app.set('trust proxy', 1) // trust first proxy


// 1️⃣  Declare this before *all* routes, and only once
app.use(cors({
	origin: (origin, cb) => {
		if (!origin) return cb(null, false);          // block non‑browser requests if you like
		const whitelist = new Set([
			'http://localhost:3000',
			'http://127.0.0.1:3000',
			'http://localhost:5500',
			'http://127.0.0.1:5500',
			'https://campusroot.com',
			'https://team.campusroot.com',
			'https://d3mjeyzjhheqlz.cloudfront.net',
			'https://onewindow.co',
		]);
		return whitelist.has(origin)
			? cb(null, origin)                          // echo the exact origin
			: cb(new Error(`Origin ${origin} not allowed by CORS`));
	},
	credentials: true,
	methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
	optionsSuccessStatus: 200,
}));

// 2️⃣  Optional: explicit pre‑flight handler *after* the main cors() call
app.options('*', cors());




// const corsOptions = {
// 	origin: (origin, callback) => (!origin || whitelist.indexOf(origin) !== -1) ? callback(null, true) : callback(new Error(`Origin ${origin} is not allowed by CORS`)),
// 	methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
// 	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],  // Add necessary headers
// 	credentials: true,
// 	optionsSuccessStatus: 200
// };
app.disable('x-powered-by');
app.use(compression({ level: 6, threshold: 10 * 100 }))
// app.use(cors(corsOptions));
// app.options('*', cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json({ type: ["application/json", "text/plain"], limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(
	helmet.contentSecurityPolicy({
		useDefaults: true,
		reportOnly: true,
		directives: {
			defaultSrc: ["'self'"],
			imgSrc: [
				"'self'",
				"data:",
				"https://lh3.googleusercontent.com",
				"https://res.cloudinary.com",
				"https://icon-library.com",
				"https://flagcdn.com",
				"https://workdrive.zoho.in",
				"https://previewengine-accl.zohopublic.in",
				"https://onewindow.co",
				"blob:"
			],
			connectSrc: [
				"'self'",
				"https://ipapi.co",
				"https://campusroot.com",
				"blob:"
			],
			scriptSrc: [
				"'self'",
				"https://accounts.google.com",
				"https://cdnjs.cloudflare.com",
				"https://checkout.razorpay.com"
			],
			workerSrc: [
				"'self'",
				"blob:"
			],
			frameSrc: [
				"'self'",
				"https://accounts.google.com",
				"https://workdrive.zoho.in"
			]
		},
	})
);

app.use(helmet.frameguard({ action: 'sameorigin' }));
app.use(helmet.noSniff());
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
app.use(helmet.permittedCrossDomainPolicies({ permittedPolicies: 'none' }));
app.use(mongoSanitize());
app.use(morgan(':date[web] :method :url :status :res[content-length] - :response-time ms'));
app.use("/api/v1", indexRouter);
app.use("/webhook/v1", webhookRouter)
app.get('/*', (req, res) => res.sendFile(path.join(__dirname, 'build', 'index.html')));
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
const port = process.env.PORT
app.listen(port, () => console.log("Server Running on " + `${port}`));