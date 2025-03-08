import mongoose from "mongoose";
import { DestinationTypeEnum, UniversityTypeEnum, CurrencySymbolEnum } from "../utils/enum.js";

const universitySchema = mongoose.Schema(
    {
        rank: { type: Object },
        acceptanceRate: { type: String },
        graduationRate: { type: String },
        medianEarning: { type: Object },
        rating: { type: Object },
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
        },
        geoCoordinates: {
            type: { type: String, default: 'Point' },
            coordinates: [Number],
        },
    },
    { timestamps: true }
);
universitySchema.index({
    name: "text",
    code: "text",
    geoCoordinates: '2dsphere'
});
const universityModel = mongoose.model("university", universitySchema);
export default universityModel