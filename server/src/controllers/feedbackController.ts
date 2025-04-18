import { Request, Response } from "express";
import { UserModel } from "../models/userModel";
import { ExpertModel } from "../models/expertModel";
import Feedback from "../models/feedbackModel";
import { ApiError } from "../utils/apiError";

class FeedbackController {
  // Create Feedback
  static async createFeedback(req: Request, res: Response) {
    try {
      const { userId, expertId, message, type, stars } = req.body;

      // Validate user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // If type is expert, validate expert exists
      if (type === "expert") {
        if (!expertId) {
          throw new ApiError(400, "Expert ID is required for expert feedback");
        }
        
        const expert = await ExpertModel.findOne({ user: expertId });
        if (!expert) {
          throw new ApiError(404, "Expert not found");
        }

        if (!stars || stars < 1 || stars > 5) {
          throw new ApiError(400, "Stars must be between 1 and 5");
        }
      }

      // Create feedback
      const feedback = await Feedback.create({
        user: userId,
        expert: type === "expert" ? expertId : undefined,
        message,
        type,
        stars: type === "expert" ? stars : 0,
        resolved: false,
      });

      return res.status(201).json({
        success: true,
        message: "Feedback submitted successfully",
        data: feedback,
      });
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(error.statusCode || 500, error.message);
    }
  }

  // Get All Feedback (with filters)
  // static async getAllFeedback(req: Request, res: Response) {
  //   try {
  //     const {
  //       type,
  //       resolved,
  //       userId,
  //       expertId,
  //       startDate,
  //       endDate,
  //       page = 1,
  //       limit = 10,
  //     } = req.query;

  //     // Build query
  //     const query: any = {};
  //     if (type) query.type = type;
  //     if (resolved !== undefined) query.resolved = resolved === "true";
  //     if (userId) query.user = userId;
  //     if (expertId) query.expert = expertId;
      
  //     // Date range
  //     if (startDate || endDate) {
  //       query.createdAt = {};
  //       if (startDate) query.createdAt.$gte = new Date(startDate as string);
  //       if (endDate) query.createdAt.$lte = new Date(endDate as string);
  //     }

  //     // Pagination
  //     const skip = (Number(page) - 1) * Number(limit);

  //     const feedbacks = await Feedback.find(query)
  //       .populate("user", "username email")
  //       .populate("expert", "username email")
  //       .sort({ createdAt: -1 })
  //       .skip(skip)
  //       .limit(Number(limit));

  //     const total = await Feedback.countDocuments(query);

  //     return res.status(200).json({
  //       success: true,
  //       data: feedbacks,
  //       pagination: {
  //         total,
  //         page: Number(page),
  //         pages: Math.ceil(total / Number(limit)),
  //       },
  //     });
  //   } catch (error: any) {
  //     throw new ApiError(error.statusCode || 500, error.message);
  //   }
  // }

  // // Get Feedback Statistics
  // static async getFeedbackStats(req: Request, res: Response) {
  //   try {
  //     const stats = await Feedback.getFeedbackStats();
  //     const averageRating = await Feedback.getAverageRating();
  //     const urgentBugs = await Feedback.findUrgentBugs();

  //     return res.status(200).json({
  //       success: true,
  //       data: {
  //         statistics: stats,
  //         averageExpertRating: averageRating,
  //         urgentBugsCount: urgentBugs.length,
  //       },
  //     });
  //   } catch (error: any) {
  //     throw new ApiError(error.statusCode || 500, error.message);
  //   }
  // }

  // // Update Feedback
  // static async updateFeedback(req: Request, res: Response) {
  //   try {
  //     const { feedbackId } = req.params;
  //     const { response, resolved, stars } = req.body;
  //     const expertId = req.user?._id; // Assuming expert ID comes from authenticated user

  //     const feedback = await Feedback.findById(feedbackId);
  //     if (!feedback) {
  //       throw new ApiError(404, "Feedback not found");
  //     }

  //     // If updating expert feedback, verify expert exists
  //     if (feedback.type === "expert" && expertId) {
  //       const expert = await ExpertModel.findOne({ user: expertId });
  //       if (!expert) {
  //         throw new ApiError(403, "Only experts can respond to expert feedback");
  //       }
  //     }

  //     // Add response using instance method
  //     if (response) {
  //       await feedback.addResponse(expertId, response);
  //     }

  //     // Update other fields if provided
  //     if (resolved !== undefined) feedback.resolved = resolved;
  //     if (stars !== undefined) feedback.stars = stars;

  //     await feedback.save();

  //     return res.status(200).json({
  //       success: true,
  //       message: "Feedback updated successfully",
  //       data: feedback,
  //     });
  //   } catch (error: any) {
  //     throw new ApiError(error.statusCode || 500, error.message);
  //   }
  // }

  // // Get Expert Feedback Summary
  // static async getExpertFeedbackSummary(req: Request, res: Response) {
  //   try {
  //     const { expertId } = req.params;

  //     // Verify expert exists
  //     const expert = await ExpertModel.findOne({ user: expertId });
  //     if (!expert) {
  //       throw new ApiError(404, "Expert not found");
  //     }

  //     const expertFeedbacks = await Feedback.findExpertFeedback(expertId);
  //     const averageRating = await Feedback.aggregate([
  //       { $match: { expert: expert.user, type: "expert" } },
  //       { $group: { _id: null, average: { $avg: "$stars" } } },
  //     ]);

  //     return res.status(200).json({
  //       success: true,
  //       data: {
  //         feedbacks: expertFeedbacks,
  //         totalFeedbacks: expertFeedbacks.length,
  //         averageRating: averageRating[0]?.average || 0,
  //         responseTime: expertFeedbacks.map(f => f.responseTime),
  //       },
  //     });
  //   } catch (error: any) {
  //     throw new ApiError(error.statusCode || 500, error.message);
  //   }
  // }

  // // Delete Feedback (Admin only)
  // static async deleteFeedback(req: Request, res: Response) {
  //   try {
  //     const { feedbackId } = req.params;
      
  //     const feedback = await Feedback.findById(feedbackId);
  //     if (!feedback) {
  //       throw new ApiError(404, "Feedback not found");
  //     }

  //     await feedback.deleteOne();

  //     return res.status(200).json({
  //       success: true,
  //       message: "Feedback deleted successfully",
  //     });
  //   } catch (error: any) {
  //     throw new ApiError(error.statusCode || 500, error.message);
  //   }
  // }
}

export default FeedbackController;