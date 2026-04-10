import { Request, Response } from "express";
import moment from "moment-timezone";
import { Types } from "mongoose";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { BookingModel } from "../models/bookingModel";
import { SessionPermissionModel } from "../models/sessionPermissionModel";
import { StyleProfileModel } from "../models/styleProfileModel";
import { ClothingItemModel } from "../models/clothModel";
import { OutfitModel } from "../models/outfitModel";
import { UserModel } from "../models/userModel";
import { ExpertModel } from "../models/expertModel";
import { CatalogItemModel } from "../models/catalogItemModel";
import { BookingChatModel } from "../models/bookingChatModel";
import { SocketManager } from "../socket";
import { NanoBananaService } from "../services/tryon/nanobanana.service";
import { CLOUDINARY_SERVICES } from "../helper/cloudinary";

// ─── Helpers ────────────────────────────────────────────────────────────────

const GRACE_MINUTES = 5;
const CHAT_BUFFER_MINUTES = 2;

/**
 * Determine if the booking chat is writable.
 * Writable when: booking status is "confirmed" AND now <= endTime + CHAT_BUFFER_MINUTES.
 */
function computeChatWritable(booking: any): boolean {
  if (booking.status !== "confirmed") return false;
  // Instant bookings before "start": always writable so expert can type "start"
  if (booking.isInstant && !booking.startedAt) return true;
  const tz = booking.timezone || "Asia/Kolkata";
  const dateStr = moment(booking.date).tz(tz).format("YYYY-MM-DD");
  const sessionEnd = moment.tz(
    `${dateStr} ${booking.endTime}`,
    "YYYY-MM-DD HH:mm",
    tz
  );
  const chatDeadline = moment(sessionEnd).add(CHAT_BUFFER_MINUTES, "minutes");
  return moment().isSameOrBefore(chatDeadline);
}

interface SessionContext {
  booking: any;
  permission: any;
  role: "user" | "expert";
}

/**
 * Validate that a booking session is active and the requester is a participant.
 * Optionally checks a specific permission bit.
 * Auto-revokes permissions for expired sessions.
 */
async function assertActiveSession(
  bookingId: string,
  requesterId: string,
  requiredPerm?: "closet" | "outfits"
): Promise<SessionContext> {
  const booking = await BookingModel.findById(bookingId).lean();
  if (!booking) throw new ApiError(404, "Booking not found");

  // Determine role
  const isBooker = booking.user.toString() === requesterId;
  const isExpert = booking.expertUser.toString() === requesterId;
  if (!isBooker && !isExpert) {
    throw new ApiError(403, "Not your booking");
  }
  const role = isBooker ? "user" : "expert";

  // Load or lazy-create permission doc
  let permission = await SessionPermissionModel.findOne({ booking: bookingId });
  if (!permission) {
    permission = await SessionPermissionModel.create({
      booking: bookingId,
      user: booking.user,
      expert: booking.expertUser,
      permissions: { closet: false, outfits: false },
      isActive: true,
      grantedAt: new Date(),
    });
  }

  // Check booking is confirmed
  if (booking.status !== "confirmed") {
    // Auto-revoke if not already
    if (permission.isActive) {
      permission.isActive = false;
      permission.revokedAt = new Date();
      await permission.save();
    }
    throw new ApiError(403, "Session is no longer active");
  }

  // Instant bookings before "start": session is active, skip time check
  if (!(booking.isInstant && !booking.startedAt)) {
    // Check time window: session endTime + grace period
    const tz = booking.timezone || "Asia/Kolkata";
    const dateStr = moment(booking.date).tz(tz).format("YYYY-MM-DD");
    const sessionEnd = moment.tz(
      `${dateStr} ${booking.endTime}`,
      "YYYY-MM-DD HH:mm",
      tz
    );
    const graceEnd = moment(sessionEnd).add(GRACE_MINUTES, "minutes");
    const now = moment();

    if (now.isAfter(graceEnd)) {
      // Auto-revoke
      if (permission.isActive) {
        permission.isActive = false;
        permission.revokedAt = new Date();
        await permission.save();
      }
      throw new ApiError(403, "Session has ended. Access revoked.");
    }
  }

  // Check specific permission if required
  if (requiredPerm && !permission.permissions[requiredPerm]) {
    throw new ApiError(403, `Client has not shared ${requiredPerm} access`);
  }

  return { booking, permission, role };
}

