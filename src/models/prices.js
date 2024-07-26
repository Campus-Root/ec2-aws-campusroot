import mongoose from "mongoose"
const priceSchema = mongoose.Schema({
    productCategory: { type: String },
    price: { type: Number },
    currency: { type: String, default: 'INR' },
    currencySymbol: { type: String }
},
    { timestamps: true }
);


export const priceModel = mongoose.model("price", priceSchema);


