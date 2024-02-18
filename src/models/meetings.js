import mongoose from "mongoose";

const meetingSchema = mongoose.Schema({
    user: { type: mongoose.Types.ObjectId, ref: "user" },
    counsellor: { type: mongoose.Types.ObjectId, ref: "user" },
    data: { type: Object }
},
    { timestamps: true }
);
const meetingModel = mongoose.model("meeting", meetingSchema);
export default meetingModel