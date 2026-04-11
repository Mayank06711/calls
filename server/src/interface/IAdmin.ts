import { Document, Model, Types } from "mongoose";

// ─── Admin Permissions ──────────────────────────────────────────────────────
//
// Permission              | Agent | OpsHead | SuperAdmin
// ────────────────────────┼───────┼─────────┼───────────
// canBlockUsers           |  yes  |   yes   |    yes
// canManageExperts        |  yes  |   yes   |    yes      (approve/reject applications, view expert profiles)
// canSendNotifications    |  yes  |   yes   |    yes
// canViewAnalytics        |  yes  |   yes   |    yes
// canAccessReports        |  yes  |   yes   |    yes
// canManageContent        |  yes  |   yes   |    yes
// canDeleteUsers          |  no   |   yes   |    yes      (soft-delete/reactivate, force-logout)
// canManageSubscriptions  |  no   |   yes   |    yes      (extend, modify subscriptions)
// canManageAdmins         |  no   |   no    |    yes      (create/deactivate admins, change positions)

export type AdminPermission =
  | 'canBlockUsers'
  | 'canDeleteUsers'
  | 'canManageAdmins'
  | 'canViewAnalytics'
  | 'canManageContent'
  | 'canAccessReports'
  | 'canSendNotifications'
  | 'canManageExperts'
  | 'canManageSubscriptions'

// Admin Position Enum
// - agent:          Day-to-day moderation — block users, review experts, send notifications, view reports
// - operationshead: Full operational control — everything agent can + delete/reactivate users, manage subscriptions
// - superadmin:     Platform owner — everything + create/deactivate other admins, change admin positions
export enum AdminPosition {
  SUPER_ADMIN = "superadmin",
  OPERATIONS_HEAD = "operationshead",
  AGENT = "agent",
}

// Interface for methods
interface IAdminMethods {
  verifyAdminKey(enteredKey: string): Promise<boolean>;
  blockUser(userId: string): Promise<IAdminDocument>;
  unblockUser(userId: string): Promise<IAdminDocument>;
  isUserBlocked(userId: string): boolean;
  getBlockedUsersCount(): number;
  updateLoginActivity(): Promise<void>;
  hasPermission(permission: string): boolean;
  fetchModelData(
    modelName: string,
    query?: Record<string, any>,
    limit?: number,
    sort?: Record<string, any>
  ): Promise<any>;
}

// Main interface
export interface IAdmin extends Document {
  userId: Types.ObjectId; // Reference to the User model
  adminKey: string;
  position: AdminPosition;
  blockedUsers: Types.ObjectId[];
  isActive: boolean;
  lastLoginAt?: Date;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Combine the document interface with methods
export interface IAdminDocument extends IAdmin, IAdminMethods {}

// Model interface
export interface IAdminModel extends Model<IAdminDocument> {
  upgradeUserToAdmin(
    userId: string,
    adminKey: string,
    position?: AdminPosition
  ): Promise<IAdminDocument>;
}
