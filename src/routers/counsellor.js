import express from "express";
import { authMiddleware, isCounsellor } from "../middleware/auth.js";
import { approval } from "../controllers/team/counsellor/application.js";
import { deleteRecommend, recommend, switchStage } from "../controllers/team/counsellor/student.js";
const router = express.Router();
//        http://localhost:8080/api/v1/counsellor/
router.post("/stage", authMiddleware, isCounsellor, switchStage);
router.post("/recommend", authMiddleware, isCounsellor, recommend);
router.post("/delete-recommendation", authMiddleware, isCounsellor, deleteRecommend)
router.post("/approval", authMiddleware, isCounsellor, approval)
export default router;