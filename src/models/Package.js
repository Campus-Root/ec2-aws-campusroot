import mongoose from "mongoose";

const packageSchema = mongoose.Schema({
    name: { type: String },
    description: { type: String },
    country: [{
        type: String, enum: {
            values: Object.values(DestinationTypeEnum),
            message: "Invalid Type"
        }
    }],
    imageSrc: { type: String },
    priceDetails: {
        totalPrice: { type: Number },
        currency: {
            symbol: { type: String, enum: { values: Object.values(CurrencySymbolEnum), message: "Invalid Type of currency symbol" } },
            code: { type: String, enum: { values: Object.keys(CurrencySymbolEnum), message: "Invalid Type of currency code" } },
        },
        availableCoupons: [{ type: mongoose.Schema.Types.ObjectId, ref: "coupon" }],
    },
    duration: { type: Object },
    requirements: [{ type: String }],
    benefits: [{ type: String }],
    features: [{ type: String }], // rules for features
    termsAndConditions: { type: String },
    active: { type: Boolean },
    assigned: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }]
},
    { timestamps: true }
);
const packageModel = mongoose.model("package", packageSchema);
export default packageModel