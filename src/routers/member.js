import { downloadDoc, listings, profile, profileEdit, singleApplications, singleStudentProfile } from "../controllers/team/index.js";
import { calendarEvents, generatingAuthUrl, googleAuthentication } from "../controllers/team/calendar.js";
import { authMiddleware, isTeam } from "../middleware/auth.js";
import express from "express";


const router = express.Router();
//        {{base}}/api/v1/member
router.get("/", authMiddleware, isTeam, profile)
router.put("/", authMiddleware, isTeam, profileEdit)
router.get("/doc/:documentId", authMiddleware, isTeam, downloadDoc);
router.post("/listings/:name", authMiddleware, isTeam,listings)
router.get("/students/:id", authMiddleware, isTeam, singleStudentProfile);
router.get("/applications/:id", authMiddleware, isTeam, singleApplications);
router.get("/google", generatingAuthUrl)
router.get("/google/login", googleAuthentication)
router.get("/events", authMiddleware, isTeam, calendarEvents)

export default router;
