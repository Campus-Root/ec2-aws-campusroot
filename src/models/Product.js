import mongoose from "mongoose";
import { ProductCategoryEnum } from "../utils/enum.js";

const productSchema = mongoose.Schema({
    university: { type: mongoose.Types.ObjectId, ref: "university" },
    course: { type: mongoose.Types.ObjectId, ref: "course" },
    intake: { type: Date },
    deadline: { type: Date },
    user: { type: mongoose.Types.ObjectId, ref: "user" },
},
    { discriminatorKey: 'category' },
    { timestamps: true }
);
productSchema.path('category').enum({
    values: Object.values(ProductCategoryEnum),
    message: 'Category `{VALUE}` is not valid'
});
const productModel = mongoose.model("product", productSchema);
export default productModel


