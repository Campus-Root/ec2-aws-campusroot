import mongoose from "mongoose";

const orderSchema = mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    stdPackage: { type: mongoose.Schema.Types.ObjectId, ref: "package" },
    customPackage: { type: mongoose.Schema.Types.ObjectId, ref: "customPackage" },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "product" }],
    paymentDetails: { type: Object },
    status: { type: String, enum: { values: Object.values(OrderStatusEnum), message: "Invalid Order Status" } },
    paymentStatus: { type: String, enum: { values: Object.values(PaymentStatusEnum), message: "Invalid Payment Status" } },
    cancellationReason: { type: String },
    cancellationDate: { type: Date },
    misc: { type: Object }
},
    { timestamps: true }
);
const orderModel = mongoose.model("order", orderSchema);
export default orderModel