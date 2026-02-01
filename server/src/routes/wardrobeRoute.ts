import Wardrobe from "../controllers/wardrobeController";
import { UploadController } from "../controllers/upload-controller";
import { Middleware } from "../middlewares/middlewares";
import { validate } from "../validation/zodSchema";
import {
  AddClothSchema,
  UpdateClothSchema,
  CreateOutfitSchema,
  UpdateOutfitSchema,
  StyleProfileSchema,
  SuggestFullOutfitSchema,
  SuggestFromItemSchema,
  SuggestLayerSchema,
  SuggestFootwearSchema,
  GeneratePairingsSchema,
  SavePairingSchema,
  LogWearSchema,
} from "../validation/zodSchema";
import { Router } from "express";

const router = Router();

// All wardrobe routes require authentication
router.use(Middleware.VerifyJWT);

// ─── Cloth Options (guided metadata for uploads) ─────────────────────────────

router.get("/cloth-options", Wardrobe.getClothOptions);

// ─── Clothing Items ─────────────────────────────────────────────────────────

router.post("/cloths", validate(AddClothSchema), Wardrobe.addCloth);
router.get("/cloths", Wardrobe.getYourCloths);
router.get("/cloths/:id", Wardrobe.getYourClothById);
router.put("/cloths/:id", validate(UpdateClothSchema), Wardrobe.updateCloth);
router.patch("/cloths/:id/archive", Wardrobe.archiveCloth);
router.delete("/cloths/:id", Wardrobe.deleteCloth);

// ─── Outfits ────────────────────────────────────────────────────────────────

router.post("/outfits", validate(CreateOutfitSchema), Wardrobe.createOutfit);
router.get("/outfits", Wardrobe.getYourOutfits);
router.get("/outfits/:id", Wardrobe.getOutfitById);
router.put("/outfits/:id", validate(UpdateOutfitSchema), Wardrobe.updateOutfit);
router.patch("/outfits/:id/favorite", Wardrobe.toggleFavorite);
router.delete("/outfits/:id", Wardrobe.deleteOutfit);

// ─── Style Profile ──────────────────────────────────────────────────────────

router.put("/style-profile", validate(StyleProfileSchema), Wardrobe.upsertStyleProfile);
router.get("/style-profile", Wardrobe.getStyleProfile);
router.get("/profile-options", Wardrobe.getProfileOptions);

// ─── Product Catalog (demo) ─────────────────────────────────────────────────

router.get("/product-catalog", Wardrobe.getProductCatalog);

// ─── Suggestions (MasterEngine) ─────────────────────────────────────────────

router.post("/suggest/full-outfit", validate(SuggestFullOutfitSchema), Wardrobe.suggestFullOutfit);
router.post("/suggest/from-item", validate(SuggestFromItemSchema), Wardrobe.suggestFromItem);
router.post("/suggest/top", validate(SuggestFullOutfitSchema), Wardrobe.suggestTop);
router.post("/suggest/layer", validate(SuggestLayerSchema), Wardrobe.suggestLayer);
router.post("/suggest/footwear", validate(SuggestFootwearSchema), Wardrobe.suggestFootwear);

// ─── Pairings (scan wardrobe → auto-generate outfits) ────────────────────────

router.post("/generate-pairings", validate(GeneratePairingsSchema), Wardrobe.generatePairings);
router.post("/save-pairing", validate(SavePairingSchema), Wardrobe.savePairing);

// ─── Wear Tracking ────────────────────────────────────────────────────────────

router.post("/wear-log", validate(LogWearSchema), Wardrobe.logWear);
router.get("/wear-log", Wardrobe.getWearHistory);
router.get("/wear-stats", Wardrobe.getWearStats);

// ─── Upload ─────────────────────────────────────────────────────────────────

router.post("/generate-upload-url", UploadController.generateUploadUrl);

export default router;
