import mongoose, { Schema, Model } from "mongoose";
import bcrypt from "bcrypt"; // For password hashing
import { IAdminModel, IAdminDocument } from "../interface/IAdmin";

// Define the Admin interface

// Admin Schema
const AdminSchema: Schema<IAdminDocument> = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    adminPosition: {
      type: String,
      required: true,
    },
    adminMasterKey: {
      type: String,
      required: true,
    },
    adminPassword: {
      type: String,
      required: true,
    },
    adminEmail: {
      type: String,
      required: true,
      unique: true,
    },
    adminUsername: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: { type: Boolean, default: false },
  },
  {
    timestamps: true, // Enable createdAt and updatedAt fields
  }
);

// Pre-save hook to hash admin password before saving to DB
AdminSchema.pre("save", async function (next) {
  if (!this.isModified("adminPassword")) return next();

  const salt = await bcrypt.genSalt(10);
  this.adminPassword = await bcrypt.hash(this.adminPassword, salt);
  next();
});

// Method to check if the entered password is correct
AdminSchema.methods.checkPassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.adminPassword);
};

// Method to fetch data from any model based on dynamic parameters
AdminSchema.methods.fetchModelData = async function (
  modelName: string,
  query: Record<string, any>,
  limit: number = 10
): Promise<any> {
  try {
    const model = mongoose.model(modelName);
    return await model.find(query).limit(limit).exec();
  } catch (error) {
    throw new Error(`Error fetching data from ${modelName}: ${error}`);
  }
};

// Create and export the Admin model
const Admin = mongoose.model<IAdminDocument, IAdminModel>("Admin", AdminSchema);
export default Admin;
