import { downloadDoc, listings, newStudents, profile, profileEdit, singleApplications, singleStudentProfile } from "../controllers/team/index.js";
import { calendarEvents, generatingAuthUrl, googleAuthentication } from "../controllers/team/calendar.js";
import { authMiddleware, isTeam } from "../middleware/auth.js";
import express from "express";
import { createBlog, deleteBlog, getBlogs, updateBlog } from "../controllers/team/blogs.js";


const router = express.Router();
//        {{base}}/api/v1/member
router.get("/", authMiddleware, isTeam, profile)
router.put("/", authMiddleware, isTeam, profileEdit)
router.get("/doc/:documentId", authMiddleware, isTeam, downloadDoc);
router.post("/listings/:name", authMiddleware, isTeam, listings)
router.get("/students/:id", authMiddleware, isTeam, singleStudentProfile);
router.get("/applications/:id", authMiddleware, isTeam, singleApplications);
router.get("/google", generatingAuthUrl)
router.get("/google/login", googleAuthentication)
router.get("/events", authMiddleware, isTeam, calendarEvents)
router.post('/new-students', authMiddleware, isTeam, newStudents)
router.post("/blog", authMiddleware, isTeam, createBlog)
router.get("/blog", authMiddleware, isTeam, getBlogs)
router.put("/blog/:id", authMiddleware, isTeam, updateBlog)
router.delete("/blog/:id", authMiddleware, isTeam, deleteBlog)
export default router;





// Import dependencies
// import { graphqlHTTP } from 'express-graphql';
// import { buildSchema } from 'graphql';
// import { studentModel } from "../models/Student.js";
// import leadsModel from "../models/leads.js";

// Define the GraphQL schema
// const schema = buildSchema(`
//   type Student {
//     firstName: String
//     lastName: String
//     email: String
//     displayPicSrc: String
//     phone: String
//     verification: Boolean
//     recommendations: [String]
//     preference: String
//     stage: String
//   }

//   type Application {
//     course: String
//     university: String
//     intake: String
//     deadline: String
//     user: String
//     approval: String
//     stage: String
//     status: String
//     cancellationRequest: String
//     createdAt: String
//     updatedAt: String
//   }

//   type Lead {
//     name: String
//     email: String
//     phone: String
//     queryDescription: String
//     ifPhoneIsSameAsWhatsapp: Boolean
//     whatsappNumber: String
//     student: String
//     leadSource: String
//     leadRating: String
//   }

//   type Query {
//     students(page: Int!, perPage: Int!): [Student]
//     applications(page: Int!, perPage: Int!): [Application]
//     leads(page: Int!, perPage: Int!): [Lead]
//   }
// `);

// Define the GraphQL root resolver
// const root = {
//     students: async ({ page, perPage }) => {
//         const skip = (page - 1) * perPage;
//         const listOfStudents = await studentModel.find().skip(skip).limit(perPage);
//         return listOfStudents;
//     },
//     applications: async ({ page, perPage }) => {
//         const skip = (page - 1) * perPage;
//         const applications = await productModel.find().skip(skip).limit(perPage);
//         return applications;
//     },
//     leads: async ({ page, perPage }) => {
//         const skip = (page - 1) * perPage;
//         const leads = await leadsModel.find().skip(skip).limit(perPage);
//         return leads;
//     },
// };

// Set up the GraphQL endpoint
// router.use('/graphql', graphqlHTTP({ schema: schema, rootValue: root, graphiql: true,}));