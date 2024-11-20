import { errorWrapper } from "../../middleware/errorWrapper.js";

export const paymentStatus = errorWrapper(async (req, res, next, session) => {       // this is to verify payments

})