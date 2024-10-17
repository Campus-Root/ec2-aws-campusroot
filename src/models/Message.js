
import mongoose from "mongoose"

const messageSchema = mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    content: { type: String, trim: true },
    document: { type: mongoose.Types.ObjectId, ref: "document" },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "chat" },
    repliedTo: { type: mongoose.Schema.Types.ObjectId, ref: "message" }
},
    { timestamps: true }
);


const messageModel = mongoose.model("message", messageSchema);

export default messageModel