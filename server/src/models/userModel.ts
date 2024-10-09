import mongoose, { Document, Schema } from "mongoose";

// Define an interface for the Photo object
interface Photo {
  key: string;
  url: string;
}

// interface for the User document
interface IUser extends Document {
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
  gender: "Male" | "Female" | "Other"; // Enum for gender
  age: number;
  city: string;
  country?: string; // Default is 'India', but not required
  refreshToken: string;
  photo?: Photo;
  isSubscribed: "Yes" | "No" | "Pending" | "Request"; // Enum for subscription status
  subscriptionDetail: "Premium" | "Casual" | "Medium"; // Enum for subscription details
  referral?: mongoose.Types.ObjectId; // Reference to another User document
  isMFAEnabled: boolean;
  MFASecretKey?: string; // Optional MFA key
  isActive: boolean;
}

// User schema
const UserSchema: Schema<IUser> = new Schema(
  {
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: { type: String, required: true, enum: ["Male", "Female", "Other"] },
    age: { type: Number, required: true },
    city: { type: String, required: true },
    country: { type: String, default: "India" },
    refreshToken: { type: String },
    photo: {
      type: {
        key: { type: String },
        url: { type: String },
      },
    },
    isSubscribed: {
      type: String,
      default: "No",
      enum: ["Yes", "No", "Pending", "Requested"],
    },
    subscriptionDetail: {
      type: String,
      required: true,
      enum: ["Premium", "Casual", "Medium"],
    },
    referral: { type: Schema.Types.ObjectId, ref: "User" },
    isMFAEnabled: {
      type: Boolean,
      default: false  // Default to false
    },
    MFASecretKey: {
      type: String,
      required: function() {
        return this.isMFAEnabled;  // MFASecretKey is required if MFA is enabled
      }
    },
    isActive: { type: Boolean, default: false}, // user's active status. Default is true.
  },
  { timestamps: true }
);

// hook to check if password has been modified
UserSchema.pre<IUser>("save", function (next) {
  if (this.isModified("password")) {
    console.log("Password has been modified.");// encrypt password 
  }
  next();
});
// Create the User model
const UserModel = mongoose.model<IUser>("User", UserSchema);

export { UserModel, IUser };
