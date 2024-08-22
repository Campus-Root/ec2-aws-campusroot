import mongoose from "mongoose"
const institutionSchema = mongoose.Schema({
    InstitutionName: { type: String },
    Address: { type: String },
    State: { type: String },
    District: { type: String },
    InstitutionType: { type: String },
    Aicte_ID: { type: String },
    university: [{ type: String }],
    IEH: {
        logoSrc: { type: String },
        members: [{ type: mongoose.Types.ObjectId, ref: "user" }],
    }
},
    { timestamps: true }
);
const institutionModel = mongoose.model("institution", institutionSchema);
export default institutionModel