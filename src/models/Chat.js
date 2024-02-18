import mongoose from "mongoose"
const chatSchema = mongoose.Schema({
    chatName: { type: String },
    unSeenMessages: [{
        message: { type: mongoose.Schema.Types.ObjectId, ref: "message" },
        seen: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" },]
    }],
    lastMessage:{ type: mongoose.Schema.Types.ObjectId, ref: "message" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    admins:[{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    settings:{type:Object},
    displayPicSrc:{type:String}
},
    { timestamps: true }
);


const chatModel = mongoose.model("chat", chatSchema);
export default chatModel


