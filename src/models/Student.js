import mongoose from "mongoose";
import userModel from "./User.js";
import { studyLevelEnum, EducationStageEnum, IndustryTypeEnum, WorkStyleEnum, DestinationTypeEnum, TestNamesEnum, TestDescriptionEnum, possibilityOfAdmitEnum } from "../utils/enum.js";

const Student = mongoose.Schema(
    {
        verification: [{
            type: { type: String }, // "email"  // "phone"
            status: { type: Boolean, default: false },
            token: {
                data: { type: String },
                expiry: { type: Date }, // expiry date
            }
        }],
        phone: { countryCode: { type: String }, number: { type: String } },
        LeadSource: { type: String },
        personalDetails: {
            DOB: { type: Date },
            Gender: { type: String }, // enum
            temporaryAddress: {
                city: { type: String },
                state: { type: String },
                pinCode: { type: Number },
                country: { type: String },
                addressLine1: { type: String },
                addressLine2: { type: String },
                addressLine3: { type: String }
            },
            permanentAddress: {
                city: { type: String },
                state: { type: String },
                pinCode: { type: Number },
                country: { type: String },
                addressLine1: { type: String },
                addressLine2: { type: String },
                addressLine3: { type: String }
            },
            nationality: { type: String },// enum
            countyOfBirth: { type: String }, // enum
            maritalStatus: { type: String }, // enum 
            validPassport: { type: String },// enum yes no and processing
            validPermit: { type: String },// enum yes no and processing,
            visaRejectedDetails: { type: String },
        },
        extraCurriculumActivities: [{
            activity: { type: String },
            designation: { type: String },
            status: { type: String },
            description: { type: String },
            startDate: { type: Date },
            endDate: { type: Date }
        }],
        familyDetails: [{
            GuardianFirstName: { type: String },
            GuardianLastName: { type: String },
            GuardianEmail: { type: String },
            GuardianOccupation: { type: String },
            GuardianQualification: { type: String },
            RelationshipWithStudent: { type: String }, // enum father, mother, spouse, guardian
            GuardianContactNumber: { countryCode: { type: String }, number: { type: String } },
        }],
        education: {
            school: {
                instituteName: { type: String, },
                city: { type: String },
                state: { type: String },
                country: { type: String },
                languageOfInstruction: { type: String }, // enum hindi telugu eng other
                gradingSystem: { type: String }, // enum % grade gpa 
                board: { type: String },// enum 
                totalScore: { type: String }, // for grade A+..., for Percent 0-100, gpa 0-10
                startDate: { type: Date },
                endDate: { type: Date },
            },
            plus2: {
                instituteName: { type: String, },
                city: { type: String },
                state: { type: String },
                country: { type: String },
                languageOfInstruction: { type: String }, // enum hindi telugu eng other
                gradingSystem: { type: String }, // enum % grade gpa 
                board: { type: String },// enum ISC, state, 
                totalScore: { type: String }, // for grade A+..., for Percent 0-100, gpa 0-10
                startDate: { type: Date },
                endDate: { type: Date },
                stream: { type: String }, // enum mpc,bipc,mec....
                backlogs: { type: Number },
                isCompleted: { type: Boolean }
            },
            underGraduation: {
                instituteName: { type: String, },
                city: { type: String },
                state: { type: String },
                country: { type: String },
                programMajor: { type: String },// enum  eee,ese,ece
                degreeProgram: { type: String },// enum btech,bedu,bsc.... 
                gradingSystem: { type: String },// enum % grade gpa cgpa
                affiliatedUniversity: { type: String },
                totalScore: { type: Number }, // for grade A+..., for Percent 0-100, gpa 0-10
                startDate: { type: Date },
                endDate: { type: Date, },
                backlogs: { type: Number },
                isCompleted: { type: Boolean }
            },
            postGraduation: {
                instituteName: { type: String, },
                city: { type: String },
                state: { type: String },
                country: { type: String },
                specialization: { type: String },// enum  power and energy systems,computer engineering,data science
                degreeProgram: { type: String },// enum mtech,medu,msc.... 
                gradingSystem: { type: String },// enum % grade gpa cgpa
                affiliatedUniversity: { type: String },
                totalScore: { type: Number }, // for grade A+..., for Percent 0-100, gpa 0-10
                startDate: { type: Date },
                endDate: { type: Date, },
                backlogs: { type: Number },
                isCompleted: { type: Boolean }
            },
        },
        isPlanningToTakeAcademicTest: { type: Boolean },
        isPlanningToTakeLanguageTest: { type: Boolean },
        tests: [{
            name: { type: String, enum: { values: Object.values(TestNamesEnum), message: "Invalid Type of Test Name" } },
            scores: [{
                description: { type: String, enum: { values: Object.values(TestDescriptionEnum), message: "Invalid Type of Test description" } },
                count: { type: Number, },
            }],
            testDate: { type: Date },
            docId: { type: mongoose.Types.ObjectId, ref: "document" },
        }],
        advisors: [{
            info: { type: mongoose.Types.ObjectId, ref: "user" },
            role: { type: String },   // counsellor processCoordinator visaExpert loanExpert
        },],
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
            Ongoing: { type: Boolean },
            docId: { type: mongoose.Types.ObjectId, ref: "document" },
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
            },
            meetings: [{ type: mongoose.Types.ObjectId, ref: "meeting" }]
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
            currency: { type: String },
            language: { type: String },// enum eng, tel, hindi
        },
    }
);


// Student.index({ "location_cord": '2dsphere' })  // future use
export const studentModel = userModel.discriminator("student", Student);