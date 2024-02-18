import express from "express";
import { allCounsellors, allDevelopers, allStudents, allprocessCoordinators, search, singleStudent, student_transfer } from "../controllers/admin/index.js";
import { authMiddleware, isAdmin } from "../middleware/auth.js";


const router = express.Router();
//        {{localhost:5000}}/api/v1/admin


router.get("/students", authMiddleware, isAdmin, allStudents);
router.get("/student/:id", authMiddleware, isAdmin, singleStudent);
router.get("/counsellors", authMiddleware, isAdmin, allCounsellors);
router.get("/team-members", authMiddleware, isAdmin, allprocessCoordinators);
router.get("/developers", authMiddleware, isAdmin, allDevelopers);
router.get("/search", authMiddleware, isAdmin, search);
router.post("/student-transfer", authMiddleware, isAdmin, student_transfer);
export default router;