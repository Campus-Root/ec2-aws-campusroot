import mongoose from "mongoose";
import { disciplineEnum,DestinationTypeEnum } from "../utils/enum.js";

const destinationSchema = mongoose.Schema({
    destinationName: {
        type: String, enum: {
            values: Object.values(DestinationTypeEnum),
            message: "Invalid Type"
        }, unique: true
    },
    destinationPicSrc: { type: String, },
    flagSrc: { type: String, },
    capitalCity: { type: String, },
    climate: {
        min: { type: Number, },
        max: { type: Number, }
    },
    UniversitiesCount: { type: Number, default: 7 },
    InternationalStudentsCount: { type: Number, default: 1000 },
    callingCode:{type:String},
    currency: { type: String, default: "United States Dollar" },
    about: { type: String },
    popularPrograms: [{ type: String,values: Object.values(disciplineEnum),
        message: "Invalid discipline"}],
    topUniversities: [{ type: mongoose.Types.ObjectId, ref: "university", }]

},
    { timestamps: true }
);


const destinationModel = mongoose.model("destination", destinationSchema);
export default destinationModel