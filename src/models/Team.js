import mongoose from "mongoose";
import { DestinationTypeEnum, TeamRoleEnum, studentCounsellingStagesEnum } from "../utils/enum.js";
import userModel from "./User.js";

const Team = mongoose.Schema({
    role: { type: String, enum: { values: Object.values(TeamRoleEnum), message: "Invalid role" } },
    students: [{ profile: { type: mongoose.Types.ObjectId, ref: "user", }, stage: { type: String, enum: { values: Object.values(studentCounsellingStagesEnum), message: "Invalid stage" } }, nextActionDate: { type: String, } }], // for counsellors
    expertiseCountry: [{ type: String, enum: { values: Object.values(DestinationTypeEnum), message: "Invalid country" } }],
    numberOfStudentsAssisted: { type: Number, default: 0 }, // for counsellors
    linkedIn: { type: String }, // for all team
    googleTokens: {
        access_token: { type: String },
        refresh_token: { type: String },
        token_type: { type: String },
        expiry_date: { type: String },
    },// for all team
    language: { type: [String] },
    leads: [{ type: mongoose.Types.ObjectId, ref: "leads" }],// for remoteStudentAdvisor
    applications: [{ type: mongoose.Types.ObjectId, ref: "product" }],// for Process Coordinators
    institution: { type: mongoose.Types.ObjectId, ref: 'institution' }, // for IEM member
    updates: [{ type: Object }]
}
);

export const teamModel = userModel.discriminator("member", Team);