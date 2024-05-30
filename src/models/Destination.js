import mongoose from "mongoose";
import { DestinationTypeEnum } from "../utils/enum.js";

const destinationSchema = mongoose.Schema({
    name: { type: String, },
    academic_reputation: {
        university_rankings: {
            QS_World_Ranking: { type: String, },
            Times_Higher_Education: { type: String, },
        },
        accreditation: { type: String, },
    },
    courses_and_curriculum: {
        program_offerings: { type: String, },
        curriculum_structure: { type: String, },
    },
    cost_of_education: {
        tuition_fees: { type: String, },
        scholarships_and_financial_aid: { type: String, },
    },
    living_expenses: {
        cost_of_living: { type: String, },
        housing_options: {
            on_campus: { type: String, },
            off_campus: { type: String, },
        }
    },
    visa_and_immigration_policies: {
        student_visa_requirements: { type: String, },
        work_opportunities: { type: String, },
    },
    safety_and_security: {
        crime_rates: { type: String, },
        university_safety_measures: { type: String, },
    },
    cultural_and_social_environment: {
        cultural_diversity: { type: String, },
        language: { type: String, },
        social_life: { type: String, },
    },
    quality_of_life: {
        healthcare_facilities: { type: String, },
        public_transport: { type: String, },
    },
    employment_prospects: {
        internship_opportunities: { type: String, },
        job_market: { type: String, },
    },
    climate_and_geography: {
        weather_conditions: { type: String, },
        geographical_location: { type: String, },
    },
    reviews_and_testimonials: {
        alumni_feedback: { type: String, },
        online_forums_and_communities: { type: String, },
    },
    regulatory_environment: {
        legal_framework: { type: String, },
        institutional_support: { type: String, },
    }
    // destinationName: {
    //     type: String, enum: {
    //         values: Object.values(DestinationTypeEnum),
    //         message: "Invalid Type"
    //     }, unique: true
    // },
    // destinationPicSrc: { type: String, },
    // flagSrc: { type: String, },
    // capitalCity: { type: String, },
    // climate: {
    //     min: { type: Number, },
    //     max: { type: Number, }
    // },
    // UniversitiesCount: { type: Number, default: 7 },
    // InternationalStudentsCount: { type: Number, default: 1000 },
    // callingCode: { type: String },
    // currency: { type: String, default: "United States Dollar" },
    // about: { type: String },
},
    { timestamps: true }
);


const destinationModel = mongoose.model("destination", destinationSchema);
export default destinationModel