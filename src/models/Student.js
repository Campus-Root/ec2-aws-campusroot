import mongoose from "mongoose";
import userModel from "./User.js";
import { studyLevelEnum, EducationStageEnum, IndustryTypeEnum, WorkStyleEnum, DestinationTypeEnum, TestNamesEnum, TestDescriptionEnum, possibilityOfAdmitEnum, ProductCategoryEnum } from "../utils/enum.js";

const Student = mongoose.Schema(
    {
        blockList: [{ type: mongoose.Types.ObjectId, ref: "user" }],
        blockedBy: [{ type: mongoose.Types.ObjectId, ref: "user" }],
        active: { type: Boolean, default: true },
        LeadSource: String,
        IEH: {
            institution: { type: mongoose.Types.ObjectId, ref: 'institution' },
            verificationStatus: String,
            verifiedAccess: { type: Boolean, default: false },
            verificationDocName: String,
            verificationDocument: { type: mongoose.Types.ObjectId, ref: "document" },
        },
        personalDetails: {
            DOB: { type: Date },
            Gender: String, // enum
            temporaryAddress: {
                city: String,
                state: String,
                pinCode: { type: Number },
                country: String,
                addressLine1: String,
                addressLine2: String,
                addressLine3: String
            },
            permanentAddress: {
                city: String,
                state: String,
                pinCode: { type: Number },
                country: String,
                addressLine1: String,
                addressLine2: String,
                addressLine3: String
            },
            nationality: String,// enum
            countyOfBirth: String, // enum
            maritalStatus: String, // enum 
            validPassport: String,// enum yes no and processing
            validPassportNumber: String,// enum yes no and processing
            validPermit: String,// enum yes no and processing,
            visaRejectedDetails: String
        },
        completedStudies:{ type: Boolean, default: false },
        oneWindowExclusiveTestPrep:{ type: Boolean, default: false },
        isPlanningToTakeAcademicTest: { type: Boolean, default: false },
        isPlanningToTakeLanguageTest: { type: Boolean, default: false },
        financialAid:{ type: Boolean, default: false },
        educationLoan:{ type: Boolean, default: false },
        services:[String],
        familyDetails: [{
            GuardianFirstName: String,
            GuardianLastName: String,
            GuardianEmail: String,
            GuardianOccupation: String,
            GuardianQualification: String,
            RelationshipWithStudent: String, // enum father, mother, spouse, guardian
            GuardianContactNumber: { countryCode: String, number: String },
        }],
        extraCurriculumActivities: [{
            activity: String,
            designation: String,
            status: String,
            description: String,
            startDate: { type: Date },
            endDate: { type: Date }
        }],
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
        education: {
            school: {
                custom: { type: Boolean },
                instituteName: String,
                city: String,
                state: String,
                country: String,
                languageOfInstruction: String, // enum hindi telugu eng other
                gradingSystem: String, // enum % grade gpa 
                board: String,// enum 
                totalScore: String, // for grade A+..., for Percent 0-100, gpa 0-10
                startDate: { type: Date },
                endDate: { type: Date },
            },
            plus2: {
                custom: { type: Boolean },
                instituteName: String,
                city: String,
                state: String,
                country: String,
                languageOfInstruction: String, // enum hindi telugu eng other
                gradingSystem: String, // enum % grade gpa 
                board: String,// enum ISC, state, 
                totalScore: String, // for grade A+..., for Percent 0-100, gpa 0-10
                startDate: { type: Date },
                endDate: { type: Date },
                stream: String, // enum mpc,bipc,mec....
                backlogs: { type: Number },
                isCompleted: { type: Boolean }
            },
            underGraduation: {
                custom: { type: Boolean },
                instituteName: String,
                city: String,
                state: String,
                country: String,
                programMajor: String,// enum  eee,ese,ece
                degreeProgram: String,// enum btech,bedu,bsc.... 
                gradingSystem: String,// enum % grade gpa cgpa
                affiliatedUniversity: String,
                totalScore: String, // for grade A+..., for Percent 0-100, gpa 0-10
                maxScore: { type: String, default: "100" },
                startDate: { type: Date },
                endDate: { type: Date, },
                backlogs: { type: Number },
                isCompleted: { type: Boolean },
            },
            postGraduation: {
                custom: { type: Boolean },
                instituteName: String,
                city: String,
                state: String,
                country: String,
                specialization: String,// enum  power and energy systems,computer engineering,data science
                degreeProgram: String,// enum mtech,medu,msc.... 
                gradingSystem: String,// enum % grade gpa cgpa
                affiliatedUniversity: String,
                totalScore: String, // for grade A+..., for Percent 0-100, gpa 0-10
                maxScore: { type: String, default: "100" },
                startDate: { type: Date },
                endDate: { type: Date, },
                backlogs: { type: Number },
                isCompleted: { type: Boolean }
            },
            diploma: {
                custom: { type: Boolean },
                instituteName: String,
                city: String,
                state: String,
                country: String,
                specialization: String,// enum  power and energy systems,computer engineering,data science
                degreeProgram: String,// enum mtech,medu,msc.... 
                gradingSystem: String,// enum % grade gpa cgpa
                affiliatedUniversity: String,
                totalScore: String, // for grade A+..., for Percent 0-100, gpa 0-10
                maxScore: { type: String, default: "100" },
                startDate: { type: Date },
                endDate: { type: Date, },
                backlogs: { type: Number },
                isCompleted: { type: Boolean }
            },
            others: {
                custom: { type: Boolean },
                instituteName: String,
                city: String,
                state: String,
                country: String,
                specialization: String,// enum  power and energy systems,computer engineering,data science
                degreeProgram: String,// enum mtech,medu,msc.... 
                gradingSystem: String,// enum % grade gpa cgpa
                affiliatedUniversity: String,
                totalScore: String, // for grade A+..., for Percent 0-100, gpa 0-10
                maxScore: { type: String, default: "100" },
                startDate: { type: Date },
                endDate: { type: Date, },
                backlogs: { type: Number },
                isCompleted: { type: Boolean }
            }
        },
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
            title: String,
            publication: String,
            fieldOfStudy: String,
            publishedDate: { type: Date, },
            publicationsLevel: { type: String, enum: ["National", "International"] },
        }],
        recommendations: {
            criteria: [Object],
            data: [{
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
            degree: String,
            intake: { type: Date },
            budget: { upper: { type: Number }, lower: { type: Number, } },
            category: [String],
            subCategory: [String],
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
            theme: String,
            currency: String,
            language: String
        },
    }
);


// Student.index({ "location_cord": '2dsphere' })  // future use
export const studentModel = userModel.discriminator("student", Student);