// ─── Controller ─────────────────────────────────────────────────────────────

class SessionPermissionController {
  /**
   * GET /bookings/:id/detail
   * Returns booking detail with role-based data.
   * Works for all booking statuses (confirmed, completed, cancelled).
   * Expert always gets style profile + profile images for confirmed/completed.
   * Permission-gated actions are only available for active sessions.
   */
  private static async _getBookingDetail(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;

    // Simpler check: just verify booking exists and user is a participant
    const booking = await BookingModel.findById(id)
      .populate({
        path: "sharedCatalogItems.catalogItem",
        select: "title description images category gender tags clothingType subcategory brand priceRange styleVibe hairType hairLength faceShapes maintenanceLevel lookType skinTones products",
        match: { isDeleted: { $ne: true } },
      })
      .lean();
    if (!booking) throw new ApiError(404, "Booking not found");

    const isBooker = booking.user.toString() === userId.toString();
    const isExpert = booking.expertUser.toString() === userId.toString();
    if (!isBooker && !isExpert) {
      throw new ApiError(403, "Not your booking");
    }
    const role = isBooker ? "user" : "expert";

    // Load or lazy-create permission doc
    let permission = await SessionPermissionModel.findOne({ booking: id });
    if (!permission) {
      permission = await SessionPermissionModel.create({
        booking: id,
        user: booking.user,
        expert: booking.expertUser,
        permissions: { closet: false, outfits: false },
        isActive: true,
        grantedAt: new Date(),
      });
    }

    // Determine if session is still active (for UI purposes)
    let sessionActive = booking.status === "confirmed";
    if (sessionActive) {
      // Instant bookings before "start": keep session active so expert can type "start"
      if (booking.isInstant && !booking.startedAt) {
        sessionActive = true;
      } else {
        const tz = booking.timezone || "Asia/Kolkata";
        const dateStr = moment(booking.date).tz(tz).format("YYYY-MM-DD");
        const sessionEnd = moment.tz(
          `${dateStr} ${booking.endTime}`,
          "YYYY-MM-DD HH:mm",
          tz
        );
        const graceEnd = moment(sessionEnd).add(GRACE_MINUTES, "minutes");
        if (moment().isAfter(graceEnd)) {
          sessionActive = false;
          // Auto-revoke if not already
          if (permission.isActive) {
            permission.isActive = false;
            permission.revokedAt = new Date();
            await permission.save();
          }
        }
      }
    }

    // For non-active sessions, force permissions off
    const effectivePermissions = sessionActive
      ? permission.permissions
      : { closet: false, outfits: false };

    // Compute extension info for active sessions
    let creditRatePerMinute = 0;
    let totalExtendedMinutes = 0;
    if (sessionActive && booking.status === "confirmed") {
      totalExtendedMinutes = (booking.extensions || []).reduce(
        (sum: number, ext: any) => sum + ext.minutes, 0
      );
      // Fetch expert pricing for rate calculation
      const pricingDoc = await ExpertModel.findById(booking.expert).select("pricing").lean();
      if (pricingDoc?.pricing) {
        const p = pricingDoc.pricing;
        if (p.per60Min > 0) creditRatePerMinute = Math.ceil(p.per60Min / 60);
        else if (p.per30Min > 0) creditRatePerMinute = Math.ceil(p.per30Min / 30);
        else if (p.per15Min > 0) creditRatePerMinute = Math.ceil(p.per15Min / 15);
      }
    }

    // Compute chat availability
    const hasChat = !!booking.connectedAt;
    const chatWritable = hasChat ? computeChatWritable(booking) : false;

    const result: any = {
      booking: {
        _id: booking._id,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        duration: booking.duration,
        timezone: booking.timezone,
        status: booking.status,
        creditsCharged: booking.creditsCharged,
        notes: booking.notes,
        connectedAt: booking.connectedAt,
        isInstant: booking.isInstant || false,
        startedAt: booking.startedAt || null,
        sharedCatalogItems: booking.sharedCatalogItems || [],
        tryOnResults: booking.tryOnResults || [],
        ...(sessionActive ? { creditRatePerMinute, totalExtendedMinutes, maxExtensionMinutes: 30 } : {}),
      },
      permissions: effectivePermissions,
      sessionActive,
      role,
      hasChat,
      chatWritable,
    };

    if (role === "user") {
      // User sees expert info
      const expertDoc = await ExpertModel.findById(booking.expert)
        .select("specializations experienceInYears pricing bio")
        .lean();
      const expertUser = await UserModel.findById(booking.expertUser)
        .select("fullName username profilePhotoId mediaId")
        .lean();

      let expertPhoto = null;
      if (expertUser) {
        try {
          const mediaData = await (expertUser as any).getProfileMedia?.();
          expertPhoto = mediaData?.photo || null;
        } catch {
          // getProfileMedia is an instance method, need to load full user
          const fullUser = await UserModel.findById(booking.expertUser);
          if (fullUser) {
            const media = await fullUser.getProfileMedia();
            expertPhoto = media?.photo || null;
          }
        }
      }

      // Spread expertDoc first so expertUser._id (the User ID) wins.
      // expertDoc._id is the Expert document ID which must NOT overwrite.
      result.expert = {
        ...(expertDoc || {}),
        ...(expertUser || {}),
        profilePhoto: expertPhoto,
      };

      // User's own photos for try-on selection
      const currentUser = await UserModel.findById(userId);
      if (currentUser) {
        const myAllMedia = await currentUser.getAllMedia();
        result.myPhotos = myAllMedia?.photos || [];
      }
    } else {
      // Expert sees client info + style profile (always)
      const clientUser = await UserModel.findById(booking.user);
      if (!clientUser) throw new ApiError(404, "Client not found");

      const media = await clientUser.getProfileMedia();
      const allMedia = await clientUser.getAllMedia();

      result.client = {
        _id: clientUser._id,
        fullName: clientUser.fullName,
        username: clientUser.username,
        profilePhotoId: clientUser.profilePhotoId,
        gender: clientUser.gender,
        age: clientUser.age,
        city: clientUser.city,
        country: clientUser.country,
        profilePhoto: media?.photo || null,
        allPhotos: allMedia?.photos || [],
      };

      // Style profile — always visible to expert
      const styleProfile = await StyleProfileModel.findOne({
        user: booking.user,
      }).lean();
      result.styleProfile = styleProfile || null;

      // Closet summary (always show counts, even without closet permission)
      const closetCounts = await ClothingItemModel.aggregate([
        {
          $match: {
            user: new Types.ObjectId(booking.user.toString()),
            isArchived: { $ne: true },
          },
        },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]);

      const byType: Record<string, number> = {};
      let totalItems = 0;
      for (const c of closetCounts) {
        byType[c._id] = c.count;
        totalItems += c.count;
      }
      result.closetSummary = { totalItems, byType };
    }

    return res.status(200).json(successResponse(result));
  }

