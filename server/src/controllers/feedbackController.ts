import { Request, Response } from "express";
import { UserModel } from "../models/userModel";
import { ExpertModel } from "../models/expertModel";
import BugFeedback from "../models/bugFeedbackModel";
import ExpertFeedback from "../models/expertFeedbackModel";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import { Types } from "mongoose";
import { ExpertFeedbackHistoryModel } from "../models/expertFeedbackHistoryModel";
import { ExpertTipModel } from "../models/expertTipModel";
import { ExpertComplaintModel } from "../models/expertComplaintModel";

class FeedbackController {
  // Submit Bug Feedback - Anyone can submit (user, expert, or anonymous)
  static async submitBugFeedback(req: Request, res: Response) {
    try {
      const {
        // Core fields
        userId, // Optional - if user is logged in
        email, // Optional - for anonymous feedback
        message,
        bugType,
        customBugType,
        severity = "Medium",

        // System information (optional)
        browserInfo,
        osInfo,
        screenResolution,
        appVersion,

        // Location data (optional)
        location,

        // Attachments (optional)
        attachmentUrls,

        // Steps to reproduce (optional)
        stepsToReproduce,
      } = req.body;

      // Validate required fields
      if (!message || message.trim().length < 10) {
        throw new ApiError(400, "Message must be at least 10 characters long");
      }

      if (!bugType) {
        throw new ApiError(400, "Bug type is required");
      }

      // Validate bug type
      const validBugTypes = [
        "UI Issue",
        "Crash",
        "Performance",
        "Suggestion",
        "Security",
        "Functionality",
        "Other",
      ];
      if (!validBugTypes.includes(bugType)) {
        throw new ApiError(400, "Invalid bug type");
      }

      // If bugType is "Other", customBugType is required
      if (bugType === "Other" && !customBugType) {
        throw new ApiError(
          400,
          "Custom bug type is required when bug type is 'Other'"
        );
      }

      // Validate severity
      const validSeverities = ["Critical", "High", "Medium", "Low"];
      if (!validSeverities.includes(severity)) {
        throw new ApiError(400, "Invalid severity level");
      }

      // Validate email format if provided
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        throw new ApiError(400, "Please provide a valid email address");
      }

      // Create bug feedback
      const bugFeedback = await BugFeedback.create({
        user: userId || undefined,
        email: email || undefined,
        message: message.trim(),
        bugType,
        customBugType: bugType === "Other" ? customBugType : undefined,
        severity,
        browserInfo,
        osInfo,
        screenResolution,
        appVersion,
        location,
        attachmentUrls,
        stepsToReproduce,
        status: "New",
      });

      return res.status(201).json({
        success: true,
        message: "Bug feedback submitted successfully",
        data: {
          id: bugFeedback._id,
          message: bugFeedback.message,
          bugType: bugFeedback.bugType,
          severity: bugFeedback.severity,
          status: bugFeedback.status,
          createdAt: bugFeedback.createdAt,
        },
      });
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.statusCode || 500, error.message);
    }
  }

  // Submit Expert Feedback - Only logged-in users can submit
  static async submitExpertFeedback(req: Request, res: Response) {
    try {
      const {
        userId,
        expertId,
        message,
        stars,
        aspects,
        sessionId,
        sessionDuration,
        attachmentUrl,
      } = req.body;

      // Validate required fields
      if (!userId) {
        throw new ApiError(400, "User ID is required");
      }

      if (!expertId) {
        throw new ApiError(400, "Expert ID is required");
      }

      if (!message || message.replace(/\s/g, "").length < 10) {
        throw new ApiError(400, "Message must be at least 10 non-space characters");
      }

      if (!stars || stars < 1 || stars > 5) {
        throw new ApiError(400, "Stars must be between 1 and 5");
      }

      // Validate user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Validate expert exists
      const expert = await ExpertModel.findOne({ user: expertId });
      if (!expert) {
        throw new ApiError(404, "Expert not found");
      }

      // Cooldown: can only rate/update once per 24 hours per expert
      const existingRating = await ExpertFeedback.findOne({ user: userId, expert: expertId }).lean();
      if (existingRating && existingRating.updatedAt) {
        const hoursSinceLastUpdate = (Date.now() - new Date(existingRating.updatedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastUpdate < 24) {
          const hoursRemaining = Math.ceil(24 - hoursSinceLastUpdate);
          throw new ApiError(429, `You can update your rating in ${hoursRemaining} hour(s)`);
        }
      }

      // Upsert: update existing rating or create new one (1 rating per user per expert)
      const expertFeedback = await ExpertFeedback.findOneAndUpdate(
        { user: userId, expert: expertId },
        {
          $set: {
            message: message.trim(),
            stars,
            aspects: aspects || [],
            sessionId: sessionId || undefined,
            sessionDuration: sessionDuration || undefined,
            attachmentUrl: attachmentUrl || undefined,
            verified: false,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const isUpdate = expertFeedback.createdAt?.toISOString() !== expertFeedback.updatedAt?.toISOString();

      // Log to rating history for admin audit trail
      await ExpertFeedbackHistoryModel.create({
        user: userId,
        expert: expertId,
        stars,
        aspects: aspects || [],
        message: message.trim(),
        feedbackId: expertFeedback._id,
        action: isUpdate ? "updated" : "created",
      });

      return res.status(isUpdate ? 200 : 201).json({
        success: true,
        message: isUpdate ? "Rating updated successfully" : "Rating submitted successfully",
        data: {
          id: expertFeedback._id,
          message: expertFeedback.message,
          expertId,
          stars,
          aspects: expertFeedback.aspects,
          createdAt: expertFeedback.createdAt,
        },
      });
    } catch (error: any) {
      const statusCode = error instanceof ApiError ? error.statusCode : (error.statusCode || 500);
      const message = error.message || "Internal server error";
      return res.status(statusCode).json({
        success: false,
        message,
      });
    }
  }

  // Submit General Feedback - Anyone can submit
  static async submitGeneralFeedback(req: Request, res: Response) {
    try {
      const {
        userId,
        email,
        message,
        feedbackType = "General",
        attachmentUrls,
      } = req.body;

      // Validate required fields
      if (!message || message.trim().length < 10) {
        throw new ApiError(400, "Message must be at least 10 characters long");
      }

      // Either user ID or email must be provided
      if (!userId && !email) {
        throw new ApiError(400, "Either user ID or email must be provided");
      }

      // Validate email format if provided
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        throw new ApiError(400, "Please provide a valid email address");
      }

      // If userId is provided, validate user exists
      if (userId) {
        const user = await UserModel.findById(userId);
        if (!user) {
          throw new ApiError(404, "User not found");
        }
      }

      // Create general feedback
      const generalFeedback = await BugFeedback.create({
        user: userId || undefined,
        email: email || undefined,
        message: message.trim(),
        bugType: "Suggestion", // Default to suggestion for general feedback
        severity: "Low",
        attachmentUrls,
        status: "New",
      });

      return res.status(201).json({
        success: true,
        message: "General feedback submitted successfully",
        data: {
          id: generalFeedback._id,
          message: generalFeedback.message,
          feedbackType,
          createdAt: generalFeedback.createdAt,
        },
      });
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.statusCode || 500, error.message);
    }
  }

  // Get All Feedback with filters and pagination
  static async getAllFeedback(req: Request, res: Response) {
    try {
      const {
        bugType,
        severity,
        status,
        userId,
        email,
        startDate,
        endDate,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Build query
      const query: any = {};
      if (bugType) query.bugType = bugType;
      if (severity) query.severity = severity;
      if (status) query.status = status;
      if (userId) query.user = userId;
      if (email) query.email = email;

      // Date range
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate as string);
        if (endDate) query.createdAt.$lte = new Date(endDate as string);
      }

      // Pagination
      const skip = (Number(page) - 1) * Number(limit);

      // Sort
      const sort: any = {};
      sort[sortBy as string] = sortOrder === "desc" ? -1 : 1;

      const feedbacks = await BugFeedback.find(query)
        .populate("user", "name email")
        .populate("assignedTo", "name email")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit));

      const total = await BugFeedback.countDocuments(query);

      return res.status(200).json({
        success: true,
        data: feedbacks,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
          limit: Number(limit),
        },
      });
    } catch (error: any) {
      throw new ApiError(error.statusCode || 500, error.message);
    }
  }

  // Get Feedback Statistics
  static async getFeedbackStats(req: Request, res: Response) {
    try {
      const stats = await BugFeedback.getBugStats();
      const urgentBugs = await BugFeedback.findUrgentBugs();
      const pendingBugs = await BugFeedback.findPendingBugs();

      return res.status(200).json({
        success: true,
        data: {
          statistics: stats,
          urgentBugsCount: urgentBugs.length,
          pendingBugsCount: pendingBugs.length,
          totalFeedbacks: await BugFeedback.countDocuments(),
        },
      });
    } catch (error: any) {
      throw new ApiError(error.statusCode || 500, error.message);
    }
  }

  // Update Feedback Status/Response (Admin/Developer only)
  static async updateFeedback(req: Request, res: Response) {
    try {
      const { feedbackId } = req.params;
      const { response, status, assignedTo } = req.body;

      const feedback = await BugFeedback.findById(feedbackId);
      if (!feedback) {
        throw new ApiError(404, "Feedback not found");
      }

      // Update fields
      if (response) {
        feedback.response = response;
        feedback.reviewDate = new Date();
      }
      if (status) {
        feedback.status = status;
      }
      if (assignedTo) {
        feedback.assignedTo = assignedTo;
      }

      await feedback.save();

      return res.status(200).json({
        success: true,
        message: "Feedback updated successfully",
        data: feedback,
      });
    } catch (error: any) {
      throw new ApiError(error.statusCode || 500, error.message);
    }
  }

  // Get User's Feedback History
  static async getUserFeedback(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // Validate user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      const skip = (Number(page) - 1) * Number(limit);

      const feedbacks = await BugFeedback.find({ user: userId })
        .populate("assignedTo", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await BugFeedback.countDocuments({ user: userId });

      return res.status(200).json({
        success: true,
        data: feedbacks,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      throw new ApiError(error.statusCode || 500, error.message);
    }
  }

  // Assign Feedback to Developer
  static async assignFeedback(req: Request, res: Response) {
    try {
      const { feedbackId } = req.params;
      const { developerId } = req.body;

      const feedback = await BugFeedback.findById(feedbackId);
      if (!feedback) {
        throw new ApiError(404, "Feedback not found");
      }

      // Validate developer exists
      const developer = await UserModel.findById(developerId);
      if (!developer) {
        throw new ApiError(404, "Developer not found");
      }

      await feedback.assignToDeveloper(developerId);

      return res.status(200).json({
        success: true,
        message: "Feedback assigned to developer successfully",
        data: feedback,
      });
    } catch (error: any) {
      throw new ApiError(error.statusCode || 500, error.message);
    }
  }

  // Mark Feedback as Fixed
  static async markAsFixed(req: Request, res: Response) {
    try {
      const { feedbackId } = req.params;
      const { response } = req.body;

      if (!response) {
        throw new ApiError(400, "Response is required when marking as fixed");
      }

      const feedback = await BugFeedback.findById(feedbackId);
      if (!feedback) {
        throw new ApiError(404, "Feedback not found");
      }

      await feedback.markAsFixed(response);

      return res.status(200).json({
        success: true,
        message: "Feedback marked as fixed successfully",
        data: feedback,
      });
    } catch (error: any) {
      throw new ApiError(error.statusCode || 500, error.message);
    }
  }

  // Delete Feedback (Admin only)
  static async deleteFeedback(req: Request, res: Response) {
    try {
      const { feedbackId } = req.params;

      const feedback = await BugFeedback.findById(feedbackId);
      if (!feedback) {
        throw new ApiError(404, "Feedback not found");
      }

      await feedback.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Feedback deleted successfully",
      });
    } catch (error: any) {
      throw new ApiError(error.statusCode || 500, error.message);
    }
  }

  // Get Feedback Assigned to Developer
  static async getAssignedFeedback(req: Request, res: Response) {
    try {
      const { developerId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // Validate developer exists
      const developer = await UserModel.findById(developerId);
      if (!developer) {
        throw new ApiError(404, "Developer not found");
      }

      const skip = (Number(page) - 1) * Number(limit);

      const feedbacks = await BugFeedback.find({ assignedTo: developerId })
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await BugFeedback.countDocuments({
        assignedTo: developerId,
      });

      return res.status(200).json({
        success: true,
        data: feedbacks,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      throw new ApiError(error.statusCode || 500, error.message);
    }
  }
  // Get aggregated rating for an expert
  static async getExpertRating(req: Request, res: Response) {
    try {
      const { expertId } = req.params;
      if (!expertId) throw new ApiError(400, "Expert ID is required");

      const rating = await ExpertFeedback.getExpertRating(new Types.ObjectId(expertId));
      return res.status(200).json({
        success: true,
        data: rating,
      });
    } catch (error: any) {
      const statusCode = error instanceof ApiError ? error.statusCode : (error.statusCode || 500);
      return res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  /**
   * Get aggregated expert profile stats for the popup.
   * Public data + user-specific data (if authenticated).
   */
  static async getExpertProfileStats(req: Request, res: Response) {
    try {
      const { expertId } = req.params;
      if (!expertId) throw new ApiError(400, "Expert ID is required");

      const expertObjId = new Types.ObjectId(expertId);

      // Requesting user (may be null for unauthenticated requests)
      const requestingUserId = req.user?._id;

      // Run all queries in parallel
      const [
        expertUser,
        expertDoc,
        ratingStats,
        currentUserRating,
        tipStats,
        userTips,
        complaintCount,
        recentReviews,
        ratingHistory,
      ] = await Promise.all([
        // Expert user info
        UserModel.findById(expertId)
          .select("fullName username profilePhoto isExpert bio")
          .lean(),
        // Expert qualifications
        ExpertModel.findOne({ user: expertId }).lean(),
        // Rating aggregation
        ExpertFeedback.getExpertRating(expertObjId),
        // Current user's rating for this expert
        requestingUserId
          ? ExpertFeedback.findOne({ user: requestingUserId, expert: expertId })
              .select("stars aspects message updatedAt")
              .lean()
          : null,
        // Tip stats (completed tips only)
        ExpertTipModel.aggregate([
          { $match: { expert: expertObjId, status: "completed" } },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$amount" },
              totalTippers: { $addToSet: "$tipper" },
              tipCount: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              totalAmount: 1,
              tipCount: 1,
              uniqueTippers: { $size: "$totalTippers" },
            },
          },
        ]),
        // User's tips to this expert (completed only)
        requestingUserId
          ? ExpertTipModel.aggregate([
              {
                $match: {
                  tipper: new Types.ObjectId(requestingUserId.toString()),
                  expert: expertObjId,
                  status: "completed",
                },
              },
              {
                $group: {
                  _id: null,
                  totalAmount: { $sum: "$amount" },
                  count: { $sum: 1 },
                },
              },
            ])
          : [],
        // Complaint breakdown by status
        ExpertComplaintModel.aggregate([
          { $match: { expert: expertObjId } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
        // Recent reviews (latest 5)
        ExpertFeedback.find({ expert: expertId })
          .sort({ updatedAt: -1 })
          .limit(5)
          .select("stars aspects message updatedAt user")
          .populate("user", "fullName username profilePhoto")
          .lean(),
        // Rating history for current user (admin audit or self)
        requestingUserId
          ? ExpertFeedbackHistoryModel.find({ user: requestingUserId, expert: expertId })
              .sort({ createdAt: -1 })
              .limit(10)
              .select("stars action createdAt")
              .lean()
          : [],
      ]);

      if (!expertUser) throw new ApiError(404, "Expert not found");

      const tipStatsResult = tipStats[0] || { totalAmount: 0, tipCount: 0, uniqueTippers: 0 };
      const userTipResult = userTips[0] || { totalAmount: 0, count: 0 };

      // Build complaint breakdown from aggregation
      const complaintBreakdown: Record<string, number> = {
        total: 0, new: 0, reviewing: 0, resolved: 0, dismissed: 0,
      };
      for (const entry of complaintCount as any[]) {
        complaintBreakdown[entry._id] = entry.count;
        complaintBreakdown.total += entry.count;
      }

      return res.status(200).json({
        success: true,
        data: {
          expert: {
            _id: expertUser._id,
            fullName: (expertUser as any).fullName,
            username: (expertUser as any).username,
            profilePhoto: (expertUser as any).profilePhoto,
            bio: (expertUser as any).bio,
            qualification: expertDoc?.qualification,
            experienceInYears: expertDoc?.experienceInYears,
            degreeVerified: expertDoc?.degree?.isVerified,
            totalCustomersHandled: expertDoc?.totalCustomersHandled,
          },
          rating: ratingStats,
          currentUserRating: currentUserRating || null,
          tips: {
            totalAmount: tipStatsResult.totalAmount,
            tipCount: tipStatsResult.tipCount,
            uniqueTippers: tipStatsResult.uniqueTippers,
            userTipTotal: userTipResult.totalAmount,
            userTipCount: userTipResult.count,
          },
          complaints: complaintBreakdown,
          recentReviews,
          ratingHistory,
        },
      });
    } catch (error: any) {
      const statusCode = error instanceof ApiError ? error.statusCode : (error.statusCode || 500);
      return res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
}

export default FeedbackController;
