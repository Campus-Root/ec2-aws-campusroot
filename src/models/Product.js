import mongoose from "mongoose";

const productSchema = mongoose.Schema({
    university: { type: mongoose.Types.ObjectId, ref: "university" },
    course: { type: mongoose.Types.ObjectId, ref: "course" },
    intake: { type: Date },
    deadline: { type: Date },
    user: { type: mongoose.Types.ObjectId, ref: "user" },
    order: { type: mongoose.Types.ObjectId, ref: "order" },
},
    {
        discriminatorKey: 'category',
        timestamps: true
    },
);
export const productModel = mongoose.model("product", productSchema);


