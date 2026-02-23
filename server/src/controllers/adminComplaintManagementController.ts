import express from "express";
import { ExpertComplaintModel } from "../models/expertComplaintModel";
import Admin from "../models/adminModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";

class AdminComplaintManagementController {
  /**
   * GET / — List all complaints with filters + pagination.
   */
  private static async _listComplaints(
    req: express.Request,
    res: express.Response
  ) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;

    const [complaints, total] = await Promise.all([
      ExpertComplaintModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("complainant", "fullName username email profilePhoto")
        .populate("expert", "fullName username email profilePhoto")
        .lean(),
      ExpertComplaintModel.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({ complaints, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * GET /:complaintId — Single complaint detail.
   */
  private static async _getDetail(
    req: express.Request,
    res: express.Response
  ) {
    const complaint = await ExpertComplaintModel.findById(req.params.complaintId)
      .populate("complainant", "fullName username email profilePhoto")
      .populate("expert", "fullName username email profilePhoto")
      .lean();

    if (!complaint) throw new ApiError(404, "Complaint not found");

    return res.status(200).json(successResponse({ complaint }));
  }

  /**
   * GET /stats — Complaint analytics.
   */
  private static async _getStats(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canViewAnalytics")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const [byStatus, byCategory, total] = await Promise.all([
      ExpertComplaintModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { status: "$_id", count: 1, _id: 0 } },
      ]),
      ExpertComplaintModel.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $project: { category: "$_id", count: 1, _id: 0 } },
      ]),
      ExpertComplaintModel.countDocuments(),
    ]);

    return res.status(200).json(
      successResponse({ byStatus, byCategory, total })
    );
  }

  /**
   * GET /expert/:expertId — All complaints against an expert.
   */
  private static async _getByExpert(
    req: express.Request,
    res: express.Response
  ) {
    const { expertId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const [complaints, total] = await Promise.all([
      ExpertComplaintModel.find({ expert: expertId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("complainant", "fullName username profilePhoto")
        .lean(),
      ExpertComplaintModel.countDocuments({ expert: expertId }),
    ]);

    return res.status(200).json(
      successResponse({ complaints, total, page, pages: Math.ceil(total / limit) })
    );
  }

  // Public wrappers
  static listComplaints = AsyncHandler.wrap(AdminComplaintManagementController._listComplaints);
  static getDetail = AsyncHandler.wrap(AdminComplaintManagementController._getDetail);
  static getStats = AsyncHandler.wrap(AdminComplaintManagementController._getStats);
  static getByExpert = AsyncHandler.wrap(AdminComplaintManagementController._getByExpert);
}

export default AdminComplaintManagementController;
