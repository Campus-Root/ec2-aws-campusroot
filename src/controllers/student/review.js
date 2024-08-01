import reviewsModel from "../../models/Reviews.js";
import universityModel from "../../models/University.js";
import userModel from "../../models/User.js";
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import 'dotenv/config';
export const postReview = errorWrapper(async (req, res, next) => {
    const university = await universityModel.findById(req.body.universityId);
    if (!university) return { statusCode: 400, data: null, message: `invalid university ID` };
    const post = await reviewsModel.create({ user: req.user._id, university: university._id, comment: req.body.comment, rating: req.body.rating, });
    await university.updateOne({ $push: { 'userReviews': post._id } });
    req.user.logs.push({
        action: `review on university posted`,
        details: `reviewId:${post._id}`
    })
    await userModel.populate(post, { path: "user", select: "firstName lastName displayPicSrc" })
    await req.user.save()
    return ({ statusCode: 200, message: `review posted successfully`, data: post });
})
export const editReview = errorWrapper(async (req, res, next) => {
    const { comment, rating, universityId, action, id } = req.body;
    const post = await reviewsModel.findById(id);
    if (post.user !== req.user._id) return { statusCode: 400, data: null, message: `invalid edit permissions` };
    if (action == "delete") {
        const university = await universityModel.findById(universityId);
        if (!university) return {
            statusCode: 400, data: null, message: `invalid university ID`
        };
        await Promise.all([
            await university.updateOne({ $pull: { 'userReviews': id } }),
            await reviewsModel.findByIdAndDelete(id)
        ])
        req.user.logs.push({
            action: `review on university updated`,
            details: `reviewId:${id}`
        })
        await userModel.populate(post, { path: "user", select: "firstName lastName displayPicSrc" })
        await req.user.save()
        return ({ statusCode: 200, message: `post deleted`, data: null });
    }
    if (!post) return {
        statusCode: 400, data: null, message: `invalid review ID`
    };
    if (comment) post.comment = comment;
    if (rating) post.rating = rating;
    await userModel.populate(post, { path: "user", select: "firstName lastName displayPicSrc" })
    await post.save();
    return ({ statusCode: 200, message: `review updated`, data: post });
})