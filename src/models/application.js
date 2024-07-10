import mongoose from "mongoose"
import { applicationStagesEnum, applicationStateEnum, ProductCategoryEnum } from "../utils/enum.js";
import productModel from "./Product.js";
const applicationSchema = mongoose.Schema({
    class: {
        type: String,
        enum: {
            values: Object.values(ProductCategoryEnum),
            message: 'Category `{VALUE}` is not valid'
        }
    },
    processCoordinator: { type: mongoose.Types.ObjectId, ref: "user" },
    counsellor: { type: mongoose.Types.ObjectId, ref: "user" },
    approval: {
        counsellorApproval: { type: Boolean },
        justification: { type: String },
        userConsent: { type: Boolean },
    },
    docChecklist: [{
        name: { type: String },
        isChecked: { type: Boolean, default: false },
        doc: { type: mongoose.Types.ObjectId, ref: "document" },
        desc: { type: String }
    }],
    cancellationRequest: { type: Boolean, default: false },
    log: [{
        status: { type: String, enum: { values: Object.values(applicationStateEnum), message: "Invalid Status" }, },
        stages: [{
            name: { type: String, enum: { values: Object.values(applicationStagesEnum), message: "Invalid Stage Name" } },
            message: { type: String },
            updatedAt: { type: Date, default: new Date() }
        }],
    }],
    notes: { type: String },
    status: { type: String, enum: { values: Object.values(applicationStateEnum), message: "Invalid Status" }, },
    stage: { type: String, enum: { values: Object.values(applicationStagesEnum), message: "Invalid Stage Name" } }
}
);


export const applicationModel = productModel.discriminator("application", applicationSchema);