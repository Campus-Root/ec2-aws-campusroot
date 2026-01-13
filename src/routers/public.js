import express from "express";

import { listings, CommunityProfiles, PublicProfile, counsellors, oneCourse, oneUniversity, uniNameRegex, requestCallBack, filters, getBlogById, getDestinationById, getRecommendations } from "../controllers/public/index.js";
import { authMiddleware, conditionalAuth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";




const router = express.Router();
//        {{base}}/api/v1/public

// router.post("/all_universities/", allUniversities);
// router.post("/all_courses", allCourses)
router.post("/listings/:name", rateLimit({ windowMs: 5 * 60 * 1000, max: 100, message: "Too many requests from this IP, please try again later" }), conditionalAuth((req, res, next) => req.body.page > 2, authMiddleware), listings);
router.get("/single_university", oneUniversity);
router.get("/single_course", oneCourse);
// Simple in-memory cache for facets route
const facetsCache = new Map();
const FACETS_CACHE_TTL = 20 * 60 * 1000; // cache for 1 minute (adjust as needed)
async function cachedFilters(req, res, next) {
    try {
        const cacheKey = JSON.stringify({ path: req.path, params: req.params, body: req.body });
        // Check for cached response and TTL
        const cached = facetsCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < FACETS_CACHE_TTL)) return res.json(cached.data);
        // Patch res.json to store the cache
        const origJson = res.json.bind(res);
        res.json = (body) => {
            facetsCache.set(cacheKey, { data: body, timestamp: Date.now() });
            return origJson(body);
        };
        // Call original filters handler
        return filters(req, res, next);
    } catch (err) {
        return next(err);
    }
}

router.post("/facets/:name", rateLimit({ windowMs: 5 * 60 * 1000, max: 100, message: "Too many requests from this IP, please try again later" }), cachedFilters);
router.get("/profile/:id", authMiddleware, PublicProfile);
router.get("/profiles", authMiddleware, CommunityProfiles);
router.get("/blog/:id", getBlogById)
router.get("/destination/:id", getDestinationById)
// router.get("/all_destinations", allDestinations);
// router.get("/single_destination/:id", oneDestination);
router.get("/counsellors", counsellors);
// router.post("/all_courses", allCourses);
router.get("/university", uniNameRegex);
router.post("/callback", requestCallBack);
router.post('/filter-programs', getRecommendations)

export default router