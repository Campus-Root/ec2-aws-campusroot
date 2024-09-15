// studentRouter
import express from "express";
import { handleFile } from "../middleware/handleFile.js";
import { authMiddleware, isStudent } from "../middleware/auth.js";
import { checkDisposableEmail, isPaid, validatePayment, validateProducts } from "../middleware/validations.js";
import { bookSlot, getEvents, modifySlot } from "../controllers/student/slots.js";
import { editReview, postReview } from "../controllers/student/review.js";
import { dashboard, allStudents, downloadDocument, generateRecommendations, singleStudent, hideRecommendation, deleteData, deleteAccount } from "../controllers/student/index.js";
import { deleteUploadedInProfile, editEmail, editPhone, editProfile, IEH, profile, requestCounsellor, sendUserOTP, uploadInProfile, verifyEmail, verifyUserOTP } from "../controllers/student/profile.js";
import { wishList, deleteUploadedFromApplication, forceForwardApply, removeForceApply, requestCancellation, checkout, uploadInApplication, paymentVerification, orderInfo, Cart, reCheckout, paySummary, addingProductsToOrder } from "../controllers/student/application.js";
const router = express.Router();
//        {{base}}/api/v1/student
router.post("/ieh", authMiddleware, isStudent, handleFile, IEH);
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


router.post("/request-counsellor", authMiddleware, isStudent, requestCounsellor)
router.get("/events/:teamMemberId", authMiddleware, isStudent, getEvents)
router.post("/book-slot/:teamMemberId", authMiddleware, isStudent, bookSlot)
router.post("/modify-slot", authMiddleware, isStudent, modifySlot)
router.put("/generate-recommendations", authMiddleware, isStudent, generateRecommendations);
router.put("/hide-recommendation", authMiddleware, isStudent, hideRecommendation);
router.post("/wish-list", authMiddleware, isStudent, wishList);
router.post("/cart", authMiddleware, isStudent, Cart)

router.post("/upload-profile", authMiddleware, isStudent, handleFile, uploadInProfile);
router.post("/delete-uploaded-profile", authMiddleware, isStudent, deleteUploadedInProfile);


router.get("/download/:documentId", authMiddleware, isStudent, downloadDocument);

router.post("/payment-summary", authMiddleware, isStudent, paySummary)
router.post("/checkout", authMiddleware, isStudent, checkout)
router.get("/re-checkout", authMiddleware, isStudent, reCheckout)
router.post("/payment-verification", isPaid, paymentVerification)
router.post("/order", authMiddleware, isStudent, validatePayment, validateProducts, addingProductsToOrder)
router.get('/order', authMiddleware, isStudent, orderInfo)
router.post("/apply-force", authMiddleware, isStudent, forceForwardApply)
router.post("/apply-omit-force", authMiddleware, isStudent, removeForceApply)
router.post("/upload-application", authMiddleware, isStudent, handleFile, uploadInApplication);
router.post("/delete-uploaded-application/", authMiddleware, isStudent, deleteUploadedFromApplication);
router.put("/request-cancellation/:applicationId", authMiddleware, isStudent, requestCancellation);
router.put('/delete-data', authMiddleware, isStudent, deleteData)
router.put('/delete-account', authMiddleware, isStudent, deleteAccount)
router.get("/all-students", authMiddleware, isStudent, allStudents)
router.get("/single-student/:studentId", authMiddleware, isStudent, singleStudent)
export default router;