import mongoose from "mongoose";
import { UniversityTypeEnum, TernaryEnum, courseTypeEnum, studyLevelEnum, studyModeEnum, CurrencySymbolEnum, DestinationTypeEnum } from "../utils/enum.js";

const courseSchema = mongoose.Schema(
    {
        name: { type: String, required: [true, "Please provide name"], minlength: 3, trim: true, },
        schoolName: { type: String },
        location: {
            country: { type: String, },
            state: { type: String },
            city: { type: String },
        },
        // description: { type: String },
        duration: [{
            duration: { type: Number },
            durationType: { type: String }
        }],
        subDiscipline: { type: [String], },
        startDate: [{
            courseStartingMonth: { type: Number },
            deadlines: [{
                deadlineLabel: { type: String },
                deadlineMonth: { type: Number }
            }]
        }],
        studyLevel: { type: String, },
        totalCredits: { type: String },
        tuitionFee: {
            tuitionFeeType: { type: String },
            tuitionFee: { type: Number },
        },
        livingCost: {
            lowerLimit: { type: Number },
            upperLimit: { type: Number },
            livingCostType: { type: String }
        },
        studyMode: { type: [String] },
        AdmissionsRequirements: {
            AcademicRequirements: [{
                testName: { type: String },
                required: { type: String },
                minScore: { type: String }
            }],
            LanguageRequirements: [{
                testName: { type: String },
                Accepted: { type: String },
                minScore: { type: Number }
            }],
            generalRequirements: { type: [String], },
            year15Requirement: { type: Boolean }, // hide 
        },
        Duolingo: { type: Boolean },
        Duolingo_MinScore: { type: String },
        GMAT: { type: Boolean },
        GMAT_MinScore: { type: String },
        GPA: { type: Boolean },
        GPA_MinScore: { type: String },
        GRE: { type: Boolean },
        GRE_MinScore: { type: String },
        IELTS: { type: Boolean },
        IELTS_MinScore: { type: String },
        PTE: { type: Boolean },
        PTE_MinScore: { type: String },
        TOEFL: { type: Boolean },
        TOEFL_MinScore: { type: String },
        elite: { type: Boolean },
        featured: { type: Boolean },
        discipline: { type: [String], },
        currency: {
            symbol: { type: String, enum: { values: Object.values(CurrencySymbolEnum), message: "Invalid Type of currency symbol" } },
            code: { type: String, enum: { values: Object.keys(CurrencySymbolEnum), message: "Invalid Type of currency code" } },
        },
        applicationDetails: {
            applicationFeeWaiver: { type: Boolean },
            applicationFee: { type: String },
            ScoreEvaluation: { type: Boolean },
        },
        university: { type: mongoose.Types.ObjectId, ref: "university", },
        type: { type: String },
        globalRankingPosition: { type: Number },
        globalTopRankingPercentage: { type: Number },
        stemDetails: {
            stem: { type: Boolean }, // hc  hide 
            stemLink: { type: String }, // hc  hide 
        },
        pathway: { type: Boolean }, // hc hide
        language: { type: String },
        courseType: { type: String },
        initialDeposits: { requirement: { type: Boolean }, InitialDepositsLink: { type: String } }, // not to user hide
        scholarship: { exists: { type: Boolean }, termsAndConditions: { type: [String] }, scholarshipLink: { type: String } }, //hide 
        contactInfo: { emailID: { type: String }, contactLink: { type: String }, contactNumber: { type: String }, },  // for intenal use only //hide
    },
    { timestamps: true }
);
courseSchema.index({ description: "text", unisName: "text", schoolName: "text", "location.country": "text", "location.city": "text", "location.state": "text" });
const courseModel = mongoose.model("course", courseSchema);
export default courseModel

//to be added
// university: { type: mongoose.Types.ObjectId, ref: "university", }, name , established year, country living expenses



// university name
// university type
// area of interest
// course duration
// Destination Country
// location city
// mode of study
// degree type
// by scores
// deadline

// filters
// country - dropdown multiple
// university name   search and select multiple
// discipline dropdown multiple
// university type  single
// duration dropdown
// studymode single
// studylevel
// tuition fee range
// states or cities
// gre,toefl,ielts
// deadline month and year



