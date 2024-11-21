import Joi from "joi";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import { blogModel } from "../../models/blogs.js";
import userModel from "../../models/User.js";

export const blogSchema = Joi.object({
    title: Joi.string().required(), // Title is required
    coverImageSrc: Joi.string().uri().required(), // Must be a valid URI and required
    content: Joi.string().required(), // Content is required
    summary: Joi.string().allow("").optional(), // Optional and allows empty string
    tags: Joi.array().items(Joi.string().trim()).optional(), // Array of strings
    categories: Joi.array().items(Joi.string().trim()).optional(), // Array of strings
    isPublished: Joi.boolean().default(false), // Boolean with default value of false
    publishedAt: Joi.date().optional().allow(null), // Optional date, can be null if not published
});



// views: { type: Number, default: 0 },
// likes: [{ type: mongoose.Types.ObjectId, ref: "user", }],
// comments: [
//     {
//         user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//         content: Joi.string(),
//         createdAt: { type: Date, default: Date.now, },
//     },
// ],
export const createBlog = errorWrapper(async (req, res) => {
    const { error, value } = blogSchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { title, coverImageSrc, content, summary, tags, categories, isPublished, publishedAt } = value;
    console.log("author", JSON.stringify(req.user));
    const blog = await blogModel.create({ title, coverImageSrc, content, summary, tags, categories, isPublished, publishedAt: new Date(publishedAt) || new Date(), author: req.user._id });
    await userModel.populate(blog, [
        { path: 'author', select: "firstName lastName displayPicSrc email userType role" },
        { path: 'likes', select: "firstName lastName displayPicSrc email userType role" },
        { path: 'comments.user', select: "firstName lastName displayPicSrc email userType role" },
    ]);
    return { statusCode: 201, message: "Blog created successfully", data: blog };
})
export const getBlogs = errorWrapper(async (req, res) => {
    const blogs = await blogModel.find({ author: req.user._id }).populate("author comments.user likes", "firstName lastName displayPicSrc email userType role").sort({ createdAt: -1 });
    return { statusCode: 201, message: "Blogs fetched successfully", data: blogs };
})
export const updateBlog = errorWrapper(async (req, res) => {
    const { error, value } = blogSchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { title, coverImageSrc, content, summary, tags, categories, isPublished, publishedAt } = value;
    const updatedBlog = await blogModel.findByIdAndUpdate(req.params.id, { title, coverImageSrc, content, summary, tags, categories, isPublished, publishedAt }, {
        new: true,
        runValidators: true
    }).populate("author comments.user likes", "firstName lastName displayPicSrc email userType role").sort({ createdAt: -1 });
    if (!updatedBlog) return { statusCode: 400, message: "Blog post not found", data: null };
    return { statusCode: 201, message: "Blog updated successfully", data: updatedBlog };
})
export const deleteBlog = errorWrapper(async (req, res) => {
    const deletedBlog = await blogModel.findByIdAndDelete(req.params.id);
    if (!deletedBlog) return { statusCode: 404, message: "Blog post not found", data: deletedBlog };
    return { statusCode: 201, message: "Blog post deleted successfully", data: null };
})