import express from "express";
import BookingController from "../controllers/bookingController";
import SessionPermissionController from "../controllers/sessionPermissionController";
import { Middleware } from "../middlewares/middlewares";
import { validate, CreateBookingSchema, CreateInstantBookingSchema, CancelBookingSchema, TogglePermissionsSchema, ShareCatalogItemSchema, RequestTryOnSchema, ExtendSessionSchema, SendBookingChatMessageSchema } from "../validation/zodSchema";

const router = express.Router();

// All routes require authentication
router.use(Middleware.VerifyJWT);

// Available slots for an expert on a given date
router.get("/slots/:expertId", BookingController.getAvailableSlots);

// Create a booking
router.post("/", validate(CreateBookingSchema), BookingController.createBooking);

// Instant booking (find online expert, auto-create booking)
router.post("/instant", validate(CreateInstantBookingSchema), BookingController.createInstantBooking);

// User's bookings
router.get("/my", BookingController.getMyBookings);

// Expert's bookings
router.get("/expert", BookingController.getExpertBookings);

// Cancel a booking
router.post("/:id/cancel", validate(CancelBookingSchema), BookingController.cancelBooking);

// Connect to session (2-min window before session, works for both user and expert)
router.post("/:id/connect", BookingController.connectBooking);

// Extend session (user only, during active session with ≤ 2 min remaining)
router.post("/:id/extend", validate(ExtendSessionSchema), BookingController.extendSession);

// ── Session Permission endpoints ────────────────────────────────────────────

// Booking detail (user + expert)
router.get("/:id/detail", SessionPermissionController.getBookingDetail);

// Toggle permissions (user only)
router.patch("/:id/permissions", validate(TogglePermissionsSchema), SessionPermissionController.togglePermissions);

// Client closet (expert only, requires closet permission)
router.get("/:id/client-closet", SessionPermissionController.getClientCloset);
router.post("/:id/client-closet", SessionPermissionController.addClientClosetItem);
router.put("/:id/client-closet/:itemId", SessionPermissionController.editClientClosetItem);

// Client outfits (expert only, requires outfits permission)
router.get("/:id/client-outfits", SessionPermissionController.getClientOutfits);
router.post("/:id/client-outfits", SessionPermissionController.createClientOutfit);

// Share catalog item with client (expert only, requires active session)
router.post("/:id/share-catalog-item", validate(ShareCatalogItemSchema), SessionPermissionController.shareCatalogItem);

// Virtual try-on (both user and expert, requires active session)
router.post("/:id/try-on", validate(RequestTryOnSchema), SessionPermissionController.requestTryOn);
router.post("/:id/try-on-upload-url", SessionPermissionController.generateTryOnUploadUrl);

// ── Booking Chat endpoints ──────────────────────────────────────────────
router.get("/:id/chat", SessionPermissionController.getBookingChat);
router.post("/:id/chat", validate(SendBookingChatMessageSchema), SessionPermissionController.sendBookingChatMessage);

export default router;
