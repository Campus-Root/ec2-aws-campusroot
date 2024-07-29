import mongoose from "mongoose";
import { subDisciplineEnum, disciplineEnum, UniversityTypeEnum, TernaryEnum, courseTypeEnum, studyLevelEnum, studyModeEnum, CurrencySymbolEnum, DestinationTypeEnum } from "../utils/enum.js";

const courseSchema = mongoose.Schema(
    {
        name: { type: String, required: [true, "Please provide name"], minlength: 3, trim: true, },
        university: { type: mongoose.Types.ObjectId, ref: "university", },
        location: {
            country: { type: String, },
            state: { type: String },
            city: { type: String },
        },
        elite: { type: Boolean },
        type: { type: String },
        about: { type: String },
        language: { type: String },
        discipline: { type: String, },
        subDiscipline: { type: String, },
        studyLevel: { type: String, },
        programLink: { type: String }, // not to user   hide
        curriculumLink: { type: String }, // not to user hide
        totalCredits: { type: String },
        tuitionFee: {
            tuitionFeeType: { type: String },
            tuitionFee: { type: Number },
            tuitionFeeLink: { type: String },// not to user hide
        },
        startDate: [{
            courseStartingMonth: { type: Number }, 
            deadlineMonth: { type: Number },
            courseStarting: { type: Date },
            Deadline: { type: Date },
            link: { type: String }, // not to user hide
        }],
        schoolName: { type: String }, // university name or school name  
        unisName: { type: String },
        stemDetails: {
            stem: { type: Boolean }, // hc  hide 
            stemLink: { type: String }, // hc  hide 
        },
        duration: { type: String },
        pathway: { type: Boolean }, // hc hide
        courseType: { type: String }, //hc hide
        studyMode: [{ type: String }],
        AdmissionsRequirements: {
            AcademicRequirements: [{
                testName: { type: String },
                required: { type: String },
                minScore: { type: String },
                Link: { type: String }, // not to user hide
            }],
            LanguageRequirements: [{
                testName: { type: String },
                Accepted: { type: String },
                minScore: { type: Number },
                Link: { type: String }, // not to user hide
            }],
            generalRequirements: [{ type: String, }],
            generalRequirementLink: { type: String }, // not to user hide 
            year15Requirement: { type: Boolean }, // hide 
            year15RequirementLink: { type: String }, // not to user hide
        },
        average_temperatures: {
            summer: {
                min: { type: String },
                max: { type: String }
            },
            winter: {
                min: { type: String },
                max: { type: String }
            },
            spring: {
                min: { type: String },
                max: { type: String }
            },
            autumn: {
                min: { type: String },
                max: { type: String }
            }
        },
        applicationDetails: {
            applicationProcedureLink: { type: String }, // not to user 
            applicationFee: { type: String },
            applicationFeeLink: { type: String }, // not to user 
            ScoreEvaluation: { type: Boolean },
        },      //hide
        currency: {
            symbol: { type: String, enum: { values: Object.values(CurrencySymbolEnum), message: "Invalid Type of currency symbol" } },
            code: { type: String, enum: { values: Object.keys(CurrencySymbolEnum), message: "Invalid Type of currency code" } },
        },
        initialDeposits: { requirement: { type: Boolean }, InitialDepositsLink: { type: String } }, // not to user hide
        scholarship: { exists: { type: Boolean }, termsAndConditions: [{ type: String }], scholarshipLink: { type: String } }, //hide 
        contactInfo: { emailID: { type: String }, contactLink: { type: String }, contactNumber: { type: String }, },  // for intenal use only //hide
    },
    { timestamps: true }
);
courseSchema.index({ name: "text", unisName: "text", schoolName: "text", "location.country": "text", "location.city": "text", "location.state": "text" });
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



