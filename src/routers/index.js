import { Router } from 'express';
import authRouter from "./auth.js";
import studentRouter from "./student.js"
import counsellorRouter from "./counsellor.js"
import adminRouter from "./admin.js"
import developerRouter from "./developer.js"
import communicationRouter from "./communication.js"
import publicRouter from "./public.js"
import memberRouter from "./member.js"
import processCoordinatorRouter from "./processCoordinator.js"
import xssReqSanitizer from 'xss-req-sanitizer';
const router = Router();
router.use("/member",memberRouter);
router.use(xssReqSanitizer())
router.use("/auth", authRouter);
router.use("/student", studentRouter);
router.use("/admin", adminRouter);
router.use("/developer", developerRouter);
router.use("/counsellor", counsellorRouter);
router.use("/process-coordinator", processCoordinatorRouter);
router.use("/communication", communicationRouter);
router.use("/public", publicRouter)

export default router;
