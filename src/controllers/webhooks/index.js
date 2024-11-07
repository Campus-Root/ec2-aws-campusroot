import { errorWrapper } from "../../middleware/errorWrapper.js";

export const paymentStatus = errorWrapper(async (req, res, next, session) => {       // this is to verify payments

})
// listing of blogs
// single blog 
// create blog
export const blogs = errorWrapper(async (req, res) => {
    return { statusCode: 200, message: `the blog that you've sent`, data: req.body };
})


const blogSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, },
    coverImageSrc:{type: String, required: true,},
    content: { type: String, required: true },
    summary: { type: String, trim: true },
    tags: [{ type: String, trim: true, }],
    categories: [{ type: String, trim: true, }],
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            content: { type: String, required: true, trim: true, },
            createdAt: { type: Date, default: Date.now, },
        },
    ],
},
    { timestamps: true }
);

