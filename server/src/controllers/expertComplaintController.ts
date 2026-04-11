import express from "express";
import { ExpertComplaintModel } from "../models/expertComplaintModel";
import { UserModel } from "../models/userModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";

class ExpertComplaintController {
  /**
   * Submit a complaint against an expert with optional chat transcript.
   */
  private static async _submitComplaint(req: express.Request, res: express.Response) {
    const complainantId = req.user?._id;
    if (!complainantId) throw new ApiError(401, "Unauthorized");

    const { expertId, chatId, reason, category, transcript, mediaUrls } = req.body;

    // Validate expert exists
    const expert = await UserModel.findById(expertId).select("isExpert").lean();
    if (!expert) throw new ApiError(404, "Expert not found");
    if (!(expert as any).isExpert) throw new ApiError(400, "User is not an expert");

    // Cannot complain about yourself
    if (complainantId.toString() === expertId) {
      throw new ApiError(400, "You cannot file a complaint against yourself");
    }

    // Rate limit: only 1 unresolved complaint per expert per user
    const existingUnresolved = await ExpertComplaintModel.findOne({
      complainant: complainantId,
      expert: expertId,
      status: { $in: ["new", "reviewing"] },
    }).lean();
    if (existingUnresolved) {
      throw new ApiError(429, "You already have an unresolved complaint against this expert. Please wait for it to be reviewed.");
    }

    // Daily limit: max 3 complaints per day across all experts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const dailyCount = await ExpertComplaintModel.countDocuments({
      complainant: complainantId,
      createdAt: { $gte: todayStart },
    });
    if (dailyCount >= 3) {
      throw new ApiError(429, "You have reached the daily complaint limit (3 per day)");
    }

    // Validate reason has at least 10 non-space characters
    if (!reason || reason.replace(/\s/g, "").length < 10) {
      throw new ApiError(400, "Reason must contain at least 10 non-space characters");
    }

    // Validate category
    const validCategories = ["harassment", "fraud", "inappropriate", "spam", "other"];
    if (!validCategories.includes(category)) {
      throw new ApiError(400, "Invalid complaint category");
    }

    // Validate transcript format if provided
    if (transcript && Array.isArray(transcript)) {
      if (transcript.length > 500) {
        throw new ApiError(400, "Transcript too long (max 500 messages)");
      }
      for (const msg of transcript) {
        if (!msg.sender || !msg.content || !msg.timestamp) {
          throw new ApiError(400, "Invalid transcript message format: each message must have sender, content, and timestamp");
        }
      }
    }

    // Validate mediaUrls if provided
    if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 5) {
      throw new ApiError(400, "Maximum 5 media attachments allowed");
    }

    const complaint = await ExpertComplaintModel.create({
      complainant: complainantId,
      expert: expertId,
      chatId: chatId || undefined,
      reason: reason.trim(),
      category,
      transcript: transcript || [],
      mediaUrls: mediaUrls || [],
    });

    return res.status(201).json(
      successResponse(
        { complaintId: complaint._id, status: complaint.status },
        "Complaint submitted successfully"
      )
    );
  }

  /**
   * User's own complaints.
   */
  private static async _getMyComplaints(req: express.Request, res: express.Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const [complaints, total] = await Promise.all([
      ExpertComplaintModel.find({ complainant: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("expert", "fullName username profilePhoto")
        .lean(),
      ExpertComplaintModel.countDocuments({ complainant: userId }),
    ]);

    return res.status(200).json(
      successResponse({ complaints, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * Admin: get all complaints with filters.
   */
  private static async _getComplaints(req: express.Request, res: express.Response) {
    const { status, category } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const [complaints, total] = await Promise.all([
      ExpertComplaintModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("complainant", "fullName username profilePhoto")
        .populate("expert", "fullName username profilePhoto")
        .lean(),
      ExpertComplaintModel.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({ complaints, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * Admin: update complaint status and add notes.
   */
  private static async _updateComplaintStatus(req: express.Request, res: express.Response) {
    const { complaintId } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ["new", "reviewing", "resolved", "dismissed"];
    if (status && !validStatuses.includes(status)) {
      throw new ApiError(400, "Invalid complaint status");
    }

    const complaint = await ExpertComplaintModel.findById(complaintId);
    if (!complaint) throw new ApiError(404, "Complaint not found");

    if (status) complaint.status = status;
    if (adminNotes !== undefined) complaint.adminNotes = adminNotes;
    await complaint.save();

    return res.status(200).json(
      successResponse(
        { complaintId, status: complaint.status },
        "Complaint updated"
      )
    );
  }

  static submitComplaint = AsyncHandler.wrap(ExpertComplaintController._submitComplaint);
  static getMyComplaints = AsyncHandler.wrap(ExpertComplaintController._getMyComplaints);
  static getComplaints = AsyncHandler.wrap(ExpertComplaintController._getComplaints);
  static updateComplaintStatus = AsyncHandler.wrap(ExpertComplaintController._updateComplaintStatus);
}

export default ExpertComplaintController;
