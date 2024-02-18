import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
    name: { type: String },
    data: { type: Buffer },
    contentType: { type: String },
    user: { type: mongoose.Types.ObjectId, ref: "user" },
    viewers: [{ type: mongoose.Types.ObjectId, ref: "user" }],
    type: { type: String }
}, { timestamps: true });
const Document = mongoose.model('document', documentSchema);
export default Document