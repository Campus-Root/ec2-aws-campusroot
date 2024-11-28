import mongoose from "mongoose";

const destinationSchema = mongoose.Schema({
        title: { type: String, required: true, trim: true, },
        author: { type: mongoose.Types.ObjectId, ref: "user", required: true, },
        coverImageSrc: { type: String, required: true, },
        content: { type: String, required: true }
},
    { timestamps: true }
);
const destinationModel = mongoose.model("destination", destinationSchema);
export default destinationModel