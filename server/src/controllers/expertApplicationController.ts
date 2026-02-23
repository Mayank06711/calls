import express from "express";
import mongoose from "mongoose";
import { ExpertApplicationModel } from "../models/expertApplicationModel";
import { UserModel } from "../models/userModel";
import { ExpertModel } from "../models/expertModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";

class ExpertApplicationController {
  /**
   * POST / — Submit a new expert application (or re-submit from draft).
   */
  private static async _submitApplication(
    req: express.Request,
    res: express.Response
  ) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Login required");

    // Already an expert
    if (req.user?.isExpert) {
      throw new ApiError(400, "You are already an expert");
    }

    // Rate limit: max 2 submissions per 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSubmissions = await ExpertApplicationModel.countDocuments({
      user: userId,
      submittedAt: { $gte: thirtyDaysAgo },
    });

    if (recentSubmissions >= 2) {
      throw new ApiError(
        429,
        "You can only submit 2 applications per month. Please try again later."
      );
    }

    // Check for existing active application (not rejected/withdrawn)
    const existing = await ExpertApplicationModel.findOne({
      user: userId,
      status: { $nin: ["rejected", "withdrawn"] },
    }).lean();

    if (existing && existing.status === "approved") {
      throw new ApiError(400, "Your application has already been approved");
    }
    if (
      existing &&
      ["submitted", "under_review"].includes(existing.status)
    ) {
      throw new ApiError(
        400,
        "You already have a pending application. Withdraw it first to resubmit."
      );
    }

    const { personalInfo, professionalInfo, verification } = req.body;

    // If a draft exists, update it and submit
    if (existing && existing.status === "draft") {
      const updated = await ExpertApplicationModel.findByIdAndUpdate(
        existing._id,
        {
          $set: {
            personalInfo,
            professionalInfo,
            verification,
            status: "submitted",
            submittedAt: new Date(),
          },
        },
        { new: true, runValidators: true }
      );
      return res.status(200).json(
        successResponse({ application: updated }, "Application submitted")
      );
    }

    // Create new application
    const application = await ExpertApplicationModel.create({
      user: userId,
      personalInfo,
      professionalInfo,
      verification,
      status: "submitted",
      submittedAt: new Date(),
    });

    return res.status(201).json(
      successResponse({ application }, "Application submitted successfully")
    );
  }

  /**
   * GET /mine — Get the current user's application.
   */
  private static async _getMyApplication(
    req: express.Request,
    res: express.Response
  ) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Login required");

    const application = await ExpertApplicationModel.findOne({ user: userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(
      successResponse({ application: application || null })
    );
  }

  /**
   * PUT /mine — Update application (only if draft or revisions_requested).
   */
  private static async _updateApplication(
    req: express.Request,
    res: express.Response
  ) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Login required");

    const application = await ExpertApplicationModel.findOne({ user: userId })
      .sort({ createdAt: -1 });

    if (!application) {
      throw new ApiError(404, "No application found");
    }

    if (!["draft", "revisions_requested"].includes(application.status)) {
      throw new ApiError(
        400,
        `Cannot edit application in "${application.status}" status`
      );
    }

    const { personalInfo, professionalInfo, verification } = req.body;

    // Merge partial updates
    if (personalInfo) {
      Object.assign(application.personalInfo, personalInfo);
    }
    if (professionalInfo) {
      Object.assign(application.professionalInfo, professionalInfo);
    }
    if (verification) {
      Object.assign(application.verification, verification);
    }

    // Re-submit if it was revisions_requested
    if (application.status === "revisions_requested") {
      application.status = "submitted";
      application.submittedAt = new Date();
    }

    await application.save();

    return res.status(200).json(
      successResponse({ application }, "Application updated")
    );
  }

  /**
   * POST /mine/withdraw — Withdraw a submitted/under_review application.
   */
  private static async _withdrawApplication(
    req: express.Request,
    res: express.Response
  ) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Login required");

    const application = await ExpertApplicationModel.findOne({ user: userId })
      .sort({ createdAt: -1 });

    if (!application) {
      throw new ApiError(404, "No application found");
    }

    if (!["submitted", "under_review"].includes(application.status)) {
      throw new ApiError(
        400,
        `Cannot withdraw application in "${application.status}" status`
      );
    }

    application.status = "withdrawn";
    await application.save();

    return res.status(200).json(
      successResponse({ application }, "Application withdrawn")
    );
  }

  /**
   * GET /all — Admin: list all applications with pagination and filters.
   */
  private static async _listApplications(
    req: express.Request,
    res: express.Response
  ) {
    const { status } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status) filter.status = status;

    const [applications, total] = await Promise.all([
      ExpertApplicationModel.find(filter)
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "fullName username email profilePhoto phone")
        .lean(),
      ExpertApplicationModel.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({
        applications,
        total,
        page,
        pages: Math.ceil(total / limit),
      })
    );
  }

  /**
   * GET /:applicationId — Admin: get a single application with full detail.
   */
  private static async _getApplicationById(
    req: express.Request,
    res: express.Response
  ) {
    const { applicationId } = req.params;

    const application = await ExpertApplicationModel.findById(applicationId)
      .populate("user", "fullName username email profilePhoto phone gender age city")
      .populate("reviewHistory.reviewedBy", "fullName username")
      .lean();

    if (!application) {
      throw new ApiError(404, "Application not found");
    }

    return res.status(200).json(
      successResponse({ application })
    );
  }

  /**
   * PUT /:applicationId/review — Admin: approve, reject, or request revisions.
   */
  private static async _reviewApplication(
    req: express.Request,
    res: express.Response
  ) {
    const { applicationId } = req.params;
    const { status, notes } = req.body;
    const adminId = req.admin?._id || req.user?._id;
    if (!adminId) throw new ApiError(401, "Admin access required");

    const application = await ExpertApplicationModel.findById(applicationId);
    if (!application) {
      throw new ApiError(404, "Application not found");
    }

    // Prevent reviewing already-approved applications
    if (application.status === "approved") {
      throw new ApiError(400, "Application is already approved");
    }

    // Prevent reviewing drafts
    if (application.status === "draft") {
      throw new ApiError(400, "Cannot review a draft application");
    }

    // Push to review history
    application.reviewHistory.push({
      reviewedBy: new mongoose.Types.ObjectId(adminId.toString()),
      action: status,
      notes: notes || undefined,
      reviewedAt: new Date(),
    });

    application.status = status;
    application.reviewedAt = new Date();

    if (status === "approved") {
      // Set user as expert
      await UserModel.findByIdAndUpdate(application.user, {
        isExpert: true,
      });

      // Create Expert document from application data
      await ExpertModel.create({
        user: application.user,
        experienceInYears: application.professionalInfo.experienceInYears,
        qualification: application.professionalInfo.qualification,
        degree: {
          key: application.verification.degreeFileUrl,
          isVerified: false,
        },
        bio: application.personalInfo.bio,
        specializations: application.professionalInfo.specializations,
        portfolioUrls: application.professionalInfo.portfolioUrls || [],
        socialLinks: application.professionalInfo.socialLinks || {},
      });
    }

    if (status === "rejected" || status === "revisions_requested") {
      application.adminNotes = notes || "";
    }

    await application.save();

    return res.status(200).json(
      successResponse(
        { applicationId, status: application.status },
        status === "approved"
          ? "Application approved — user is now an expert"
          : status === "rejected"
          ? "Application rejected"
          : `Application status updated to ${status}`
      )
    );
  }

  // Public wrappers
  static submitApplication = AsyncHandler.wrap(ExpertApplicationController._submitApplication);
  static getMyApplication = AsyncHandler.wrap(ExpertApplicationController._getMyApplication);
  static updateApplication = AsyncHandler.wrap(ExpertApplicationController._updateApplication);
  static withdrawApplication = AsyncHandler.wrap(ExpertApplicationController._withdrawApplication);
  static listApplications = AsyncHandler.wrap(ExpertApplicationController._listApplications);
  static getApplicationById = AsyncHandler.wrap(ExpertApplicationController._getApplicationById);
  static reviewApplication = AsyncHandler.wrap(ExpertApplicationController._reviewApplication);
}

export default ExpertApplicationController;
