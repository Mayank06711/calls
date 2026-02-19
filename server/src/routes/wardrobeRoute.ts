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
  UpdatePlannedWearSchema,
  BatchUploadSchema,
  AddClothBatchSchema,
  CreateCollectionSchema,
  UpdateCollectionSchema,
  CollectionItemsSchema,
  SendOutfitSchema,
} from "../validation/zodSchema";
import { Router } from "express";

// ─── Public route (no auth) — shared outfit viewer ───────────────────────────
export const publicWardrobeRouter = Router();
publicWardrobeRouter.get("/outfits/:shareToken", Wardrobe.getSharedOutfit);
publicWardrobeRouter.post("/outfits/:shareToken/like", Wardrobe.likeSharedOutfit);
publicWardrobeRouter.post("/outfits/:shareToken/save", Middleware.VerifyJWT, Wardrobe.toggleSaveOutfit);

const router = Router();

// All wardrobe routes require authentication
router.use(Middleware.VerifyJWT);

// ─── Cloth Options (guided metadata for uploads) ─────────────────────────────

router.get("/cloth-options", Wardrobe.getClothOptions);

// ─── Clothing Items ─────────────────────────────────────────────────────────

router.post("/cloths", validate(AddClothSchema), Wardrobe.addCloth);
router.post("/cloths/batch", validate(AddClothBatchSchema), Wardrobe.addClothBatch);
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
router.patch("/outfits/:id/share", Wardrobe.shareOutfit);
router.post("/outfits/:id/send", validate(SendOutfitSchema), Wardrobe.sendOutfitToUser);
router.delete("/outfits/:id", Wardrobe.deleteOutfit);
router.get("/saved-outfits", Wardrobe.getSavedOutfits);

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
router.get("/planned-wears", Wardrobe.getPlannedWears);
router.patch("/planned-wears/:id/worn", Wardrobe.markPlannedAsWorn);
router.put("/planned-wears/:id", validate(UpdatePlannedWearSchema), Wardrobe.updatePlannedWear);
router.delete("/planned-wears/:id", Wardrobe.deletePlannedWear);

// ─── Phase 7: Python AI Service (proxied) ─────────────────────────────────────

router.post("/process-item", Wardrobe.processItem);
router.post("/generate-flatlay", Wardrobe.generateFlatlay);

// ─── Collections ────────────────────────────────────────────────────────────

router.post("/collections", validate(CreateCollectionSchema), Wardrobe.createCollection);
router.get("/collections", Wardrobe.getCollections);
router.get("/collections/:id", Wardrobe.getCollectionById);
router.put("/collections/:id", validate(UpdateCollectionSchema), Wardrobe.updateCollection);
router.delete("/collections/:id", Wardrobe.deleteCollection);
router.post("/collections/:id/items", validate(CollectionItemsSchema), Wardrobe.addItemsToCollection);
router.post("/collections/:id/items/remove", validate(CollectionItemsSchema), Wardrobe.removeItemsFromCollection);

// ─── Upload ─────────────────────────────────────────────────────────────────

router.post("/generate-upload-url", UploadController.generateUploadUrl);
router.post("/generate-upload-urls", validate(BatchUploadSchema), UploadController.generateUploadUrls);

export default router;
