import express from "express";
import { ExpertModel } from "../models/expertModel";
import { UserModel } from "../models/userModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";

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

  // Public wrappers
  static getProfile = AsyncHandler.wrap(ExpertProfileController._getProfile);
  static updateProfile = AsyncHandler.wrap(ExpertProfileController._updateProfile);
  static listAllExperts = AsyncHandler.wrap(ExpertProfileController._listAllExperts);
  static toggleExpertStatus = AsyncHandler.wrap(ExpertProfileController._toggleExpertStatus);
  static verifyDegree = AsyncHandler.wrap(ExpertProfileController._verifyDegree);
}

export default ExpertProfileController;
