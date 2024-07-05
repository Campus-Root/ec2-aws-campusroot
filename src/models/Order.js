import mongoose from "mongoose";

const orderSchema = mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    package: { type: mongoose.Schema.Types.ObjectId, ref: "package" },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "product" }],
    paymentDetails: { type: Object },
    limitations: [{ type: String }], // based on package
    misc: { type: Object }
},
    { timestamps: true }
);
const orderModel = mongoose.model("order", orderSchema);
export default orderModel