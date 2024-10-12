import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt"; // For password hashing

// Define the Admin interface
interface IAdmin extends Document {
  user: mongoose.Types.ObjectId; // Reference to the User model
  adminName: string;
  adminPosition: string;
  adminMasterKey: string;
  adminPassword: string;
  adminEmail: string;
  adminUsername: string;
  isActive: boolean;
  // Methods
  fetchModelData(
    modelName: string,
    query: Record<string, any>,
    limit: number
  ): Promise<any>;
  checkPassword(enteredPassword: string): Promise<boolean>;
}

// Admin Schema
const AdminSchema: Schema<IAdmin> = new Schema(
  {
    user: {
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
AdminSchema.pre<IAdmin>("save", async function (next) {
  if (!this.isModified("adminPassword")) return next(); // If password is not modified, skip

  const salt = await bcrypt.genSalt(10); // Generate salt for hashing
  this.adminPassword = await bcrypt.hash(this.adminPassword, salt); // Hash the password
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
    const model: Model<any> = mongoose.model(modelName); // Dynamically reference the model by name
    const data = await model.find(query).limit(limit).exec(); // Fetch the data with the query and limit
    return data;
  } catch (error) {
    throw new Error(`Error fetching data from ${modelName}: ${error}`);
  }
};

// Create and export the Admin model
const Admin = mongoose.model<IAdmin>("Admin", AdminSchema);
export default Admin;
