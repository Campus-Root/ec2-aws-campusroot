import mongoose from "mongoose";

const reviewsSchema = mongoose.Schema({
    user: { type: mongoose.Types.ObjectId, ref: "user", },
    university: { type: mongoose.Types.ObjectId, ref: "university", },
    comment: { type: String },
    rating: { type: Number }
},
    { timestamps: true }
);


const reviewsModel = mongoose.model("reviews", reviewsSchema);
export default reviewsModel