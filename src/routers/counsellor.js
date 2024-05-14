import express from "express";
import { authMiddleware, isCounsellor } from "../middleware/auth.js";


import {profile, profileEdit} from '../controllers/counsellor/index.js'
import {deleteRecommend, recommend, singleStudentProfile, students, switchStage} from '../controllers/counsellor/student.js'
import { applications, approval, singleApplications } from "../controllers/counsellor/application.js";
import { calendarEvents, generatingAuthUrl, googleAuthentication } from "../controllers/counsellor/calendar.js";


const router = express.Router();
//        http://localhost:8080/api/v1/counsellor/
router.get("/", authMiddleware, isCounsellor, profile);
router.post("/", authMiddleware, isCounsellor, profileEdit);


router.get("/google", generatingAuthUrl)
router.get("/google/login", googleAuthentication)
router.get("/events", authMiddleware, isCounsellor, calendarEvents)


router.post("/students", authMiddleware, isCounsellor, students);
router.get("/single-student/:id", authMiddleware, isCounsellor, singleStudentProfile);
router.post("/applications", authMiddleware, isCounsellor, applications);
router.get("/application/:id", authMiddleware, isCounsellor, singleApplications);

router.post("/stage", authMiddleware, isCounsellor, switchStage);
router.post("/recommend", authMiddleware, isCounsellor, recommend);
router.post("/delete-recommendation", authMiddleware, isCounsellor, deleteRecommend)


router.post("/approval", authMiddleware, isCounsellor, approval)








export default router;