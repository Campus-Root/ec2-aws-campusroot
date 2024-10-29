import { errorWrapper } from "../../middleware/errorWrapper.js";

export const paymentStatus = errorWrapper(async (req, res, next, session) => {       // this is to verify payments

})
export const blogs = errorWrapper(async (req, res) => {
    return { statusCode: 200, message: `the blog that you've sent`, data: req.body };
})