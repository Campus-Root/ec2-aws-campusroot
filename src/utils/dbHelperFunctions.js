import { teamModel } from "../models/Team.js";

export const getNewAdvisor = async (role, country) => {
    let advisors = []
    switch (role) {
        case "remoteStudentAdvisor":
            advisors = await teamModel.aggregate([
                { $match: { role: role } },
                { $project: { _id: 1, leadsCount: { $size: "$leads" } } },
                { $sort: { leadsCount: 1 } },
                { $limit: 1 }
            ]);
            break;
        case "counsellor":
            advisors = await teamModel.aggregate([
                { $match: { role: role, expertiseCountry: country } },
                { $project: { _id: 1, studentsCount: { $size: "$students" } } },
                { $sort: { studentsCount: 1 } },
                { $limit: 1 }
            ]);
            break;
        case "processCoordinator":
            advisors = await teamModel.aggregate([
                { $match: { role: role, expertiseCountry: country } },
                { $project: { _id: 1, applicationsCount: { $size: "$applications" } } },
                { $sort: { applicationsCount: 1 } },
                { $limit: 1 }
            ]);
            break;
    }
    return advisors[0]
}