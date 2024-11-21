import Joi from "joi";

export const blogSchema = Joi.object({
    title: Joi.string().required(), // Title is required
    coverImageSrc: Joi.string().uri().required(), // Must be a valid URI
    content: Joi.string().required(), // Content is required (can hold HTML)
    summary: Joi.string().allow("").optional(), // Optional and allows an empty string
    tags: Joi.array().items(Joi.string().trim()).default([]), // Array of strings with default empty array
    categories: Joi.array().items(Joi.string().trim()).default([]), // Array of strings with default empty array
    isPublished: Joi.boolean().default(false), // Boolean with a default value of false
    publishedAt: Joi.date().optional(), // Optional date; defaults will be set dynamically
});