import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import bodyParser from 'body-parser';
import cookieParser from "cookie-parser";
import session from 'express-session'
import cors from "cors";
import { connect as dbConnect } from "./utils/dbConnection.js";
import morgan from "morgan";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import notFoundMiddleware from "./middleware/notFound.js";
import errorHandlerMiddleware from "./middleware/errorHandler.js";
import compression from 'compression';
import cluster from "cluster";
import os from "os";
import 'dotenv/config';
import { startCronJob } from "./utils/cron.js";
// import { rateLimit } from 'express-rate-limit'
import path from 'path';
import { fileURLToPath } from 'url';

// Import router and notification function
import indexRouter from "./routers/index.js";
import { sendNotification } from "./utils/sendNotification.js";

// Get filename and dirname using the URL module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const server = createServer(app);

// Start cron job and connect to the database
startCronJob();
dbConnect();

// Serve static files from the 'build' directory
app.use(express.static(path.join(__dirname, 'build')));

// Set up session middleware
app.use(session({
	secret: 'sessionSecret', // Replace with a secret key for session encryption
	resave: false,
	saveUninitialized: false,
}));

// Define CORS whitelist
const whitelist = ["https://campusroot.com"];

// Set up CORS options
const corsOptions = {
	origin(origin, callback) {
		if (!origin) return callback(null, true); // For mobile app and Postman client
		if (whitelist.indexOf(origin) !== -1) callback(null, true);
		else callback(new Error("Not allowed by CORS"));
	},
	methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
	credentials: true,
	optionsSuccessStatus: 200
};

// Apply middleware
app.use(compression({ level: 6, threshold: 10 * 100 }));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(express.json({ type: ["application/json", "text/plain"], }));
app.use(helmet.contentSecurityPolicy({ directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com", "https://res.cloudinary.com", "https://www.4icu.org/", "https://icon-library.com/", "blob:"], }, }));
app.use(mongoSanitize());
app.use(morgan("tiny"));
// app.use(rateLimit({
// 	windowMs: 1 * 60 * 1000, // 1 minute
// 	limit: 30, // Limit each IP to 10 requests per `window` (here, per 1 minutes)
// 	message: 'Too many requests from this IP, please try again after 2 minutes',  
// 	standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
// 	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
// }))


// const apiLimiter = rateLimit({
// 	windowMs: 1 * 60 * 1000, // 1 minute
// 	max: 30, // Limit each IP to 30 requests per window
// 	message: 'Too many requests from this IP, please try again after 2 minutes',
// 	headers: true // Include headers in the response
//   });                                                            put this as middleware where ever it is necessary


// // Apply rate limiter middleware to a specific route
// app.get('/api/v1/specific-route', apiLimiter, function(req, res) {
// 	// Your route logic here
// 	res.send('This is the specific route with rate limiting');
//   });

//   // Other routes without rate limiting
//   app.get('/', function(req, res) {
// 	res.send('server up and running');
//   });






// Define routes
app.use("/api/v1", indexRouter);
app.get('/*', function (req, res) {
	res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Implement clustering
if (cluster.isMaster) {
	const numCPUs = os.cpus().length;

	// Fork workers
	for (let i = 0; i < numCPUs; i++) {
		cluster.fork();
	}

	cluster.on('exit', (worker, code, signal) => {
		console.log(`Worker ${worker.process.pid} died`);
	});
} else {
	// Worker process
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
			console.log(profile.name + " joined");
		})
		socket.on('trigger', (triggerObject) => {
			console.log(triggerObject.action, triggerObject.sender.name);
			var activityList = [];
			triggerObject.recievers.forEach(reciever => {
				var online = io.sockets.adapter.rooms.get(reciever._id);
				console.log("reciever", reciever.name, online ? "online" : "offline");
				if (online) {
					if (triggerObject.action == "ping") {
						activityList.push({ ...reciever, activity: 'online' });
					}
					socket.broadcast.to(reciever._id).emit('trigger', { sender: triggerObject.sender, action: triggerObject.action, data: triggerObject.data });
				}
				else {
					if (triggerObject.action == "ping") {
						activityList.push({ ...reciever, activity: 'offline' });
						// const message = {
						// 	notification: {
						// 		title: 'Test Notification',
						// 		body: 'This is a test notification from your Express server!'
						// 	},
						// 	token: 'reciever token' 
						// };
						// sendNotification(message,recieverId)
					}
				}
			});
			if (triggerObject.action == "ping") {
				socket.emit('trigger', { sender: null, action: "activityList", data: activityList });
			}
		});
	});



	// Start server
	const port = process.env.PORT || 3000;
	server.listen(port, () => console.log(`Server running on port ${port}`));
}

// Handle 404 errors
app.use(notFoundMiddleware);

// Handle errors
app.use(errorHandlerMiddleware);
