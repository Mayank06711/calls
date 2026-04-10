import { Request, Response } from "express";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { CatalogItemModel } from "../models/catalogItemModel";
import { ExpertModel } from "../models/expertModel";
import { UserModel } from "../models/userModel";

class CatalogItemController {
  /**
   * GET /item-catalog
   * List catalog items with filters and pagination.
   */
  private static async _listItems(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await UserModel.findById(userId).select("isExpert").lean();
    if (!user?.isExpert) throw new ApiError(403, "Only experts can access the catalog");

    const {
      category,
      gender,
      clothingType,
      season,
      hairType,
      hairLength,
      lookType,
      search,
      page = "1",
      limit = "20",
    } = req.query;

    const filter: any = { isDeleted: false };
    if (category) filter.category = category;
    if (gender) filter.gender = gender;
    if (clothingType) filter.clothingType = clothingType;
    if (season) filter.season = season;
    if (hairType) filter.hairType = hairType;
    if (hairLength) filter.hairLength = hairLength;
    if (lookType) filter.lookType = lookType;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    let sortOption: any = { createdAt: -1 };

    // Text search
    if (search && (search as string).trim()) {
      filter.$text = { $search: search as string };
      sortOption = { score: { $meta: "textScore" }, createdAt: -1 };
    }

    const [items, total] = await Promise.all([
      CatalogItemModel.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: "expert",
          select: "user",
          populate: { path: "user", select: "fullName username" },
        })
        .lean(),
      CatalogItemModel.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      })
    );
  }

  /**
   * GET /item-catalog/:id
   * Get single catalog item with full details.
   */
  private static async _getItem(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await UserModel.findById(userId).select("isExpert").lean();
    if (!user?.isExpert) throw new ApiError(403, "Only experts can access the catalog");

    const item = await CatalogItemModel.findOne({ _id: req.params.id, isDeleted: false })
      .populate({
        path: "expert",
        select: "user specializations",
        populate: { path: "user", select: "fullName username" },
      })
      .lean();

    if (!item) throw new ApiError(404, "Catalog item not found");

    return res.status(200).json(successResponse({ item }));
  }

  /**
   * POST /item-catalog
   * Create a new catalog item.
   */
  private static async _createItem(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const expert = await ExpertModel.findOne({ user: userId }).lean();
    if (!expert) throw new ApiError(403, "Only experts can create catalog items");

    const item = await CatalogItemModel.create({
      ...req.body,
      expert: expert._id,
    });

    const populated = await CatalogItemModel.findById(item._id)
      .populate({
        path: "expert",
        select: "user specializations",
        populate: { path: "user", select: "fullName username" },
      })
      .lean();

    return res.status(201).json(successResponse({ item: populated }, "Catalog item created"));
  }

  /**
   * PUT /item-catalog/:id
   * Update a catalog item (creator only, category not changeable).
   */
  private static async _updateItem(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const expert = await ExpertModel.findOne({ user: userId }).lean();
    if (!expert) throw new ApiError(403, "Only experts can update catalog items");

    const item = await CatalogItemModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!item) throw new ApiError(404, "Catalog item not found");

    if (item.expert.toString() !== expert._id.toString()) {
      throw new ApiError(403, "Only the creator can edit this item");
    }

    // Apply updates (category excluded by Zod schema)
    Object.assign(item, req.body);
    await item.save();

    const populated = await CatalogItemModel.findById(item._id)
      .populate({
        path: "expert",
        select: "user specializations",
        populate: { path: "user", select: "fullName username" },
      })
      .lean();

    return res.status(200).json(successResponse({ item: populated }, "Catalog item updated"));
  }

  /**
   * DELETE /item-catalog/:id
   * Soft delete a catalog item (creator only).
   */
  private static async _deleteItem(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const expert = await ExpertModel.findOne({ user: userId }).lean();
    if (!expert) throw new ApiError(403, "Only experts can delete catalog items");

    const item = await CatalogItemModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!item) throw new ApiError(404, "Catalog item not found");

    if (item.expert.toString() !== expert._id.toString()) {
      throw new ApiError(403, "Only the creator can delete this item");
    }

    item.isDeleted = true;
    await item.save();

    return res.status(200).json(successResponse({}, "Catalog item deleted"));
  }

  /**
   * POST /item-catalog/:id/suggestions
   * Add a suggestion to a catalog item (any expert except the creator).
   */
  private static async _addSuggestion(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const expert = await ExpertModel.findOne({ user: userId }).lean();
    if (!expert) throw new ApiError(403, "Only experts can add suggestions");

    const item = await CatalogItemModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!item) throw new ApiError(404, "Catalog item not found");

    if (item.expert.toString() === expert._id.toString()) {
      throw new ApiError(400, "You cannot add suggestions to your own item");
    }

    const user = await UserModel.findById(userId).select("fullName").lean();

    item.suggestions.push({
      expert: expert._id,
      expertName: user?.fullName || "Expert",
      text: req.body.text,
      createdAt: new Date(),
    } as any);

    await item.save();

    return res.status(201).json(
      successResponse({ suggestions: item.suggestions }, "Suggestion added")
    );
  }

  // ── Wrapped public methods ──
  static listItems = AsyncHandler.wrap(CatalogItemController._listItems);
  static getItem = AsyncHandler.wrap(CatalogItemController._getItem);
  static createItem = AsyncHandler.wrap(CatalogItemController._createItem);
  static updateItem = AsyncHandler.wrap(CatalogItemController._updateItem);
  static deleteItem = AsyncHandler.wrap(CatalogItemController._deleteItem);
  static addSuggestion = AsyncHandler.wrap(CatalogItemController._addSuggestion);
}

export default CatalogItemController;
