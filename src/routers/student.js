// studentRouter

import express from "express";
import { editReview, editProfile, postReview, profile, activity, addShortListed, allStudents, userNameAvailability, verifyEmail, generateRecommendations, apply, uploadInProfile, uploadInApplication, deleteUploadedInProfile, deleteUploadedFromApplication, requestCancellation, removeShortListed, downloadDocument, getEvents, bookSlot, bookedSlots, singleStudent, sendUserOTP, verifyUserOTP, forceForwardApply, removeForceApply } from "../controllers/student/index.js";
import { handleFile } from "../middleware/handleFile.js";
import { authMiddleware, isStudent } from "../middleware/auth.js";



const router = express.Router();
//        {{base}}/api/v1/student

router.post("/post-review", authMiddleware, isStudent, postReview);
router.put("/edit-review", authMiddleware, isStudent, editReview);

router.get("/dashboard", authMiddleware, isStudent, activity);
router.get("/check-availability/:userName", authMiddleware, isStudent, userNameAvailability);
router.post("/verify-email", authMiddleware, isStudent, verifyEmail);
router.post("/send-sms-otp", authMiddleware, isStudent, sendUserOTP)
router.post("/verify-sms-otp", authMiddleware, isStudent, verifyUserOTP)

router.get("/profile", authMiddleware, isStudent, profile);
router.put("/profile", authMiddleware, isStudent, editProfile);
router.get("/counsellor-events", authMiddleware, isStudent, getEvents)
router.post("/book-slot", authMiddleware, isStudent, bookSlot)
router.get("/booked-slots", authMiddleware, isStudent, bookedSlots)
router.put("/generate-recommendations", authMiddleware, isStudent, generateRecommendations);
router.post("/add-to-short-list", authMiddleware, isStudent, addShortListed);
router.patch("/edit-short-list/:id", authMiddleware, isStudent, removeShortListed);



router.post("/upload-profile", authMiddleware, isStudent, handleFile, uploadInProfile);
router.post("/delete-uploaded-profile", authMiddleware, isStudent, deleteUploadedInProfile);


router.get("/download/:documentId", authMiddleware, isStudent, downloadDocument);


router.post("/apply", authMiddleware, isStudent, apply)
router.post("/apply-force", authMiddleware, isStudent, forceForwardApply)
router.post("/apply-omit-force", authMiddleware, isStudent, removeForceApply)
router.post("/upload-application", authMiddleware, isStudent, handleFile, uploadInApplication);
router.post("/delete-uploaded-application/", authMiddleware, isStudent, deleteUploadedFromApplication);
router.put("/request-cancellation/:applicationId", authMiddleware, isStudent, requestCancellation);


router.get("/all-students", authMiddleware, isStudent, allStudents)
router.get("/single-student/:studentId", authMiddleware, isStudent, singleStudent)
export default router;