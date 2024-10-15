import mongoose from "mongoose";

const recycleBinSchema = mongoose.Schema({
    data: { type: Object },
    dataModel: { type: String },
    collection: { type: String },
},
    { timestamps: true }
);
const recycleBinModel = mongoose.model("recycleBin", recycleBinSchema);
export default recycleBinModel