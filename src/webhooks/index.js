import { Router } from 'express';
import zohoFormsRouter from "./zohoForms.js"
import { blogs } from '../controllers/webhooks/index.js';
const router = Router();

router.use("/zoho-forms", zohoFormsRouter);
router.post('/blog', blogs)

export default router;
