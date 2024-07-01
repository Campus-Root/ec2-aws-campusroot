// studentRouter
import express from "express";
import { handleFile } from "../middleware/handleFile.js";
import { authMiddleware, isStudent } from "../middleware/auth.js";
import { checkDisposableEmail } from "../middleware/validations.js";
import { bookSlot, getEvents, modifySlot } from "../controllers/student/slots.js";
import { editReview, postReview } from "../controllers/student/review.js";
import { dashboard, allStudents, downloadDocument, generateRecommendations, singleStudent, hideRecommendation } from "../controllers/student/index.js";
import { deleteUploadedInProfile, editEmail, editPhone, editProfile, profile, requestCounsellor, sendUserOTP, uploadInProfile, verifyEmail, verifyUserOTP } from "../controllers/student/profile.js";
import { addShortListed, apply, deleteUploadedFromApplication, forceForwardApply, removeForceApply, removeShortListed, requestCancellation, uploadInApplication } from "../controllers/student/application.js";
const router = express.Router();
//        {{base}}/api/v1/student

router.post("/post-review", authMiddleware, isStudent, postReview);
router.put("/edit-review", authMiddleware, isStudent, editReview);

router.get("/dashboard", authMiddleware, isStudent, dashboard);
router.post("/verify-email", authMiddleware, isStudent, verifyEmail);
router.post("/send-sms-otp", authMiddleware, isStudent, sendUserOTP)
router.post("/verify-sms-otp", authMiddleware, isStudent, verifyUserOTP)

router.get("/profile", authMiddleware, isStudent, profile);
router.put("/profile", authMiddleware, isStudent, editProfile);
router.put("/phone", authMiddleware, isStudent, editPhone);
router.put("/email", authMiddleware, isStudent, checkDisposableEmail, editEmail);


router.post("/request-counsellor",authMiddleware, isStudent, requestCounsellor)
router.get("/events/:teamMemberId", authMiddleware, isStudent, getEvents)
router.post("/book-slot/:teamMemberId", authMiddleware, isStudent, bookSlot)
router.post("/modify-slot", authMiddleware, isStudent, modifySlot)
router.put("/generate-recommendations", authMiddleware, isStudent, generateRecommendations);
router.put("/hide-recommendation", authMiddleware, isStudent, hideRecommendation);
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