import express from "express";
import {addToChecklist, cancellation, editItemInChecklist, result, revertResult, switchStage  } from "../controllers/team/processCoordinator/applications.js";
// import { handleFile } from "../middleware/handleFile.js";
import { authMiddleware, isProcessCoordinator } from "../middleware/auth.js";
import { handleFile } from "../middleware/handleFile.js";


const router = express.Router();
//        {{base}}/api/v1/process-coordinator


router.post("/switch-stage", authMiddleware, isProcessCoordinator, switchStage);
router.post("/add-to-checklist", authMiddleware, isProcessCoordinator, handleFile, addToChecklist)
router.post("/edit-in-checklist", authMiddleware, isProcessCoordinator, editItemInChecklist)
// router.post("/update-status", authMiddleware, isProcessCoordinator, changeStatus);
router.post("/cancellation", authMiddleware, isProcessCoordinator, cancellation);



router.post("/result", authMiddleware, isProcessCoordinator, result)
router.post("/revert-result", authMiddleware, isProcessCoordinator, revertResult)



export default router;
