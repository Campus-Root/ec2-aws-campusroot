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
    university: "text",
    Address: "text",
    State: "text",
    District: "text"
}, {
    weights: {
        InstitutionName: 5,  // Assigning higher weight to more important fields
        university: 4,
        Address: 3,
        State: 2,
        District: 1
    }
});

// Add compound index for sorting
institutionSchema.index({
    isStartMatch: -1,
    InstitutionName: 1
});
const institutionModel = mongoose.model("institution", institutionSchema);
export default institutionModel