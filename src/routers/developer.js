import express from "express";
import {allUniversities, courseDescriptionCreation,  devDetails, editCourse,  uniDeletion, uniDescriptionCreate, uniDescriptionUpdate, retrive, injectionCourse, test, createCommunity, deleteCommunity, addPackage } from "../controllers/developer/index.js";
import { authMiddleware, isDeveloper } from "../middleware/auth.js";





const router = express.Router();
//        {{localhost:5000}}/api/v1/developer 

router.get("/profile", authMiddleware, isDeveloper, devDetails);
router.get("/all-universities", authMiddleware, isDeveloper, allUniversities);

router.post("/create-package", authMiddleware, isDeveloper, addPackage)

router.post("/edit-course/:id", authMiddleware, isDeveloper, editCourse)

router.post("/create-university-description", authMiddleware, isDeveloper, uniDescriptionCreate);
router.post("/update-university-description/:id", authMiddleware, isDeveloper, uniDescriptionUpdate);
router.post("/create-course-description/:id", authMiddleware, isDeveloper, courseDescriptionCreation);
router.delete("/delete-one-university/:id", authMiddleware, isDeveloper, uniDeletion);
router.post("/injection-course", injectionCourse);
router.get("/retrive", retrive);
router.post("/test", test)
router.post("/create-community", authMiddleware, isDeveloper, createCommunity);
router.delete("/delete-community/:communityId", authMiddleware, isDeveloper, deleteCommunity) /// just in development phase
export default router;
