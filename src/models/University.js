import mongoose from "mongoose";
import { DestinationTypeEnum, UniversityTypeEnum, CurrencySymbolEnum } from "../utils/enum.js";

const universitySchema = mongoose.Schema(
    {
        ranking: [{ rank: { type: Number }, source: { type: String }, }],
        name: { type: String, required: [true, "Please provide name"], minlength: 3, trim: true, },
        code: { type: String, },
        location: {
            country: {
                type: String, enum: {
                    values: Object.values(DestinationTypeEnum),
                    message: "Invalid Type"
                },
            },
            state: { type: String },
            city: { type: String },
            campus: { type: String },
        },
        universityLink: { type: String }, // not to user  hide
        generalRequirementLink: { type: String }, // not to user hide
        completeProgramLink: { type: String }, // not to user hide
        decisionTAT: { type: Number },// not to user hide
        currency: {
            symbol: { type: String, enum: { values: Object.values(CurrencySymbolEnum), message: "Invalid Type of currency symbol" } },
            code: { type: String, enum: { values: Object.keys(CurrencySymbolEnum), message: "Invalid Type of currency code" } },
        },
        logoSrc: { type: String },
        pictureSrc: { type: String },
        type: {
            type: String, enum: {
                values: Object.values(UniversityTypeEnum),
                message: "Invalid Type"
            }
        },
        establishedYear: { type: Number },
        about: { type: String },
        campusrootReview: { type: Number }, //hide
        graduationRate: { type: Number },
        acceptanceRate: { type: Number },
        cost: [
            {
                name: { type: String },
                lowerLimit: { type: Number },
                upperLimit: { type: Number },
            }
        ],
        scholarship: { type: Boolean, default: "true" }, //hide
        loanDetails: { type: Object },// to be modefied //hide
        userReviews: [{ type: mongoose.Types.ObjectId, ref: "reviews", }],
        courses: { type: Number },
        profilesAdmits: [{ type: mongoose.Types.ObjectId, ref: "user", }],
        community: { type: mongoose.Types.ObjectId, ref: "community", },
        roi: { type: Number },
        uni_rating: { type: Number },
        contact: {
            facebook: { type: String },
            twitter: { type: String },
            instagram: { type: String },
            youtube: { type: String },
            snapchat: { type: String },
            linkedIn: { type: String },
            officialWebsite: { type: String }
        }
    },
    { timestamps: true }
);


const universityModel = mongoose.model("university", universitySchema);
export default universityModel
