import mongoose from "mongoose";

const couponSchema = mongoose.Schema({
    code: { type: String },
    discount: { type: Number },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "package" },
    startDate: { type: Date },
    endDate: { type: Date },
    maxUses: { type: Number },
    used: { type: Number },
    valid: { type: Boolean },
    redeemedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
},
    { timestamps: true }
);
const couponModel = mongoose.model("coupon", couponSchema);
export default couponModel