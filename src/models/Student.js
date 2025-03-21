import mongoose from "mongoose";
import userModel from "./User.js";
import { studyLevelEnum, EducationStageEnum, IndustryTypeEnum, WorkStyleEnum, DestinationTypeEnum, TestNamesEnum, TestDescriptionEnum, possibilityOfAdmitEnum, ProductCategoryEnum } from "../utils/enum.js";

const Student = mongoose.Schema(
    {
        blockList: [{ type: mongoose.Types.ObjectId, ref: "user" }],
        blockedBy: [{ type: mongoose.Types.ObjectId, ref: "user" }],
        active: { type: Boolean, default: true },
        LeadSource: { type: String },
        IEH: {
            institution: { type: mongoose.Types.ObjectId, ref: 'institution' },
            verificationStatus: { type: String },
            verifiedAccess: { type: Boolean, default: false },
            verificationDocName: { type: String },
            verificationDocument: { type: mongoose.Types.ObjectId, ref: "document" },
        },
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
            validPassportNumber: { type: String },// enum yes no and processing
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
                custom: { type: Boolean },
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
                custom: { type: Boolean },
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
                custom: { type: Boolean },
                instituteName: { type: String, },
                city: { type: String },
                state: { type: String },
                country: { type: String },
                programMajor: { type: String },// enum  eee,ese,ece
                degreeProgram: { type: String },// enum btech,bedu,bsc.... 
                gradingSystem: { type: String },// enum % grade gpa cgpa
                affiliatedUniversity: { type: String },
                totalScore: { type: String }, // for grade A+..., for Percent 0-100, gpa 0-10
                startDate: { type: Date },
                endDate: { type: Date, },
                backlogs: { type: Number },
                isCompleted: { type: Boolean },
            },
            postGraduation: {
                custom: { type: Boolean },
                instituteName: { type: String, },
                city: { type: String },
                state: { type: String },
                country: { type: String },
                specialization: { type: String },// enum  power and energy systems,computer engineering,data science
                degreeProgram: { type: String },// enum mtech,medu,msc.... 
                gradingSystem: { type: String },// enum % grade gpa cgpa
                affiliatedUniversity: { type: String },
                totalScore: { type: String }, // for grade A+..., for Percent 0-100, gpa 0-10
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
            assignedCountries: [{ type: String, enum: { values: Object.values(DestinationTypeEnum), message: "Invalid Type" } }],
            info: { type: mongoose.Types.ObjectId, ref: 'user' }
        }],
        workExperience: [{
            companyName: { type: String, },
            sector: { type: String, },
            type: { type: String },
            designation: { type: String },
            startDate: { type: Date, },
            endDate: { type: Date, },
            Ongoing: { type: Boolean },
            docId: { type: mongoose.Types.ObjectId, ref: "document" },
        }],
        researchPapers: [{
            title: { type: String, },
            publication: { type: String, },
            fieldOfStudy: { type: String },
            publishedDate: { type: Date, },
        }],
        recommendations: {
            criteria: {
                ug_gpa: { type: String, },
                gre: { type: String, },
                sub_discipline: { type: String },
                country: { type: String },
            },
            data: [{
                // university: { type: mongoose.Types.ObjectId, ref: "university" },
                course: { type: mongoose.Types.ObjectId, ref: "course" },
                possibilityOfAdmit: {
                    type: String, enum: {
                        values: Object.values(possibilityOfAdmitEnum),
                        message: "Invalid Type of possibilityOfAdmit"
                    }
                },
                notInterested: { type: Boolean, default: false },
                counsellorRecommended: { type: Boolean }
            }]
        },
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
                languageProf: {
                    type: [mongoose.Types.ObjectId], ref: "document",
                    // validate: {
                    //     validator: (val) => val.length <= 5,
                    //     message: '{PATH} exceeds the limit of 5'
                    // }
                },
                general: {
                    type: [mongoose.Types.ObjectId],
                    ref: "document",
                    // validate: {
                    //     validator: (val) => val.length <= 5,
                    //     message: '{PATH} exceeds the limit of 5'
                    // }
                }
            },
            workExperiences: {
                type: [mongoose.Types.ObjectId],
                ref: "document",
                // validate: {
                //     validator: (val) => val.length <= 5,
                //     message: '{PATH} exceeds the limit of 5'
                // }
            },
            visa: { type: Object },
            loan: { type: Object }
        },
        activity: {
            products: [{ type: mongoose.Types.ObjectId, ref: "product" }],
            meetings: [{ type: mongoose.Types.ObjectId, ref: "meeting" }],
            cart: [{
                category: { type: String, enum: { values: Object.values(ProductCategoryEnum), message: "Invalid Type of product category" } },
                course: { type: mongoose.Types.ObjectId, ref: "course" },
                intake: { type: Date }
            }],
            wishList: [{ type: mongoose.Types.ObjectId, ref: "course" }],
        },
        suggestedPackages: [{ type: mongoose.Types.ObjectId, ref: "package" }],
        purchasedPackages: [{ type: mongoose.Types.ObjectId, ref: "package" }],
        orders: [{ type: mongoose.Types.ObjectId, ref: "order" }],
        skills: {
            type: [String],
            // validate: {
            //     validator: (val) => val.length <= 5,
            //     message: '{PATH} exceeds the limit of 5'
            // }
        },
        preference: {
            degree: { type: String },
            intake: { type: Date },
            budget: { upper: { type: Number }, lower: { type: Number, } },
            category:[String],
            subCategory:[String],
            courses: {
                type: [String],
                // validate: {
                //     validator: (val) => val.length <= 3,
                //     message: '{PATH} exceeds the limit of 3'
                // }
            },
            country: {
                type: [String],
                enum: { values: Object.values(DestinationTypeEnum), message: "Invalid Destination Type" },
                // validate: {
                //     validator: (val) => val.length <= 6,
                //     message: '{PATH} exceeds the limit of 6'
                // }
            },
            exploreButton: { type: Boolean },
            theme: { type: String },
            currency: { type: String },
            language: { type: String },
        },
    }
);


// Student.index({ "location_cord": '2dsphere' })  // future use
export const studentModel = userModel.discriminator("student", Student);