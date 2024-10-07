import { Router } from 'express';
import zohoFormsRouter from "./zohoForms.js"
const router = Router();

router.use("/zoho-forms", zohoFormsRouter);


export default router;
