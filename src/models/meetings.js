import mongoose from "mongoose";

const meetingSchema = mongoose.Schema({
    user: { type: mongoose.Types.ObjectId, ref: "user" },
    member: { type: mongoose.Types.ObjectId, ref: "user" },
    data: { type: Object },
    status: { type: String } // cancelled successful userDidNotShowup upcoming report
},
    { timestamps: true }
);
const meetingModel = mongoose.model("meeting", meetingSchema);
export default meetingModel