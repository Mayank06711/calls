import { Document, Model, Types } from "mongoose";

// Interface for methods
interface IAdminMethods {
  checkPassword(enteredPassword: string): Promise<boolean>;
  fetchModelData(
    modelName: string,
    query: Record<string, any>,
    limit: number
  ): Promise<any>;
}

// Main interface
export interface IAdmin extends Document {
  userId: Types.ObjectId | string; // Reference to the User model
  adminName: string;
  adminPosition: string;
  adminMasterKey: string;
  adminPassword: string;
  adminEmail: string;
  adminUsername: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Combine the document interface with methods
export interface IAdminDocument extends IAdmin, IAdminMethods {}

// Model interface
export interface IAdminModel extends Model<IAdminDocument> {
  // Add any static methods here if needed
}
