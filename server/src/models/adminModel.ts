import mongoose, { Schema, Model } from "mongoose";
import bcrypt from "bcrypt";
import {
  IAdminModel,
  IAdminDocument,
  AdminPermission,
} from "../interface/IAdmin";

// Admin Position Enum
export enum AdminPosition {
  SUPER_ADMIN = "superadmin",
  OPERATIONS_HEAD = "operationshead",
  AGENT = "agent",
}

// Admin Schema - Simple extension of user functionality
const AdminSchema: Schema<IAdminDocument> = new Schema(
  {
    // Reference to User model - this is the core user data
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Admin key for authentication
    adminKey: {
      type: String,
      required: true,
      unique: true,
      minlength: 8,
    },

    // Admin position
    position: {
      type: String,
      enum: Object.values(AdminPosition),
      required: true,
      default: AdminPosition.AGENT,
    },

    // Array of blocked user IDs
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Admin status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Admin activity tracking
    lastLoginAt: { type: Date },
    loginCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash admin key before saving
AdminSchema.pre("save", async function (next) {
  if (!this.isModified("adminKey")) return next();

  const salt = await bcrypt.genSalt(12);
  this.adminKey = await bcrypt.hash(this.adminKey, salt);
  next();
});

// Method to verify admin key
AdminSchema.methods.verifyAdminKey = async function (
  enteredKey: string
): Promise<boolean> {
  return await bcrypt.compare(enteredKey, this.adminKey);
};

// Method to block a user
AdminSchema.methods.blockUser = async function (userId: string) {
  const userIdObj = new mongoose.Types.ObjectId(userId);
  if (
    !this.blockedUsers.some((id: mongoose.Types.ObjectId) =>
      id.equals(userIdObj)
    )
  ) {
    this.blockedUsers.push(userIdObj);
    await this.save();
  }
  return this;
};

// Method to unblock a user
AdminSchema.methods.unblockUser = async function (userId: string) {
  const userIdObj = new mongoose.Types.ObjectId(userId);
  this.blockedUsers = this.blockedUsers.filter(
    (id: mongoose.Types.ObjectId) => !id.equals(userIdObj)
  );
  await this.save();
  return this;
};

// Method to check if a user is blocked
AdminSchema.methods.isUserBlocked = function (userId: string): boolean {
  const userIdObj = new mongoose.Types.ObjectId(userId);
  return this.blockedUsers.some((id: mongoose.Types.ObjectId) =>
    id.equals(userIdObj)
  );
};

// Method to get blocked users count
AdminSchema.methods.getBlockedUsersCount = function (): number {
  return this.blockedUsers.length;
};

// Method to update login activity
AdminSchema.methods.updateLoginActivity = async function () {
  this.lastLoginAt = new Date();
  this.loginCount += 1;
  await this.save();
};

// Method to check permissions based on position
AdminSchema.methods.hasPermission = function (
  permission: AdminPermission
): boolean {
  const permissions: Record<AdminPermission, AdminPosition[]> = {
    canBlockUsers: [
      AdminPosition.AGENT,
      AdminPosition.OPERATIONS_HEAD,
      AdminPosition.SUPER_ADMIN,
    ],
    canDeleteUsers: [AdminPosition.OPERATIONS_HEAD, AdminPosition.SUPER_ADMIN],
    canManageAdmins: [AdminPosition.SUPER_ADMIN],
    canViewAnalytics: [
      AdminPosition.AGENT,
      AdminPosition.OPERATIONS_HEAD,
      AdminPosition.SUPER_ADMIN,
    ],
    canManageContent: [
      AdminPosition.AGENT,
      AdminPosition.OPERATIONS_HEAD,
      AdminPosition.SUPER_ADMIN,
    ],
    canAccessReports: [
      AdminPosition.AGENT,
      AdminPosition.OPERATIONS_HEAD,
      AdminPosition.SUPER_ADMIN,
    ],
  };

  return permissions[permission]?.includes(this.position) || false;
};

// Method to fetch data from any model
AdminSchema.methods.fetchModelData = async function (
  modelName: string,
  query: Record<string, any> = {},
  limit: number = 10,
  sort: Record<string, any> = { createdAt: -1 }
): Promise<any> {
  try {
    const model = mongoose.model(modelName);
    return await model.find(query).sort(sort).limit(limit).exec();
  } catch (error) {
    throw new Error(`Error fetching data from ${modelName}: ${error}`);
  }
};

// Static method to upgrade user to admin
AdminSchema.statics.upgradeUserToAdmin = async function (
  userId: string,
  adminKey: string,
  position: AdminPosition = AdminPosition.AGENT
) {
  // Validate that the user exists
  const User = mongoose.model("User");
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Check if admin already exists for this user
  const existingAdmin = await this.findOne({ userId });
  if (existingAdmin) {
    throw new Error("User is already an admin");
  }

  // Create admin record
  const admin = await this.create({
    userId,
    adminKey,
    position,
  });

  // Update user to mark as admin
  await User.findByIdAndUpdate(userId, { isAdmin: true });

  return admin;
};

// Create and export the Admin model
const Admin = mongoose.model<IAdminDocument, IAdminModel>("Admin", AdminSchema);
export default Admin;
