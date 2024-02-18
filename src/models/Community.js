import mongoose from "mongoose"
const communitySchema = mongoose.Schema({
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "post" }],
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    university: { type: mongoose.Types.ObjectId, ref: "university", },
    settings: { type: Object },
},
    { timestamps: true }
);


const communityModel = mongoose.model("community", communitySchema);
export default communityModel
