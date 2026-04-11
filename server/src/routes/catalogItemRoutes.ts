import express from "express";
import CatalogItemController from "../controllers/catalogItemController";
import { Middleware } from "../middlewares/middlewares";
import {
  validate,
  CreateCatalogItemSchema,
  UpdateCatalogItemSchema,
  AddCatalogSuggestionSchema,
} from "../validation/zodSchema";

const router = express.Router();

// All routes require authentication
router.use(Middleware.VerifyJWT);

// List catalog items (any expert)
router.get("/", CatalogItemController.listItems);

// Single item detail (any expert)
router.get("/:id", CatalogItemController.getItem);

// Create new item (any expert)
router.post("/", validate(CreateCatalogItemSchema), CatalogItemController.createItem);

// Update item (creator only)
router.put("/:id", validate(UpdateCatalogItemSchema), CatalogItemController.updateItem);

// Soft delete item (creator only)
router.delete("/:id", CatalogItemController.deleteItem);

// Add suggestion (any expert except creator)
router.post("/:id/suggestions", validate(AddCatalogSuggestionSchema), CatalogItemController.addSuggestion);

export default router;
