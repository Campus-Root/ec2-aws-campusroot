import mongoose from "mongoose";

const exchangeSchema = mongoose.Schema({
    base: { type: String },
    rates: { type: Object }
},
    { timestamps: true }
);
const exchangeModel = mongoose.model("exchange", exchangeSchema);
export default exchangeModel