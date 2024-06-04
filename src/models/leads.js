import mongoose from "mongoose"
import { leadStatusEnum, leadSourceEnum, leadRatingEnum } from "../utils/enum.js";

const leadsSchema = mongoose.Schema({
    crmId: { type: String },
    name: { type: String },
    email: { type: String },
    phone: { countryCode: { type: String }, number: { type: String } },
    queryDescription: { type: String },
    ifPhoneIsSameAsWhatsapp: { type: Boolean },
    whatsappNumber: { countryCode: { type: String }, number: { type: String } },
    student: { type: mongoose.Types.ObjectId, ref: "user" },
    remoteStudentAdvisor: { type: mongoose.Types.ObjectId, ref: "user" },
    leadSource: { type: String, enum: { values: Object.values(leadSourceEnum), message: "Invalid leadSource" } },
    leadStatus: [{
        status: { type: String, enum: { values: Object.values(leadStatusEnum), message: "Invalid leadStatus" } },
        followUp_Status: { type: String },
        nextFollowUp: { type: Date, default: new Date() }
    }],
    leadRating: { type: String, enum: { values: Object.values(leadRatingEnum), message: "Invalid leadRating" }, default: "high priority" },
    logs: [{ action: { type: String }, time: { type: Date, default: new Date() }, details: { type: String } }],
    notes: [{ disc: { type: String }, nextFollowUp: { type: Date, default: new Date() } }],
    // notes[] attachments activites emails meetings events
    preferences: {
        preferredCountry: { type: String },
        preferredCourse: { type: String },
        intake: { type: String },
        additionalInfo: { type: String },
    }
},
    { timestamps: true }
);


const leadsModel = mongoose.model("leads", leadsSchema);
export default leadsModel