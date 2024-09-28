import mongoose from "mongoose"
const institutionSchema = mongoose.Schema({
    InstitutionName: { type: String },
    Address: { type: String },
    State: { type: String },
    District: { type: String },
    InstitutionType: { type: String },
    Aicte_ID: { type: String },
    university: { type: [String] },
    IEH: {
        exists: { type: Boolean, default: false },
        logoSrc: { type: String },
        members: [{ type: mongoose.Types.ObjectId, ref: "user" }],
    }
},
    { timestamps: true }
);
// Add text index for efficient search
institutionSchema.index({
    InstitutionName: "text",
}, {
    weights: { InstitutionName: 5 }
});

// Add compound index for sorting
institutionSchema.index({
    isStartMatch: -1,
    InstitutionName: 1
});
const institutionModel = mongoose.model("institution", institutionSchema);
export default institutionModel