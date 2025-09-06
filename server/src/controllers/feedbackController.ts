import { Request, Response } from "express";
import { UserModel } from "../models/userModel";
import { ExpertModel } from "../models/expertModel";
import BugFeedback from "../models/bugFeedbackModel";
import { ApiError } from "../utils/apiError";

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

      if (!message || message.trim().length < 10) {
        throw new ApiError(400, "Message must be at least 10 characters long");
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

      // Create expert feedback using BugFeedback model with expert-specific fields
      const expertFeedback = await BugFeedback.create({
        user: userId,
        message: message.trim(),
        bugType: "Expert Feedback", // Custom type for expert feedback
        customBugType: "Expert Rating",
        severity: stars <= 2 ? "High" : stars <= 3 ? "Medium" : "Low",
        stepsToReproduce: `Expert: ${expertId}, Rating: ${stars} stars, Session: ${
          sessionId || "N/A"
        }`,
        status: "New",
      });

      return res.status(201).json({
        success: true,
        message: "Expert feedback submitted successfully",
        data: {
          id: expertFeedback._id,
          message: expertFeedback.message,
          expertId,
          stars,
          createdAt: expertFeedback.createdAt,
        },
      });
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.statusCode || 500, error.message);
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
}

export default FeedbackController;
