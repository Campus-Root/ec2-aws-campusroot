import Joi from "joi";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import { blogModel } from "../../models/blogs.js";
import userModel from "../../models/User.js";
import { blogSchema, CountrySchema } from "../../schemas/blogs.js";
import destinationModel from "../../models/Destination.js";
export const createBlog = errorWrapper(async (req, res) => {
    const { error, value } = blogSchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { title, coverImageSrc, summary, tags, content, categories, isPublished, publishedAt } = value;
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
    return { statusCode: 200, message: "Blogs fetched successfully", data: blogs };
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
    return { statusCode: 200, message: "Blog updated successfully", data: updatedBlog };
})
export const deleteBlog = errorWrapper(async (req, res) => {
    const deletedBlog = await blogModel.findByIdAndDelete(req.params.id);
    if (!deletedBlog) return { statusCode: 404, message: "Blog post not found", data: deletedBlog };
    return { statusCode: 200, message: "Blog post deleted successfully", data: null };
})

export const createCountry = errorWrapper(async (req, res) => {
    const { error, value } = CountrySchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { title, coverImageSrc, content } = value;
    let newCountry = {
        title: title,
        author: req.user._id,
        coverImageSrc: coverImageSrc,
        content: content
    }
    const country = await destinationModel.create(newCountry);
    await userModel.populate(country, [
        { path: 'author', select: "firstName lastName displayPicSrc email userType role" },
    ]);
    return { statusCode: 200, message: "country created successfully", data: country };
})
export const getCountry = errorWrapper(async (req, res) => {
    const destination = await destinationModel.find({ author: req.user._id }).populate("author comments.user likes", "firstName lastName displayPicSrc email userType role").sort({ createdAt: -1 });
    return { statusCode: 200, message: "Country fetched successfully", data: destination };
})
export const updateCountry = errorWrapper(async (req, res) => {
    const { error, value } = CountrySchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { title, coverImageSrc, content } = value;
    const updatedDestination = await destinationModel.findByIdAndUpdate(req.params.id, { title, coverImageSrc, content }, {
        new: true,
        runValidators: true
    }).populate("author", "firstName lastName displayPicSrc email userType role").sort({ createdAt: -1 });
    if (!updatedDestination) return { statusCode: 400, message: "Country post not found", data: null };
    return { statusCode: 200, message: "Country updated successfully", data: updatedDestination };
})
export const deleteCountry = errorWrapper(async (req, res) => {
    const destination = await destinationModel.findByIdAndDelete(req.params.id);
    if (!destination) return { statusCode: 404, message: "Blog post not found", data: destination };
    return { statusCode: 200, message: "Country post deleted successfully", data: null };
})