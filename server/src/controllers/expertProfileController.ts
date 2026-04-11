import express from "express";
import { ExpertModel } from "../models/expertModel";
import ExpertFeedbackModel from "../models/expertFeedbackModel";
import { UserModel } from "../models/userModel";
import { MediaModel } from "../models/mediaModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import { RedisManager } from "../utils/redisClient";
import { ExpertAvailabilityModel } from "../models/expertAvailabilityModel";

const CATEGORY_TO_SPECIALIZATIONS: Record<string, string[]> = {
  clothing: ["Personal Styling", "Wardrobe Consulting", "Corporate & Workwear", "Streetwear & Trends"],
  hair: ["Personal Styling", "Color & Image Analysis"],
  makeup: ["Personal Styling", "Color & Image Analysis"],
  wedding: ["Bridal & Wedding", "Occasion & Event Styling", "Ethnic & Traditional"],
  makeover: ["Personal Styling", "Wardrobe Consulting", "Color & Image Analysis"],
};

class ExpertProfileController {
  /**
   * GET /profile — Get current expert's profile.
   */
  private static async _getProfile(
    req: express.Request,
    res: express.Response
  ) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Login required");
    if (!req.user?.isExpert) throw new ApiError(403, "Not an expert");

    const expert = await ExpertModel.findOne({ user: userId })
      .populate("user", "fullName username email profilePhoto phone gender age city")
      .lean();

    if (!expert) {
      throw new ApiError(404, "Expert profile not found");
    }

