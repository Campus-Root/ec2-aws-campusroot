import mongoose from "mongoose";
import { OrderStatusEnum, PaymentStatusEnum } from "../utils/enum.js";

const orderSchema = mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    Package: { type: mongoose.Schema.Types.ObjectId, ref: "package" },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "product" }],
    paymentDetails: {
        razorpay_order_id: { type: String },
        amount: { type: Number },
        amount_due: { type: Number },
        created_at: { type: Date },
        currency: { type: String },
        paymentStatus: { type: String, enum: { values: Object.values(PaymentStatusEnum), message: "Invalid Payment Status" } },
        misc: { type: Object }
    },
    status: { type: String, enum: { values: Object.values(OrderStatusEnum), message: "Invalid Order Status" } },
    cancellationReason: { type: String },
    cancellationDate: { type: Date },
    misc: { type: Object },
    logs: [{ action: { type: String }, time: { type: Date, default: new Date() }, details: { type: String } }],

},
    { timestamps: true }
);
export const orderModel = mongoose.model("order", orderSchema);