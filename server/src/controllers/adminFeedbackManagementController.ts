import express from "express";
import ExpertFeedback from "../models/expertFeedbackModel";
import BugFeedback from "../models/bugFeedbackModel";
import Admin from "../models/adminModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";

class AdminFeedbackManagementController {
  /**
   * GET /bug-reports — List bug reports with filters + pagination.
   */
  private static async _listBugReports(
    req: express.Request,
    res: express.Response
  ) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.severity) filter.severity = req.query.severity;
    if (req.query.bugType) filter.bugType = req.query.bugType;
    if (req.query.search) {
      filter.message = { $regex: req.query.search, $options: "i" };
    }
    // Filter by user presence: "yes" = has userId, "no" = anonymous
    if (req.query.hasUser === "yes") filter.user = { $ne: null };
    if (req.query.hasUser === "no") filter.user = null;

    const [feedback, total] = await Promise.all([
      BugFeedback.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName username email profilePhoto")
        .lean(),
      BugFeedback.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({ feedback, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * GET /expert-reviews — List expert feedback with filters.
   */
  private static async _listExpertReviews(
    req: express.Request,
    res: express.Response
  ) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.expertId) filter.expert = req.query.expertId;
    if (req.query.minStars) filter.stars = { ...filter.stars, $gte: parseInt(req.query.minStars as string) };
    if (req.query.maxStars) filter.stars = { ...filter.stars, $lte: parseInt(req.query.maxStars as string) };

    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from as string);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to as string);
    }

    const [reviews, total] = await Promise.all([
      ExpertFeedback.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName username profilePhoto")
        .populate("expert", "fullName username profilePhoto")
        .lean(),
      ExpertFeedback.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({ reviews, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * GET /expert-reviews/stats — Expert feedback analytics.
   */
  private static async _getExpertReviewStats(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canViewAnalytics")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const [avgByExpert, ratingDistribution, totalStats] = await Promise.all([
      ExpertFeedback.aggregate([
        {
          $group: {
            _id: "$expert",
            avgRating: { $avg: "$stars" },
            totalReviews: { $sum: 1 },
          },
        },
        { $sort: { avgRating: -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "expertInfo",
          },
        },
        { $unwind: { path: "$expertInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            expertId: "$_id",
            expertName: "$expertInfo.fullName",
            avgRating: { $round: ["$avgRating", 1] },
            totalReviews: 1,
            _id: 0,
          },
        },
      ]),
      ExpertFeedback.aggregate([
        { $group: { _id: "$stars", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { stars: "$_id", count: 1, _id: 0 } },
      ]),
      ExpertFeedback.aggregate([
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$stars" },
            totalReviews: { $sum: 1 },
          },
        },
      ]),
    ]);

    return res.status(200).json(
      successResponse({
        avgByExpert,
        ratingDistribution,
        overallAvgRating: totalStats[0]?.avgRating || 0,
        totalReviews: totalStats[0]?.totalReviews || 0,
      })
    );
  }

  /**
   * GET /bug-reports/:bugId — Single bug report detail.
   */
  private static async _getBugDetail(
    req: express.Request,
    res: express.Response
  ) {
    const bug = await BugFeedback.findById(req.params.bugId)
      .populate("user", "fullName username email profilePhoto phoneNumber")
      .populate("assignedTo", "fullName username email")
      .lean();

    if (!bug) throw new ApiError(404, "Bug report not found");

    return res.status(200).json(successResponse(bug));
  }

  /**
   * DELETE /expert-reviews/:feedbackId — Delete a review.
   */
  private static async _deleteExpertReview(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canManageContent")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const review = await ExpertFeedback.findByIdAndDelete(req.params.feedbackId);
    if (!review) throw new ApiError(404, "Review not found");

    return res.status(200).json(
      successResponse({ feedbackId: req.params.feedbackId }, "Review deleted")
    );
  }

  // Public wrappers
  static listBugReports = AsyncHandler.wrap(AdminFeedbackManagementController._listBugReports);
  static getBugDetail = AsyncHandler.wrap(AdminFeedbackManagementController._getBugDetail);
  static listExpertReviews = AsyncHandler.wrap(AdminFeedbackManagementController._listExpertReviews);
  static getExpertReviewStats = AsyncHandler.wrap(AdminFeedbackManagementController._getExpertReviewStats);
  static deleteExpertReview = AsyncHandler.wrap(AdminFeedbackManagementController._deleteExpertReview);
}

export default AdminFeedbackManagementController;
