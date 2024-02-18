import mongoose from "mongoose";

const postSchema = mongoose.Schema({
    community: { type: mongoose.Types.ObjectId, ref: "community", },
    query: { type: mongoose.Types.ObjectId, ref: "context", },
    responses: [{ type: mongoose.Types.ObjectId, ref: "context", }]
},
    { timestamps: true }
);
const postModel = mongoose.model("post", postSchema);
export default postModel