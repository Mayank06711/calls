import express from "express";
import { ClothingItemModel } from "../models/clothModel";
import { OutfitModel } from "../models/outfitModel";
import { StyleProfileModel } from "../models/styleProfileModel";
import { WearLogModel } from "../models/wearLogModel";
import { StyleDnaModel } from "../models/styleDnaModel";
import { UserModel } from "../models/userModel";
import Admin from "../models/adminModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";

class AdminWardrobeAnalyticsController {
  /**
   * GET /stats — Global wardrobe statistics.
   */
  private static async _getStats(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canViewAnalytics")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const [
      totalItems,
      totalOutfits,
      totalStyleProfiles,
      totalWearLogs,
      itemsByType,
      usersWithItems,
    ] = await Promise.all([
      ClothingItemModel.countDocuments(),
      OutfitModel.countDocuments(),
      StyleProfileModel.countDocuments(),
      WearLogModel.countDocuments(),
      ClothingItemModel.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { type: "$_id", count: 1, _id: 0 } },
      ]),
      ClothingItemModel.distinct("user").then((ids) => ids.length),
    ]);

    const totalUsers = await UserModel.countDocuments();
    const avgItemsPerUser = usersWithItems > 0 ? Math.round(totalItems / usersWithItems) : 0;

    return res.status(200).json(
      successResponse({
        totalItems,
        totalOutfits,
        totalStyleProfiles,
        totalWearLogs,
        itemsByType,
        usersWithItems,
        avgItemsPerUser,
        totalUsers,
      })
    );
  }

  /**
   * GET /trends — Fashion trends analytics.
   */
  private static async _getTrends(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canViewAnalytics")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const [topColors, topBrands, topSubcategories, bySeason, byOccasion] =
      await Promise.all([
        ClothingItemModel.aggregate([
          { $match: { color: { $exists: true, $ne: null } } },
          { $group: { _id: "$color", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 15 },
          { $project: { color: "$_id", count: 1, _id: 0 } },
        ]),
        ClothingItemModel.aggregate([
          { $match: { brand: { $exists: true, $nin: [null, ""] } } },
          { $group: { _id: "$brand", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 15 },
          { $project: { brand: "$_id", count: 1, _id: 0 } },
        ]),
        ClothingItemModel.aggregate([
          { $match: { subcategory: { $exists: true, $ne: null } } },
          { $group: { _id: "$subcategory", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 15 },
          { $project: { subcategory: "$_id", count: 1, _id: 0 } },
        ]),
        ClothingItemModel.aggregate([
          { $match: { season: { $exists: true, $ne: null } } },
          { $group: { _id: "$season", count: { $sum: 1 } } },
          { $project: { season: "$_id", count: 1, _id: 0 } },
        ]),
        ClothingItemModel.aggregate([
          { $unwind: "$occasions" },
          { $group: { _id: "$occasions", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { occasion: "$_id", count: 1, _id: 0 } },
        ]),
      ]);

    return res.status(200).json(
      successResponse({ topColors, topBrands, topSubcategories, bySeason, byOccasion })
    );
  }

  /**
   * GET /ai-usage — AI feature usage stats.
   */
  private static async _getAIUsage(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canViewAnalytics")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const [
      styleDnaCount,
      processedItems,
      outfitsBySource,
      flatlayOutfits,
    ] = await Promise.all([
      StyleDnaModel.countDocuments(),
      ClothingItemModel.countDocuments({ processingStatus: "completed" }),
      OutfitModel.aggregate([
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $project: { source: "$_id", count: 1, _id: 0 } },
      ]),
      OutfitModel.countDocuments({ flatlayUrl: { $exists: true, $ne: null } }),
    ]);

    return res.status(200).json(
      successResponse({
        styleDnaAnalyses: styleDnaCount,
        processedItems,
        outfitsBySource,
        flatlayGenerations: flatlayOutfits,
      })
    );
  }

  /**
   * GET /user/:userId — Wardrobe summary for a specific user.
   */
  private static async _getUserWardrobe(
    req: express.Request,
    res: express.Response
  ) {
    const { userId } = req.params;

    const [
      itemsByType,
      totalItems,
      totalOutfits,
      hasStyleProfile,
      wearLogCount,
    ] = await Promise.all([
      ClothingItemModel.aggregate([
        { $match: { user: userId as any } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $project: { type: "$_id", count: 1, _id: 0 } },
      ]),
      ClothingItemModel.countDocuments({ user: userId }),
      OutfitModel.countDocuments({ user: userId }),
      StyleProfileModel.exists({ user: userId }),
      WearLogModel.countDocuments({ user: userId }),
    ]);

    return res.status(200).json(
      successResponse({
        totalItems,
        totalOutfits,
        itemsByType,
        hasStyleProfile: !!hasStyleProfile,
        wearLogCount,
      })
    );
  }

  // Public wrappers
  static getStats = AsyncHandler.wrap(AdminWardrobeAnalyticsController._getStats);
  static getTrends = AsyncHandler.wrap(AdminWardrobeAnalyticsController._getTrends);
  static getAIUsage = AsyncHandler.wrap(AdminWardrobeAnalyticsController._getAIUsage);
  static getUserWardrobe = AsyncHandler.wrap(AdminWardrobeAnalyticsController._getUserWardrobe);
}

export default AdminWardrobeAnalyticsController;
