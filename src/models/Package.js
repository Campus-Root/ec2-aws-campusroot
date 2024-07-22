import mongoose from "mongoose";
import { CurrencySymbolEnum, DestinationTypeEnum, PackageVarietyEnum, ProductCategoryEnum } from "../utils/enum.js";

const packageSchema = mongoose.Schema({
    variety: { type: String, enum: { values: Object.values(PackageVarietyEnum), message: "Invalid Type of Package Variety" } },
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
    duration: {
        start: { type: Date },
        end: { type: Date }
    },
    requirements: [{ type: String }],
    benefits: [{ type: String }],
    products: [{ category: { type: String, enum: { values: Object.values(ProductCategoryEnum), message: "Invalid category" } }, quantity: { type: Number } }],
    termsAndConditions: { type: String },
    active: { type: Boolean },
    designer: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    logs: [{ action: { type: String }, time: { type: Date, default: new Date() }, details: { type: String } }],
},
    { timestamps: true }
);
export const packageModel = mongoose.model("package", packageSchema);
