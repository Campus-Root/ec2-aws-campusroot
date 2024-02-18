import mongoose from "mongoose";
import userModel from "./User.js";
import {  studyLevelEnum, EducationStageEnum, IndustryTypeEnum, WorkStyleEnum, DestinationTypeEnum, TestNamesEnum, TestDescriptionEnum ,possibilityOfAdmitEnum} from "../utils/enum.js";

const Student = mongoose.Schema(
    {
        userName: { type: String },
        google: { id: { type: String } },
        emailVerified: { type: Boolean, default: false },
        emailVerificationString: { type: String },
        phoneOtp: { type: String },
        phone: { countryCode: { type: String }, number: { type: String } },
        phoneVerified: { type: Boolean, default: false },
        DOB: { type: Date },
        GuardianName: { type: String },
        GuardianOccupation: { type: String },
        Gender: { type: String },
        GuardianContactNumber: { countryCode: { type: String }, number: { type: String } },
        GuardianContactNumberOtp: { type: String },
        GuardianContactNumberVerified: { type: Boolean, default: false },
        Address: { type: String },
        LeadSource: { type: String },
        counsellor: { type: mongoose.Types.ObjectId, ref: "user" },
        processCoordinator: { type: mongoose.Types.ObjectId, ref: "user" },
        visaExpert: { type: mongoose.Types.ObjectId, ref: "user" },
        loanExpert: { type: mongoose.Types.ObjectId, ref: "user" },
        tests: [{
            name: { type: String, enum: { values: Object.values(TestNamesEnum), message: "Invalid Type of Test Name" } },
            scores: [{
                description: { type: String, enum: { values: Object.values(TestDescriptionEnum), message: "Invalid Type of Test description" } },
                count: { type: Number, },
            }],
            testDate: { type: Date }, // new addition
        }],
        workExperience: [{
            companyName: { type: String, },
            sector: {
                type: String, enum: {
                    values: Object.values(IndustryTypeEnum),
                    message: "Invalid Type of Industry"
                }
            },
            type: {
                type: String, enum: {
                    values: Object.values(WorkStyleEnum),
                    message: "Invalid Type of WorkType"
                }
            },
            designation: { type: String },
            startDate: { type: Date, },
            endDate: { type: Date, },
        }],
        researchPapers: [{
            title: { type: String, },
            publication: { type: String, },
            fieldOfStudy: {
                type: String, enum: {
                    values: Object.values(IndustryTypeEnum),
                    message: "Invalid Type of Industry"
                }
            },
            publishedDate: { type: Date, },
        }],
        education: {
            school: {
                instituteName: { type: String, },
                pattern: { type: String },
                board: { type: String },
                totalScore: { type: Number },
                endDate: { type: Date, },
            },
            plus2: {
                instituteName: { type: String, },
                course: { type: String },
                pattern: { type: String },
                board: { type: String },
                totalScore: { type: Number },
                endDate: { type: Date, },
                backlogs: { type: Number },
                isCompleted: { type: Boolean }
            },
            underGraduation: {
                instituteName: { type: String, },
                course: { type: String },
                pattern: { type: String },
                board: { type: String },
                totalScore: { type: Number },
                endDate: { type: Date, },
                backlogs: { type: Number },
                isCompleted: { type: Boolean }
            },
            postGraduation: {
                instituteName: { type: String, },
                course: { type: String },
                pattern: { type: String },
                board: { type: String },
                totalScore: { type: Number },
                endDate: { type: Date, },
                backlogs: { type: Number },
                isCompleted: { type: Boolean },

            },
        },
        recommendation: [{
            university: { type: mongoose.Types.ObjectId, ref: "university" },
            course: { type: mongoose.Types.ObjectId, ref: "course" },
            possibilityOfAdmit: {
                type: String, enum: {
                    values: Object.values(possibilityOfAdmitEnum),
                    message: "Invalid Type of possibilityOfAdmit"
                }
            },
            counsellorRecommended: { type: Boolean }
        }],
        documents: {
            personal: {
                resume: { type: mongoose.Types.ObjectId, ref: "document" },
                passportBD: { type: mongoose.Types.ObjectId, ref: "document" },
                passportADD: { type: mongoose.Types.ObjectId, ref: "document" },
            },
            academic: {
                secondarySchool: { type: mongoose.Types.ObjectId, ref: "document" },
                plus2: { type: mongoose.Types.ObjectId, ref: "document" },
                degree: { type: mongoose.Types.ObjectId, ref: "document" },
                bachelors: {
                    transcripts: { type: mongoose.Types.ObjectId, ref: "document" }, // semister wise
                    bonafide: { type: mongoose.Types.ObjectId, ref: "document" },
                    CMM: { type: mongoose.Types.ObjectId, ref: "document" },
                    PCM: { type: mongoose.Types.ObjectId, ref: "document" },
                    OD: { type: mongoose.Types.ObjectId, ref: "document" }
                },
                masters: {
                    transcripts: { type: mongoose.Types.ObjectId, ref: "document" }, // semister wise
                    bonafide: { type: mongoose.Types.ObjectId, ref: "document" },
                    CMM: { type: mongoose.Types.ObjectId, ref: "document" },
                    PCM: { type: mongoose.Types.ObjectId, ref: "document" },
                    OD: { type: mongoose.Types.ObjectId, ref: "document" }
                }
            },
            test: {
                languageProf: [{ type: mongoose.Types.ObjectId, ref: "document" }],   // 5
                general: [{ type: mongoose.Types.ObjectId, ref: "document" }]           // 5
            },
            workExperiences: [{ type: mongoose.Types.ObjectId, ref: "document" }],
            visa: { type: Object },
            loan: { type: Object }
        },
        activity: {
            shortListed: [{
                university: { type: mongoose.Types.ObjectId, ref: "university" },
                course: { type: mongoose.Types.ObjectId, ref: "course" }
            }],
            applications: {
                processing: [{ type: mongoose.Types.ObjectId, ref: "application" }],
                accepted: [{ type: mongoose.Types.ObjectId, ref: "application" }],
                rejected: [{ type: mongoose.Types.ObjectId, ref: "application" }],
                completed: [{ type: mongoose.Types.ObjectId, ref: "application" }],
                cancelled: [{ type: mongoose.Types.ObjectId, ref: "application" }],
            }
        },
        skills: [{ type: String, }],
        preference: {
            degree: { type: String },
            intake: { type: Date },
            budget: {
                upper: { type: Number },
                lower: { type: Number, }
            },
            courses: [{ type: String, }],
            country: [{ type: String, enum: { values: Object.values(DestinationTypeEnum), message: "Invalid Destination Type" } }],
            exploreButton: { type: Boolean },
            theme: { type: String },
            currency: { type: String }
        },
        meetings: [{ type: mongoose.Types.ObjectId, ref: "meeting" }]
    }
);


// Student.index({ "location_cord": '2dsphere' })  // future use
export const studentModel = userModel.discriminator("student", Student);