  /**
   * PATCH /bookings/:id/permissions
   * Toggle permission flags (user only).
   */
  private static async _togglePermissions(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const { booking, permission, role } = await assertActiveSession(
      id,
      userId.toString()
    );

    if (role !== "user") {
      throw new ApiError(403, "Only the client can change permissions");
    }

    // Permissions can only be toggled during the live session (not during grace period)
    const tz = booking.timezone || "Asia/Kolkata";
    const dateStr = moment(booking.date).tz(tz).format("YYYY-MM-DD");
    const sessionEnd = moment.tz(
      `${dateStr} ${booking.endTime}`,
      "YYYY-MM-DD HH:mm",
      tz
    );
    if (moment().isAfter(sessionEnd)) {
      throw new ApiError(403, "Session has ended. Permissions can no longer be changed.");
    }

    const { closet, outfits } = req.body;

    if (typeof closet === "boolean") {
      permission.permissions.closet = closet;
    }
    if (typeof outfits === "boolean") {
      permission.permissions.outfits = outfits;
    }

    permission.markModified("permissions");
    await permission.save();

    return res.status(200).json(
      successResponse({
        permissions: permission.permissions,
      }, "Permissions updated")
    );
  }

  /**
   * GET /bookings/:id/client-closet
   * Expert fetches client's closet items (requires closet permission).
   */
  private static async _getClientCloset(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const { booking, role } = await assertActiveSession(
      id,
      userId.toString(),
      "closet"
    );

    if (role !== "expert") {
      throw new ApiError(403, "Only the expert can access client closet");
    }

    // Build filter
    const filter: any = { user: booking.user, isArchived: { $ne: true } };
    if (req.query.type && req.query.type !== "All") {
      filter.type = req.query.type;
    }

    const items = await ClothingItemModel.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(successResponse({ items }));
  }