    return res.status(200).json(successResponse({ expert }));
  }

  /**
   * PUT /profile — Update expert's editable profile fields.
   */
  private static async _updateProfile(
    req: express.Request,
    res: express.Response
  ) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Login required");
    if (!req.user?.isExpert) throw new ApiError(403, "Not an expert");

    const expert = await ExpertModel.findOne({ user: userId });
    if (!expert) throw new ApiError(404, "Expert profile not found");

    const { bio, specializations, portfolioUrls, socialLinks } = req.body;

    if (bio !== undefined) expert.bio = bio;
    if (specializations !== undefined) expert.specializations = specializations;
    if (portfolioUrls !== undefined) expert.portfolioUrls = portfolioUrls;
    if (socialLinks !== undefined) {
      expert.socialLinks = {
        ...expert.socialLinks,
        ...socialLinks,
      };
    }

    await expert.save();

    return res.status(200).json(
      successResponse({ expert }, "Profile updated")
    );
  }

  /**
   * GET /all — Admin: list all experts with pagination.
   */
  private static async _listAllExperts(
    req: express.Request,
    res: express.Response
  ) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const [experts, total] = await Promise.all([
      ExpertModel.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName username email profilePhoto phone isExpert isBlockedByAdmin")
        .lean(),
      ExpertModel.countDocuments(),
    ]);

    return res.status(200).json(
      successResponse({ experts, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * PATCH /:expertId/toggle-status — Admin: activate/deactivate an expert.
   */
  private static async _toggleExpertStatus(
    req: express.Request,
    res: express.Response
  ) {
    const { expertId } = req.params;

    const expert = await ExpertModel.findById(expertId).lean();
    if (!expert) throw new ApiError(404, "Expert not found");

    const user = await UserModel.findById(expert.user);
    if (!user) throw new ApiError(404, "User not found");

    user.isExpert = !user.isExpert;
    await user.save();

    return res.status(200).json(
      successResponse(
        { userId: user._id, isExpert: user.isExpert },
        user.isExpert ? "Expert activated" : "Expert deactivated"
      )
    );
  }

  /**
   * PATCH /:expertId/verify-degree — Admin: mark degree as verified.
   */
  private static async _verifyDegree(
    req: express.Request,
    res: express.Response
  ) {
    const { expertId } = req.params;

    const expert = await ExpertModel.findById(expertId);
    if (!expert) throw new ApiError(404, "Expert not found");

    expert.degree.isVerified = true;
    await expert.save();

    return res.status(200).json(
      successResponse(
        { expertId, degreeVerified: true },
        "Degree marked as verified"
      )
    );
  }

  /**
   * GET /instant?category=clothing — Find an available online expert for the given category.
   */
  private static async _findInstantExpert(
    req: express.Request,
    res: express.Response
  ) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Login required");

    const category = req.query.category as string;
    if (!category || !CATEGORY_TO_SPECIALIZATIONS[category]) {
      throw new ApiError(
        400,
        `Invalid category. Must be one of: ${Object.keys(CATEGORY_TO_SPECIALIZATIONS).join(", ")}`
      );
    }

    const specializations = CATEGORY_TO_SPECIALIZATIONS[category];

    // 1. Find verified experts with matching specializations
    const experts = await ExpertModel.find({
      specializations: { $in: specializations },
      "degree.isVerified": true,
    })
      .populate("user", "_id fullName username isExpert isActive isBlockedByAdmin")
      .lean();

    // 2. Filter active, non-blocked, non-self
    const activeExperts = experts.filter((e: any) => {
      const u = e.user;
      return (
        u &&
        u.isActive !== false &&
        u.isExpert &&
        !u.isBlockedByAdmin &&
        u._id.toString() !== userId.toString()
      );
    });

    // 3. Check online status via Redis
    const onlineExperts: any[] = [];
    for (const expert of activeExperts) {
      const expertUserId = (expert.user as any)._id.toString();
      const sessionIds = await RedisManager.getActiveSessionIds(expertUserId);
      if (sessionIds.length > 0) {
        onlineExperts.push(expert);
      }
    }

    // 4. No experts available
    if (onlineExperts.length === 0) {
      return res.status(200).json(
        successResponse(
          { expert: null },
          "No experts are currently available in this category. Try scheduling an appointment."
        )
      );
    }

    // 5. Random selection
    const selected = onlineExperts[Math.floor(Math.random() * onlineExperts.length)];
    const user = selected.user as any;

    return res.status(200).json(
      successResponse({
        expert: {
          userId: user._id,
          fullName: user.fullName,
          username: user.username,
          specializations: selected.specializations,
          bio: selected.bio,
        },
      })
    );
  }

  /**
   * GET /catalog — Browse verified experts with optional category filter, sorting, pagination.
   */
  private static async _getCatalog(
    req: express.Request,
    res: express.Response
  ) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Login required");

    const category = req.query.category as string | undefined;
    const sort = (req.query.sort as string) || "rating";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    // Build filter
    const filter: any = { "degree.isVerified": true };
    if (category && CATEGORY_TO_SPECIALIZATIONS[category]) {
      filter.specializations = { $in: CATEGORY_TO_SPECIALIZATIONS[category] };
    }

    const experts = await ExpertModel.find(filter)
      .populate("user", "_id fullName username profilePhotoId mediaId isActive isExpert isBlockedByAdmin")
      .lean();

    // Filter active, non-blocked
    const activeExperts = experts.filter((e: any) => {
      const u = e.user;
      return u && u.isActive !== false && u.isExpert && !u.isBlockedByAdmin;
    });

    // Batch-fetch media docs to resolve profile photos
    const mediaIds = activeExperts
      .map((e: any) => e.user.mediaId)
      .filter(Boolean);
    const mediaDocs = mediaIds.length
      ? await MediaModel.find({ _id: { $in: mediaIds } }).lean()
      : [];
    const mediaMap = new Map(mediaDocs.map((m: any) => [m._id.toString(), m]));

    // Helper to resolve profile photo URL
    const resolvePhotoUrl = (user: any) => {
      if (!user.profilePhotoId || !user.mediaId) return null;
      const media = mediaMap.get(user.mediaId.toString());
      if (!media) return null;
      const photo = media.photos?.find((p: any) => p.public_id === user.profilePhotoId);
      return photo?.url || null;
    };

    // Enrich with rating + online status + photo
    const enriched = await Promise.all(
      activeExperts.map(async (expert: any) => {
        const expertUserId = expert.user._id.toString();
        const [rating, sessionIds] = await Promise.all([
          (ExpertFeedbackModel as any).getExpertRating(expert.user._id),
          RedisManager.getActiveSessionIds(expertUserId),
        ]);
        return {
          expertId: expert._id,
          userId: expert.user._id,
          fullName: expert.user.fullName,
          username: expert.user.username,
          profilePhoto: resolvePhotoUrl(expert.user),
          bio: expert.bio || "",
          specializations: expert.specializations || [],
          experienceInYears: expert.experienceInYears,
          totalCustomersHandled: expert.totalCustomersHandled,
          pricing: expert.pricing || { per15Min: 0, per30Min: 0, per60Min: 0, currency: "credits" },
          rating: { averageRating: rating.averageRating, totalRatings: rating.totalRatings },
          isOnline: sessionIds.length > 0,
        };
      })
    );

    // Sort
    switch (sort) {
      case "price_low":
        enriched.sort((a, b) => a.pricing.per30Min - b.pricing.per30Min);
        break;
      case "price_high":
        enriched.sort((a, b) => b.pricing.per30Min - a.pricing.per30Min);
        break;
      case "experience":
        enriched.sort((a, b) => b.experienceInYears - a.experienceInYears);
        break;
      case "rating":
      default:
        enriched.sort((a, b) => b.rating.averageRating - a.rating.averageRating || b.rating.totalRatings - a.rating.totalRatings);
        break;
    }

    // Paginate
    const total = enriched.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = enriched.slice((page - 1) * limit, page * limit);

    return res.status(200).json(
      successResponse({
        experts: paginated,
        pagination: { page, limit, total, totalPages },
      })
    );
  }

  /**
   * GET /catalog/:expertId — Get full expert detail with rating breakdown + reviews.
   */
  private static async _getExpertDetail(
    req: express.Request,
    res: express.Response
  ) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Login required");

    const { expertId } = req.params;

    const expert = await ExpertModel.findById(expertId)
      .populate("user", "_id fullName username profilePhotoId mediaId isActive isExpert isBlockedByAdmin")
      .lean();

    if (!expert) throw new ApiError(404, "Expert not found");

    const user = expert.user as any;
    if (!user || !user.isExpert || user.isBlockedByAdmin) {
      throw new ApiError(404, "Expert not found");
    }

    // Fetch rating breakdown, reviews, online status, and media in parallel
    const [ratingBreakdown, reviews, sessionIds, expertMedia] = await Promise.all([
      (ExpertFeedbackModel as any).getExpertRating(user._id),
      ExpertFeedbackModel.find({ expert: user._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("user", "fullName username profilePhotoId mediaId")
        .lean(),
      RedisManager.getActiveSessionIds(user._id.toString()),
      user.mediaId ? MediaModel.findById(user.mediaId).lean() : null,
    ]);

    // Resolve expert profile photo
    let expertPhotoUrl = null;
    if (expertMedia && user.profilePhotoId) {
      const photo = (expertMedia as any).photos?.find(
        (p: any) => p.public_id === user.profilePhotoId
      );
      expertPhotoUrl = photo?.url || null;
    }

    // Batch-resolve reviewer photos
    const reviewerMediaIds = reviews
      .map((r: any) => r.user?.mediaId)
      .filter(Boolean);
    const reviewerMediaDocs = reviewerMediaIds.length
      ? await MediaModel.find({ _id: { $in: reviewerMediaIds } }).lean()
      : [];
    const reviewerMediaMap = new Map(
      reviewerMediaDocs.map((m: any) => [m._id.toString(), m])
    );

    return res.status(200).json(
      successResponse({
        expert: {
          expertId: expert._id,
          userId: user._id,
          fullName: user.fullName,
          username: user.username,
          profilePhoto: expertPhotoUrl,
          bio: expert.bio || "",
          specializations: expert.specializations || [],
          experienceInYears: expert.experienceInYears,
          totalCustomersHandled: expert.totalCustomersHandled,
          qualification: expert.qualification,
          portfolioUrls: expert.portfolioUrls || [],
          socialLinks: expert.socialLinks || {},
          pricing: expert.pricing || { per15Min: 0, per30Min: 0, per60Min: 0, currency: "credits" },
          isOnline: sessionIds.length > 0,
        },
        ratingBreakdown,
        reviews: reviews.map((r: any) => {
          let reviewerPhoto = null;
          if (r.user?.mediaId && r.user?.profilePhotoId) {
            const media = reviewerMediaMap.get(r.user.mediaId.toString());
            const photo = media?.photos?.find(
              (p: any) => p.public_id === r.user.profilePhotoId
            );
            reviewerPhoto = photo?.url || null;
          }
          return {
            _id: r._id,
            user: {
              fullName: r.user?.fullName || "Anonymous",
              username: r.user?.username || "",
              profilePhoto: reviewerPhoto,
            },
            stars: r.stars,
            message: r.message,
            aspects: r.aspects || [],
            createdAt: r.createdAt,
          };
        }),
      })
    );
  }

  /**
   * PATCH /:expertId/pricing — Admin: update expert pricing (credits per session).
   */
  private static async _updatePricing(
    req: express.Request,
    res: express.Response
  ) {
    const { expertId } = req.params;
    const { per15Min, per30Min, per60Min } = req.body;

    const expert = await ExpertModel.findByIdAndUpdate(
      expertId,
      { pricing: { per15Min, per30Min, per60Min, currency: "credits" } },
      { new: true }
    ).lean();

    if (!expert) throw new ApiError(404, "Expert not found");

    return res.status(200).json(
      successResponse({ expert }, "Pricing updated")
    );
  }

  /**
   * GET /availability/:expertId — Get expert's recurring weekly schedule.
   */
  private static async _getAvailability(
    req: express.Request,
    res: express.Response
  ) {
    const { expertId } = req.params;
    const availability = await ExpertAvailabilityModel.findOne({ expert: expertId }).lean();

    return res.status(200).json(
      successResponse({
        availability: availability || {
          timezone: "Asia/Kolkata",
          weeklySlots: [],
          slotDurations: [15, 30, 60],
          bufferMinutes: 10,
        },
      })
    );
  }

  /**
   * PUT /availability — Expert updates their own recurring schedule.
   */
  private static async _updateAvailability(
    req: express.Request,
    res: express.Response
  ) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Login required");
    if (!req.user?.isExpert) throw new ApiError(403, "Not an expert");

    const expert = await ExpertModel.findOne({ user: userId }).lean();
    if (!expert) throw new ApiError(404, "Expert profile not found");

    const { timezone, weeklySlots, slotDurations, bufferMinutes } = req.body;

    const availability = await ExpertAvailabilityModel.findOneAndUpdate(
      { expert: expert._id },
      { timezone, weeklySlots, slotDurations, bufferMinutes },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json(
      successResponse({ availability }, "Availability updated")
    );
  }

  // Public wrappers
  static getProfile = AsyncHandler.wrap(ExpertProfileController._getProfile);
  static updateProfile = AsyncHandler.wrap(ExpertProfileController._updateProfile);
  static listAllExperts = AsyncHandler.wrap(ExpertProfileController._listAllExperts);
  static toggleExpertStatus = AsyncHandler.wrap(ExpertProfileController._toggleExpertStatus);
  static verifyDegree = AsyncHandler.wrap(ExpertProfileController._verifyDegree);
  static findInstantExpert = AsyncHandler.wrap(ExpertProfileController._findInstantExpert);
  static getCatalog = AsyncHandler.wrap(ExpertProfileController._getCatalog);
  static getExpertDetail = AsyncHandler.wrap(ExpertProfileController._getExpertDetail);
  static updatePricing = AsyncHandler.wrap(ExpertProfileController._updatePricing);
  static getAvailability = AsyncHandler.wrap(ExpertProfileController._getAvailability);
  static updateAvailability = AsyncHandler.wrap(ExpertProfileController._updateAvailability);
}

export default ExpertProfileController;
