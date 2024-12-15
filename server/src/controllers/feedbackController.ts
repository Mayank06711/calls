import { Request, Response } from "express";
import Feedback from "../models/feedbackModel";
import { ApiError } from "../utils/apiError";

class FeedbackController {
  // Create Feedback
  static async createFeedback(req: Request, res: Response) {
    try {
      const { user, expert, message, type, stars } = req.body;

      // Check for required fields
      if (!user || !message || !type) {
        return res.status(400).json({
          success: false,
          message: "User, Message, and Type are required fields.",
        });
      }

      // Validate feedback type
      const allowedTypes = ["bug", "feature", "expert"];
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid feedback type. Allowed types: ${allowedTypes.join(
            ", "
          )}.`,
        });
      }

      // Create new feedback
      const feedback = await Feedback.create({
        user,
        expert: type === "expert" ? expert : undefined, // Only add expert if type is "expert"
        message,
        stars: type === "expert" ? stars : 0,
        type,
        resolved: type === "expert" ? true : false, // Initially marked as unresolved
      });

      return res.status(201).json({
        success: true,
        message: "Feedback submitted successfully.",
      });
    } catch (error: any) {
      throw new ApiError(
        process.env.NODE_ENV === "production" ? 500 : error.code,
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : error.message
      );
    }
  }

  // Get Feedback (filtered by criteria)
  static async getFeedback(req: Request, res: Response) {
    try {
      const { userId, type, resolved } = req.query;

      // Build query based on parameters
      const query: any = {};
      if (userId) query.user = userId;
      if (type) query.type = type;
      if (resolved !== undefined) query.resolved = resolved === "true";

      // Find feedbacks based on query
      const feedbacks = await Feedback.find(query)
        .populate("user", "username email")
        .populate("expert", "username email")
        .sort({ createdAt: -1 });

      if (!feedbacks || feedbacks.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No feedback found with the given criteria.",
        });
      }

      console.log("Feedback", feedbacks);
      return res.status(200).json({
        success: true,
        feedbacks,
      });
    } catch (error: any) {
      throw new ApiError(
        process.env.NODE_ENV === "production" ? 500 : error.code,
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : error.message
      );
    }
  }

  // Update Feedback (e.g., mark as resolved or update stars)
  static async updateFeedback(req: Request, res: Response) {
    try {
      const { feedbackId } = req.params;
      const { resolved, stars, message } = req.body;

      // Validate feedback ID
      const feedback = await Feedback.findById(feedbackId);
      if (!feedback) {
        throw new ApiError(404, "Feedback not found");
      }

      // Update resolved status, stars, or message
      if (resolved !== undefined) feedback.resolved = resolved;
      if (stars !== undefined) feedback.stars = stars;
      if (message !== undefined) feedback.message = message;

      // Save the updated feedback
      await feedback.save();

      return res.status(200).json({
        success: true,
        message: "Feedback updated successfully.",
      });
    } catch (error: any) {
      throw new ApiError(
        process.env.NODE_ENV === "production" ? 500 : error.code,
        process.env.NODE_ENV === "production"
          ? "Internal Server Error"
          : error.message
      );
    }
  }
}

export default FeedbackController;
