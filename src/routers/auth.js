import express from "express";
import { Login, Logout, verifyStudentLoginOTP } from "../controllers/auth/login.js";
import { TeamRegister, googleLogin, linkedLogin } from "../controllers/auth/register.js";
import { authMiddleware, isAdmin } from "../middleware/auth.js";
import { checkDisposableEmail} from "../middleware/validations.js";

const router = express.Router();
//        {{localhost:5000}}/api/v1/auth

router.post("/login", checkDisposableEmail, Login);
router.post("/verify-login", verifyStudentLoginOTP);
router.post("/team-register", authMiddleware, isAdmin, TeamRegister);
router.post("/logout", authMiddleware, Logout)
router.post("/google/login", googleLogin)
router.post("/linkedin/login", linkedLogin)
export default router;