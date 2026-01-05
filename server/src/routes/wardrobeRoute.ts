import Wardrobe from "../controllers/wardrobeController";
import {UploadController} from "../controllers/upload-controller";
import { Middleware } from "../middlewares/middlewares";
import { Router } from "express";

const router = Router();

router.use(Middleware.VerifyJWT);

router.post("/add-cloth", Wardrobe.addCloth);
router.get("/cloths", Wardrobe.getYourCloths);
router.get("/cloths/:id", Wardrobe.getYourClothById);
router.post("/make-pair", Wardrobe.makePair);
router.get("/pairs", Wardrobe.getYourPairs);
router.get("/pairs/:id", Wardrobe.getYourPairById);
router.put("/pairs/:id", Wardrobe.updatePair);
router.post("/generate-upload-url", UploadController.generateUploadUrl);

export default router;
