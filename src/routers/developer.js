import express from "express";
import { allDestinations, addDestination, allUniversities, courseDescriptionCreation, deleteDestination, devDetails, editCourse, editDestination, uniDeletion, uniDescriptionCreate, uniDescriptionUpdate, retrive, injectionCourse, test, createCommunity, deleteCommunity } from "../controllers/developer/index.js";
import { authMiddleware, isDeveloper } from "../middleware/auth.js";





const router = express.Router();
//        {{localhost:5000}}/api/v1/developer 

router.get("/profile", authMiddleware, isDeveloper, devDetails);
router.get("/all-universities", authMiddleware, isDeveloper, allUniversities);
router.get("/allDestinations", authMiddleware, isDeveloper, allDestinations);
router.post("/create-destination", authMiddleware, isDeveloper, addDestination);
router.post("/edit-destination/:id", authMiddleware, isDeveloper, editDestination)
router.post("/edit-course/:id", authMiddleware, isDeveloper, editCourse)
router.delete("/delete-destination/:id", authMiddleware, isDeveloper, deleteDestination)
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
