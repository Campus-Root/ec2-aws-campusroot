import express from "express";
import { approval, generatingAuthUrl, profile, profileEdit, recommend, googleAuthentication, singleStudentProfile, calendarEvents, switchStage, applications, deleteRecommend } from "../controllers/counsellor/index.js";
import { authMiddleware, isCounsellor } from "../middleware/auth.js";



const router = express.Router();
//        http://localhost:8080/api/v1/counsellor/
router.get("/", authMiddleware, isCounsellor, profile);
router.get("/single-student/:id", authMiddleware, isCounsellor, singleStudentProfile);
router.post("/stage", authMiddleware, isCounsellor, switchStage);
router.post("/", authMiddleware, isCounsellor, profileEdit);
router.post("/recommend", authMiddleware, isCounsellor, recommend);
router.get("/applications", authMiddleware, isCounsellor, applications);
router.post("/approval", authMiddleware, isCounsellor, approval)
router.get("/google", generatingAuthUrl)
router.get("/google/login", googleAuthentication)
router.get("/events", authMiddleware, isCounsellor, calendarEvents)
router.post("/delete-recommendation", authMiddleware, isCounsellor, deleteRecommend)
// router.get("/new-students", authMiddleware, isCounsellor, newStudents);
// router.put("/new-students/:id", authMiddleware, isCounsellor, acceptNewStudent);

export default router;