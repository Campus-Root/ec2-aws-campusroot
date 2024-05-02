import express from "express";

import { listings, CommunityProfiles, PublicProfile, counsellors, oneCourse, oneUniversity, uniNameRegex, requestCallBack } from "../controllers/public/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { limiter } from "../middleware/ratelimiter.js";




const router = express.Router();
//        {{base}}/api/v1/public

// router.post("/all_universities/", allUniversities);
// router.post("/all_courses", allCourses)
router.post("/listings/:name", limiter,listings);
router.get("/single_university", oneUniversity);
router.get("/single_course", oneCourse);


router.get("/profile/:id", authMiddleware, PublicProfile);
router.get("/profiles", authMiddleware, CommunityProfiles);



// router.get("/all_destinations", allDestinations);
// router.get("/single_destination/:id", oneDestination);
router.get("/counsellors", counsellors);
// router.post("/all_courses", allCourses);


router.get("/university", uniNameRegex);
router.post("/callback",requestCallBack);

export default router