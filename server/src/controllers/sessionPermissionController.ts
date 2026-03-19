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

// ─── Helpers ────────────────────────────────────────────────────────────────

const GRACE_MINUTES = 5;

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
    const booking = await BookingModel.findById(id).lean();
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

    // For non-active sessions, force permissions off
    const effectivePermissions = sessionActive
      ? permission.permissions
      : { closet: false, outfits: false };

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
      },
      permissions: effectivePermissions,
      sessionActive,
      role,
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

      result.expert = {
        ...(expertUser || {}),
        ...(expertDoc || {}),
        profilePhoto: expertPhoto,
      };
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

  // ── Wrapped public methods ──
  static getBookingDetail = AsyncHandler.wrap(SessionPermissionController._getBookingDetail);
  static togglePermissions = AsyncHandler.wrap(SessionPermissionController._togglePermissions);
  static getClientCloset = AsyncHandler.wrap(SessionPermissionController._getClientCloset);
  static addClientClosetItem = AsyncHandler.wrap(SessionPermissionController._addClientClosetItem);
  static editClientClosetItem = AsyncHandler.wrap(SessionPermissionController._editClientClosetItem);
  static getClientOutfits = AsyncHandler.wrap(SessionPermissionController._getClientOutfits);
  static createClientOutfit = AsyncHandler.wrap(SessionPermissionController._createClientOutfit);
}

export default SessionPermissionController;
