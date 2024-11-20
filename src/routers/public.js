import express from "express";

import { listings, CommunityProfiles, PublicProfile, counsellors, oneCourse, oneUniversity, uniNameRegex, requestCallBack, search, filters, filtersNew, listingsNew, oneCourseNew, getBlogById } from "../controllers/public/index.js";
import { authMiddleware, conditionalAuth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";




const router = express.Router();
//        {{base}}/api/v1/public

// router.post("/all_universities/", allUniversities);
// router.post("/all_courses", allCourses)
router.post("/listings/:name", rateLimit({ windowMs: 5 * 60 * 1000, max: 100, message: "Too many requests from this IP, please try again later" }), conditionalAuth((req, res, next) => req.body.page > 2, authMiddleware), listings);
router.get("/single_university", oneUniversity);
router.get("/single_course", oneCourse);
router.post("/facets/:name", rateLimit({ windowMs: 5 * 60 * 1000, max: 100, message: "Too many requests from this IP, please try again later" }), filters)
router.post("/newlistings/:name", rateLimit({ windowMs: 5 * 60 * 1000, max: 100, message: "Too many requests from this IP, please try again later" }), conditionalAuth((req, res, next) => req.body.page > 2, authMiddleware), listingsNew);
router.post("/newfacets/:name", rateLimit({ windowMs: 5 * 60 * 1000, max: 100, message: "Too many requests from this IP, please try again later" }), filtersNew)
router.get("/newsingle_course", oneCourseNew);
router.get("/profile/:id", authMiddleware, PublicProfile);
router.get("/profiles", authMiddleware, CommunityProfiles);
router.get("/blog/:id", getBlogById)

router.get("/search", search)
// router.get("/all_destinations", allDestinations);
// router.get("/single_destination/:id", oneDestination);
router.get("/counsellors", counsellors);
// router.post("/all_courses", allCourses);
router.get("/university", uniNameRegex);
router.post("/callback", requestCallBack);

export default router