import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
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
// import cluster from "cluster";
// import os from "os";
import 'dotenv/config';
import { startCronJob } from "./utils/cron.js";
import indexRouter from "./routers/index.js";

const app = express();
const server = createServer(app);

import path from 'path';
import { fileURLToPath } from 'url';
import { getTokens, sendPushNotification } from "./utils/sendNotification.js";
import xssReqSanitizer from "xss-req-sanitizer";
const __filename = fileURLToPath(import.meta.url);


const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'build')));



await startCronJob();
await initialize();
export const cookieOptions = {
	secure: true,
	httpOnly: true,
	sameSite: 'strict'
}
const whitelist = ["https://campusroot.com", "http://localhost:3000", "https://team.campusroot.com", "http://127.0.0.1:3000"];
app.set('trust proxy', 1) // trust first proxy
const corsOptions = {
	origin(origin, callback) {
		if (!origin) return callback(null, true);      // for mobile app and postman client
		if (whitelist.indexOf(origin) !== -1) callback(null, true);
		else callback(new Error("Not allowed by CORS"));
	},
	methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
	credentials: true,
	optionsSuccessStatus: 200
};
app.disable('x-powered-by');
app.use(compression({ level: 6, threshold: 10 * 100 }))
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json({ type: ["application/json", "text/plain"], limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(helmet.contentSecurityPolicy({
	directives: {
		defaultSrc: ["'self'"],
		imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com", "https://res.cloudinary.com", "https://icon-library.com/", "https://flagcdn.com/", "blob:"],
		connectSrc: ["'self'", "https://ipapi.co", "blob:"],
		scriptSrc: ["'self'", "https://accounts.google.com", "https://cdnjs.cloudflare.com"],
		workerSrc: ["'self'", "blob:"],
		frameSrc: ["'self'", "https://accounts.google.com", "https://workdrive.zoho.in"], // Allow Zoho WorkDrive to be framed
	},
}));
// Adding missing security headers
app.use(helmet.frameguard({ action: 'sameorigin' }));
app.use(helmet.noSniff());
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
app.use(helmet.permittedCrossDomainPolicies({ permittedPolicies: 'none' }));
app.use(mongoSanitize());
app.use(xssReqSanitizer())
app.use(morgan(':date[web] :method :url :status :res[content-length] - :response-time ms'));
app.use("/api/v1", indexRouter);
app.get('/*', (req, res) => res.sendFile(path.join(__dirname, 'build', 'index.html')));
const io = new Server(server, {
	cors: {
		origin: function (origin, callback) {
			if (!origin || whitelist.indexOf(origin) !== -1) {
				callback(null, true);
			} else {
				callback(new Error("Not allowed by CORS"));
			}
		},
		credentials: true,
	},
}); // Initialize Socket.IO
io.use((socket, next) => {
	next();
});
// Socket.IO event handlers
io.on('connection', function (socket) {
	console.log("new user connected");
	socket.on('connected', () => {

	})

	socket.on('disconnected', ({ personalroomid, friends }) => {
		friends.forEach(element => {
			socket.broadcast.to(element[0]).emit('disconnected', { user: personalroomid, status: 'offline' });
		});
	})
	socket.on('join', (profile) => {
		socket.join(profile._id);
		console.log(profile.firstName + " joined");
	})
	socket.on('trigger', (triggerObject) => {
		console.log(triggerObject.action, triggerObject.sender.firstName);
		var activityList = [];
		let offlineUsers = [];
		console.log(triggerObject);
		triggerObject.recievers.forEach(reciever => {
			var online = io.sockets.adapter.rooms.get(reciever._id);
			console.log("reciever", reciever.firstName, online ? "online" : "offline");
			if (online) {
				if (triggerObject.action == "ping") {
					activityList.push({ ...reciever, activity: 'online' });
				}
				socket.broadcast.to(reciever._id).emit('trigger', { sender: triggerObject.sender, action: triggerObject.action, data: triggerObject.data });
			}
			else {
				if (triggerObject.action == "ping") {
					activityList.push({ ...reciever, activity: 'offline' });
					offlineUsers.push(reciever._id);
				}
			}
		});
		if (offlineUsers.length > 0) {
			const message = {
				notification: {
					title: 'Test Notification',
					body: 'This is a test notification from your Express server!',
					data: { someData: "ustad hotel" }
				},
				tokens: getTokens(offlineUsers)
			};
			if (sendPushNotification(message)) console.log("push notifications sent");;
		}
		if (triggerObject.action == "ping") {
			socket.emit('trigger', { sender: null, action: "activityList", data: activityList });
		}
	});
});
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const port = process.env.PORT
server.listen(port, () => console.log("Server Running on " + `${port}`));