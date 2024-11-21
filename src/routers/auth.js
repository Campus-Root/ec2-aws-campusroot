import express from "express";
import { Login, Logout, TeamLogin, verifyStudentLoginOTP } from "../controllers/auth/login.js";
import { TeamRegister, googleLogin } from "../controllers/auth/register.js";
import { authMiddleware, isAdmin } from "../middleware/auth.js";
import { checkDisposableEmail } from "../middleware/validations.js";
import { customRateLimiter } from "../middleware/ratelimiter.js";

const router = express.Router();
//        {{localhost:5000}}/api/v1/auth/team-login
router.post("/team-login", TeamLogin)
router.post("/login", checkDisposableEmail, customRateLimiter, Login);
router.post("/verify-user", verifyStudentLoginOTP);
router.post("/team-register", authMiddleware, isAdmin, TeamRegister);
router.post("/logout", authMiddleware, Logout)
router.post("/google/login", googleLogin)
export default router;