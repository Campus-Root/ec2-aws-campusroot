import mongoose from "mongoose";

const recycleBinSchema = mongoose.Schema({
    data: { type: Object },
    dataModel: { type: String },
    collection: { type: String },
},
    { timestamps: true }
);
export const recycleBinModel = mongoose.model("recycleBin", recycleBinSchema);