  /**
   * POST /bookings/:id/client-closet
   * Expert adds an item to client's closet (requires closet permission).
   */
  private static async _addClientClosetItem(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const { booking, role } = await assertActiveSession(
      id,
      userId.toString(),
      "closet"
    );

    if (role !== "expert") {
      throw new ApiError(403, "Only the expert can add items to client closet");
    }

    const {
      type, subcategory, photoUrl, thumbnailUrl, color, pattern,
      fabric, brand, season, occasions, notes, price,
    } = req.body;

    if (!type || !subcategory || !photoUrl) {
      throw new ApiError(400, "type, subcategory, and photoUrl are required");
    }

    const item = await ClothingItemModel.create({
      user: booking.user, // Client's ID
      type,
      subcategory,
      photoUrl,
      thumbnailUrl,
      color,
      pattern,
      fabric,
      brand,
      season: season || "All",
      occasions: occasions || [],
      notes,
      price,
      isArchived: false,
      addedBy: userId, // Track who added it
    });

    return res.status(201).json(
      successResponse({ item }, "Item added to client's closet")
    );
  }

  /**
   * PUT /bookings/:id/client-closet/:itemId
   * Expert edits a client's closet item (requires closet permission).
   * Cannot delete — only update fields.
   */
  private static async _editClientClosetItem(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id, itemId } = req.params;
    const { booking, role } = await assertActiveSession(
      id,
      userId.toString(),
      "closet"
    );

    if (role !== "expert") {
      throw new ApiError(403, "Only the expert can edit client closet items");
    }

    // Verify item belongs to the client
    const item = await ClothingItemModel.findById(itemId);
    if (!item) throw new ApiError(404, "Clothing item not found");
    if (item.user.toString() !== booking.user.toString()) {
      throw new ApiError(403, "Item does not belong to this client");
    }

    // Allowed update fields (no deletion of the item itself)
    const allowedFields = [
      "type", "subcategory", "color", "pattern", "fabric",
      "brand", "season", "occasions", "notes", "price",
    ];
    const updates: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Audit trail
    updates.lastEditedBy = userId;
    updates.lastEditedAt = new Date();

    const updatedItem = await ClothingItemModel.findByIdAndUpdate(
      itemId,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    return res.status(200).json(
      successResponse({ item: updatedItem }, "Item updated")
    );
  }

  /**
   * POST /bookings/:id/client-outfits
   * Expert creates an outfit from client's closet items (requires outfits permission).
   */
  private static async _createClientOutfit(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const { booking, role } = await assertActiveSession(
      id,
      userId.toString(),
      "outfits"
    );

    if (role !== "expert") {
      throw new ApiError(403, "Only the expert can create outfits for the client");
    }

    const { itemIds, name, occasion, season, tags, notes } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length < 2) {
      throw new ApiError(400, "An outfit needs at least 2 items");
    }

    // Validate items exist and belong to the client
    const items = await ClothingItemModel.find({
      _id: { $in: itemIds },
      user: booking.user,
      isArchived: { $ne: true },
    }).lean();

    if (items.length !== itemIds.length) {
      throw new ApiError(400, "One or more clothing items not found or not in client's closet");
    }

