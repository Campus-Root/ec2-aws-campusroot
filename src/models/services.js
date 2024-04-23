import mongoose from "mongoose"
// import { leadStatusEnum, leadSourceEnum, leadRatingEnum } from "../utils/enum.js";

const servicesSchema = mongoose.Schema({
    title: { type: String },
    body: { type: String },
    imageSrc: { type: String },
    web: { link: { type: String }, },
    mobile: { link: { type: String }, }
},
    { timestamps: true }
);


const servicesModel = mongoose.model("services", servicesSchema);
export default servicesModel