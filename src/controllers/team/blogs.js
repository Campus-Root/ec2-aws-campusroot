import Joi from "joi";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import { blogModel } from "../../models/blogs.js";
import userModel from "../../models/User.js";
import { blogSchema } from "../../schemas/blogs.js";
export const createBlog = errorWrapper(async (req, res) => {
    const { error, value } = blogSchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { title, coverImageSrc, summary, tags, content, categories, isPublished, publishedAt } = req.body;
    let newBlog = {
        title: title,
        author: req.user._id,
        coverImageSrc: coverImageSrc,
        content: content,
        summary: summary,
        tags: tags,
        categories: categories,
        isPublished: isPublished,
        publishedAt: new Date(publishedAt) || new Date(),
    }
    const blog = await blogModel.create(newBlog);
    await userModel.populate(blog, [
        { path: 'author', select: "firstName lastName displayPicSrc email userType role" },
        { path: 'likes', select: "firstName lastName displayPicSrc email userType role" },
        { path: 'comments.user', select: "firstName lastName displayPicSrc email userType role" },
    ]);
    return { statusCode: 200, message: "Blog created successfully", data: blog };
})
export const getBlogs = errorWrapper(async (req, res) => {
    const blogs = await blogModel.find({ author: req.user._id }).populate("author comments.user likes", "firstName lastName displayPicSrc email userType role").sort({ createdAt: -1 });
    return { statusCode: 201, message: "Blogs fetched successfully", data: newBlog };
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