    // Validate outfit composition: Top+Bottom or Full Body
    const types = new Set(items.map((i: any) => i.type));
    const hasFullBody = types.has("Full Body");
    const hasTop = types.has("Top");
    const hasBottom = types.has("Bottom");

    if (!hasFullBody && !(hasTop && hasBottom)) {
      throw new ApiError(400, "An outfit needs a Top + Bottom, or a Full Body item");
    }

    const outfit = new OutfitModel({
      user: booking.user,
      name: name || "Expert Outfit",
      items: itemIds,
      occasion,
      season,
      tags: tags || [],
      source: "expert",
      notes,
    });

    const saved = await outfit.save();
    const populated = await saved.populate("items");

    return res.status(201).json(
      successResponse({ outfit: populated }, "Outfit created for client")
    );
  }

  /**
   * GET /bookings/:id/client-outfits
   * Expert fetches client's outfits (requires outfits permission).
   */
  private static async _getClientOutfits(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const { booking, role } = await assertActiveSession(
      id,
      userId.toString(),
      "outfits"
    );

    if (role !== "expert") {
      throw new ApiError(403, "Only the expert can access client outfits");
    }

    const outfits = await OutfitModel.find({ user: booking.user })
      .populate("items")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(successResponse({ outfits }));
  }

  /**
   * POST /bookings/:id/share-catalog-item
   * Expert shares a catalog item with the client during an active session.
   */
  private static async _shareCatalogItem(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const { catalogItemId, note } = req.body;

    // Validate active session and expert role
    const { booking, role } = await assertActiveSession(id, userId.toString());
    if (role !== "expert") {
      throw new ApiError(403, "Only the expert can share catalog items");
    }

    // Validate catalog item exists
    const catalogItem = await CatalogItemModel.findOne({
      _id: catalogItemId,
      isDeleted: false,
    }).lean();
    if (!catalogItem) throw new ApiError(404, "Catalog item not found");

    // Prevent duplicates
    const bookingDoc = await BookingModel.findById(id);
    if (!bookingDoc) throw new ApiError(404, "Booking not found");

    const alreadyShared = bookingDoc.sharedCatalogItems?.some(
      (s) => s.catalogItem.toString() === catalogItemId
    );
    if (alreadyShared) {
      throw new ApiError(409, "This item has already been shared with the client");
    }

    // Push shared item
    bookingDoc.sharedCatalogItems.push({
      catalogItem: new Types.ObjectId(catalogItemId),
      sharedAt: new Date(),
      note: note || undefined,
    } as any);
    await bookingDoc.save();

    // Populate the just-added item for response
    const updatedBooking = await BookingModel.findById(id)
      .populate({
        path: "sharedCatalogItems.catalogItem",
        select: "title description images category gender tags clothingType subcategory brand priceRange styleVibe hairType hairLength faceShapes maintenanceLevel lookType skinTones products",
      })
      .lean();
    const sharedItems = updatedBooking?.sharedCatalogItems || [];
    const justShared = sharedItems[sharedItems.length - 1];

    // Socket notification to client user (fire-and-forget)
    try {
      const socketManager = SocketManager.getInstance();
      const clientSocket = await socketManager.getSocketIdUsingUserId(
        booking.user.toString()
      );
      if (clientSocket?.socketId) {
        await socketManager.emitEvent({
          event: "booking:catalog-item-shared",
          data: { bookingId: id, sharedItem: justShared },
          targetSocketIds: [clientSocket.socketId],
        });
      }
    } catch (err) {
      console.error("Socket emit error (non-blocking):", err);
    }

    return res.status(201).json(
      successResponse(
        { sharedItem: justShared, sharedCatalogItems: sharedItems },
        "Item shared with client"
      )
    );
  }

  /**
   * POST /bookings/:id/try-on
   * Request a virtual try-on for a shared catalog item.
   * Both user and expert can trigger during active session.
   * Returns 202 immediately; processing happens in background.
   */
  private static async _requestTryOn(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const { catalogItemId, personPhotoUrls } = req.body;

    // Validate active session (both roles allowed)
    const { booking, role } = await assertActiveSession(id, userId.toString());

    // Validate catalog item exists
    const catalogItem = await CatalogItemModel.findOne({
      _id: catalogItemId,
      isDeleted: false,
    }).lean();
    if (!catalogItem) throw new ApiError(404, "Catalog item not found");

    // Validate item was shared in this booking
    const bookingDoc = await BookingModel.findById(id);
    if (!bookingDoc) throw new ApiError(404, "Booking not found");

    const isShared = bookingDoc.sharedCatalogItems?.some(
      (s) => s.catalogItem.toString() === catalogItemId
    );
    if (!isShared) {
      throw new ApiError(400, "This item has not been shared in this session");
    }

    // Validate style images
    if (!catalogItem.images || catalogItem.images.length < 2) {
      throw new ApiError(400, "Catalog item must have at least 2 images for try-on");
    }
    const styleImages = catalogItem.images.slice(0, 2);

    // Get category-specific prompt
    const prompt = NanoBananaService.getPrompt(
      catalogItem.category as "clothing" | "hair" | "makeup"
    );

    // Create try-on result entry
    const tryOnEntry = {
      catalogItem: new Types.ObjectId(catalogItemId),
      category: catalogItem.category,
      personPhotos: personPhotoUrls,
      styleImages,
      prompt,
      status: "pending" as const,
      requestedBy: new Types.ObjectId(userId.toString()),
      requestedAt: new Date(),
    };

    bookingDoc.tryOnResults = bookingDoc.tryOnResults || [];
    bookingDoc.tryOnResults.push(tryOnEntry as any);
    await bookingDoc.save();

    const newTryOn = bookingDoc.tryOnResults[bookingDoc.tryOnResults.length - 1];
    const tryOnResultId = newTryOn._id!.toString();

    // Image array: [person1, person2, style1, style2]
    const imageUrls = [...personPhotoUrls, ...styleImages];

    // Fire-and-forget background processing
    NanoBananaService.processInBackground(
      id,
      tryOnResultId,
      prompt,
      imageUrls,
      booking.user.toString(),
      booking.expertUser.toString()
    ).catch((err) =>
      console.error("[TryOn] Background processing error:", err)
    );

    // Notify the other party that a try-on was requested
    try {
      const socketManager = SocketManager.getInstance();
      const otherUserId =
        role === "user"
          ? booking.expertUser.toString()
          : booking.user.toString();
      const otherSocket = await socketManager.getSocketIdUsingUserId(otherUserId);
      if (otherSocket?.socketId) {
        await socketManager.emitEvent({
          event: "booking:tryon-requested",
          data: {
            bookingId: id,
            tryOnResultId,
            catalogItemId,
            category: catalogItem.category,
            status: "pending",
            requestedBy: role,
          },
          targetSocketIds: [otherSocket.socketId],
        });
      }
    } catch (err) {
      console.error("[TryOn] Socket notification error (non-blocking):", err);
    }

    return res.status(202).json(
      successResponse(
        {
          tryOnResultId,
          status: "pending",
          message: "Try-on is being generated. You'll be notified when it's ready.",
        },
        "Try-on requested"
      )
    );
  }

  /**
   * POST /bookings/:id/try-on-upload-url
   * Generate a Cloudinary upload URL for try-on person photo.
   */
  private static async _generateTryOnUploadUrl(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const { fileName } = req.body;

    // Validate active session
    await assertActiveSession(id, userId.toString());

    if (!fileName) throw new ApiError(400, "fileName is required");

    const uploadData = await CLOUDINARY_SERVICES.generateUploadUrl(
      fileName,
      `tryon-uploads/${id}`
    );

    return res.status(200).json(
      successResponse({
        provider: "cloudinary",
        ...uploadData,
        apiKey: process.env.CLOUDINARY_API_KEY,
      }, "Upload URL generated")
    );
  }

  // ── Booking Chat ──────────────────────────────────────────────────────────

  /**
   * GET /bookings/:id/chat — Fetch booking chat history.
   */
  private static async _getBookingChat(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const booking = await BookingModel.findById(id).lean();
    if (!booking) throw new ApiError(404, "Booking not found");

    const isBooker = booking.user.toString() === userId.toString();
    const isExpert = booking.expertUser.toString() === userId.toString();
    if (!isBooker && !isExpert) throw new ApiError(403, "Not your booking");

    if (!booking.connectedAt) {
      throw new ApiError(404, "No chat for this booking");
    }

    const chat = await BookingChatModel.findOne({ booking: id }).lean();
    const chatWritable = computeChatWritable(booking);

    return res.status(200).json(
      successResponse({
        messages: chat?.messages || [],
        chatWritable,
      })
    );
  }

  /**
   * POST /bookings/:id/chat — Send a message in booking chat.
   */
  private static async _sendBookingChatMessage(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { id } = req.params;
    const { text } = req.body;

    const booking = await BookingModel.findById(id).lean();
    if (!booking) throw new ApiError(404, "Booking not found");

    const isBooker = booking.user.toString() === userId.toString();
    const isExpert = booking.expertUser.toString() === userId.toString();
    if (!isBooker && !isExpert) throw new ApiError(403, "Not your booking");

    if (!booking.connectedAt) {
      throw new ApiError(400, "Cannot chat before connecting");
    }

    if (!computeChatWritable(booking)) {
      throw new ApiError(403, "Chat is now read-only");
    }

    const message = {
      _id: new Types.ObjectId(),
      sender: new Types.ObjectId(userId.toString()),
      text,
      sentAt: new Date(),
    };

    await BookingChatModel.findOneAndUpdate(
      { booking: id },
      {
        $setOnInsert: {
          booking: new Types.ObjectId(id),
          user: booking.user,
          expert: booking.expertUser,
        },
        $push: { messages: message },
      },
      { upsert: true, new: true }
    );

    // Real-time socket delivery to the other party
    try {
      const socketManager = SocketManager.getInstance();
      const otherUserId = isBooker
        ? booking.expertUser.toString()
        : booking.user.toString();
      const otherSocket = await socketManager.getSocketIdUsingUserId(otherUserId);
      if (otherSocket?.socketId) {
        await socketManager.emitEvent({
          event: "booking:chat-message",
          data: {
            bookingId: id,
            message: {
              _id: message._id,
              sender: userId.toString(),
              text: message.text,
              sentAt: message.sentAt,
            },
          },
          targetSocketIds: [otherSocket.socketId],
        });
      }
    } catch (err) {
      console.error("[BookingChat] Socket emit error (non-blocking):", err);
    }

    return res.status(201).json(
      successResponse({
        message: {
          _id: message._id,
          sender: userId.toString(),
          text: message.text,
          sentAt: message.sentAt,
        },
      }, "Message sent")
    );
  }

  // ── Wrapped public methods ──
  static getBookingDetail = AsyncHandler.wrap(SessionPermissionController._getBookingDetail);
  static togglePermissions = AsyncHandler.wrap(SessionPermissionController._togglePermissions);
  static getClientCloset = AsyncHandler.wrap(SessionPermissionController._getClientCloset);
  static addClientClosetItem = AsyncHandler.wrap(SessionPermissionController._addClientClosetItem);
  static editClientClosetItem = AsyncHandler.wrap(SessionPermissionController._editClientClosetItem);
  static getClientOutfits = AsyncHandler.wrap(SessionPermissionController._getClientOutfits);
  static createClientOutfit = AsyncHandler.wrap(SessionPermissionController._createClientOutfit);
  static shareCatalogItem = AsyncHandler.wrap(SessionPermissionController._shareCatalogItem);
  static requestTryOn = AsyncHandler.wrap(SessionPermissionController._requestTryOn);
  static generateTryOnUploadUrl = AsyncHandler.wrap(SessionPermissionController._generateTryOnUploadUrl);
  static getBookingChat = AsyncHandler.wrap(SessionPermissionController._getBookingChat);
  static sendBookingChatMessage = AsyncHandler.wrap(SessionPermissionController._sendBookingChatMessage);
}

export default SessionPermissionController;
