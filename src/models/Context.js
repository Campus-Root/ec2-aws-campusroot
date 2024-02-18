import mongoose from "mongoose";

const contextSchema = mongoose.Schema({
    post: { type: mongoose.Schema.Types.ObjectId, ref: "post" },
    contextType: { type: String },
    creator: { type: mongoose.Types.ObjectId, ref: "user", },
    attachment: { type: mongoose.Types.ObjectId, ref: "document" },
    content: {
        header: { type: String },
        body: { type: String },
    },
    vote: [{ type: { type: Boolean }, user: { type: mongoose.Types.ObjectId, ref: "user", }, createdAt: { type: Date, default: new Date() } }],
    comments: [{ content: { type: String }, user: { type: mongoose.Types.ObjectId, ref: "user", }, createdAt: { type: Date, default: new Date() } }],
},
    { timestamps: true }
);
const contextModel = mongoose.model("context", contextSchema);
export default contextModel