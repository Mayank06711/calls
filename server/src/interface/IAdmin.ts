import { Document, Model, Types } from "mongoose";

// Define permission types
export type AdminPermission = 
  | 'canBlockUsers' 
  | 'canDeleteUsers' 
  | 'canManageAdmins' 
  | 'canViewAnalytics' 
  | 'canManageContent' 
  | 'canAccessReports'
  | 'canSendNotifications'


// Admin Position Enum
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
