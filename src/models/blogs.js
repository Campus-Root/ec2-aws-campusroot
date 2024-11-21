import mongoose from "mongoose"

const blogSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, },
    coverImageSrc: { type: String, required: true, },
    content: { type: String, required: true },
    summary: { type: String, trim: true },
    tags: [{ type: String, trim: true, }],
    categories: [{ type: String, trim: true, }],
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: Date.now },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
            content: { type: String, required: true, trim: true, },
            createdAt: { type: Date, default: Date.now, },
        },
    ],
},
    { timestamps: true }
);

export const blogModel = mongoose.model("blog", blogSchema);

