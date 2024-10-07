import express from "express";
import { registration } from "../controllers/webhooks/zoho-forms.js";


const router = express.Router();
//        /api/v1/zoho-forms/participant-registration
router.post("/participant-registration", registration)
export default router;