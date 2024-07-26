import mongoose from "mongoose";
import { applicationStagesEnum, applicationStateEnum, ProductCategoryEnum } from "../utils/enum.js";

const productSchema = mongoose.Schema({
    university: { type: mongoose.Types.ObjectId, ref: "university" },
    course: { type: mongoose.Types.ObjectId, ref: "course" },
    intake: { type: Date },
    deadline: { type: Date },
    user: { type: mongoose.Types.ObjectId, ref: "user" },
    order: { type: mongoose.Types.ObjectId, ref: "order" },
    category: { type: String, enum: { values: Object.values(ProductCategoryEnum), message: "Invalid Status" } },
    docChecklist: [{
        name: { type: String },
        isChecked: { type: Boolean, default: false },
        doc: { type: mongoose.Types.ObjectId, ref: "document" },
        desc: { type: String }
    }],
    cancellationRequest: { type: Boolean, default: false },
    status: { type: String, enum: { values: Object.values(applicationStateEnum), message: "Invalid Status" }, },
    stage: { type: String, enum: { values: Object.values(applicationStagesEnum), message: "Invalid Stage Name" } },
    advisors:[{ type: mongoose.Types.ObjectId, ref: "user" }],
    info: {

        
        approval: {
            counsellorApproval: { type: Boolean },
            justification: { type: String },
            userConsent: { type: Boolean },
        },
        notes: [{ type: String }],
    },
    log: [{
        status: { type: String, enum: { values: Object.values(applicationStateEnum), message: "Invalid Status" }, },
        stages: [{
            name: { type: String, enum: { values: Object.values(applicationStagesEnum), message: "Invalid Stage Name" } },
            message: { type: String },
            updatedAt: { type: Date, default: new Date() }
        }],
    }],
},
    {
        timestamps: true
    },
);
export const productModel = mongoose.model("product", productSchema);


