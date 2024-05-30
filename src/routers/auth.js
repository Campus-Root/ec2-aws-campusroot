import express from "express";
import { Login, forgotPassword, Logout, verifyOtp } from "../controllers/auth/login.js";
import { StudentRegister, TeamRegister, googleLogin, verifyEmail } from "../controllers/auth/register.js";
import { authMiddleware, isAdmin } from "../middleware/auth.js";
import { checkDisposableEmail, validateCredentials, validationErrorMiddleware } from "../middleware/validations.js";

const router = express.Router();
//        {{localhost:5000}}/api/v1/auth

router.post("/login", Login);
router.post("/student-register", validateCredentials, validationErrorMiddleware, checkDisposableEmail, StudentRegister);
router.get("/verify/:email/:emailVerificationString", verifyEmail)
router.post("/team-register", authMiddleware, isAdmin, TeamRegister);
router.post("/logout",authMiddleware,Logout)
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/google/login", googleLogin)
export default router;