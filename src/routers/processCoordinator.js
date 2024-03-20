import express from "express";
import { addToChecklist, cancellation, editItemInChecklist, profile, revertResult, singleApplications, downloadDoc, singleStudentProfile, result, switchStage, applicationListings, generatingAuthUrl, googleAuthentication, calendarEvents } from "../controllers/processCoordinator/index.js";
import { handleFile } from "../middleware/handleFile.js";
import { authMiddleware, isProcessCoordinator } from "../middleware/auth.js";




const router = express.Router();
//        {{base}}/api/v1/process-coordinator
// 
router.get("/", authMiddleware, isProcessCoordinator, profile);
router.get("/students/:id", authMiddleware, isProcessCoordinator, singleStudentProfile);
router.get("/applications/:applicationId", authMiddleware, isProcessCoordinator, singleApplications); //
router.post("/switch-stage", authMiddleware, isProcessCoordinator, switchStage);
router.post("/add-to-checklist", authMiddleware, isProcessCoordinator, handleFile, addToChecklist)
router.post("/edit-in-checklist", authMiddleware, isProcessCoordinator, editItemInChecklist)
// router.post("/update-status", authMiddleware, isProcessCoordinator, changeStatus);
router.get("/google", generatingAuthUrl)
router.get("/google/login", googleAuthentication)
router.get("/events", authMiddleware, isProcessCoordinator, calendarEvents)
router.get("/doc/:documentId", authMiddleware, isProcessCoordinator, downloadDoc); 
router.post("/application-listing", authMiddleware, isProcessCoordinator, applicationListings);
router.post("/cancellation", authMiddleware, isProcessCoordinator, cancellation);  



router.post("/result", authMiddleware, isProcessCoordinator, result)  
router.post("/revert-result", authMiddleware, isProcessCoordinator, revertResult)  



export default router;
