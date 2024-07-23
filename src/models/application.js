import mongoose from "mongoose"
import { applicationStagesEnum, applicationStateEnum } from "../utils/enum.js";
import { productModel } from "./Product.js";
const applicationSchema = mongoose.Schema({
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
export const premiumApplicationModel = productModel.discriminator("premium application", applicationSchema);
export const eliteApplicationModel = productModel.discriminator("elite application", applicationSchema);