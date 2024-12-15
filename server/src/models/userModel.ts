import mongoose, { Document, Schema } from "mongoose";
import JWT, { JwtPayload } from "jsonwebtoken";

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
  isAdmin:boolean; // Whether or not
  isExpert: boolean; // Whether or not the user is an expert
<<<<<<< HEAD
  isEmailVerified :boolean; // Whether or not
  isPhoneVerified: boolean; // Whether phone number is verified or not
=======

>>>>>>> b812e15e9eecbaecb8701914f6e1c5622b2212dc
  // defining methods here so that typescript can 
  // Define the methods you plan to add to the schem TypeScript knows about the instance methods you're adding.
  generateAccessToken(): string;
  generateRefreshToken(): string;
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
    isEmailVerified: { type: Boolean, required: true},
    isPhoneVerified: { type: Boolean, required: true},
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
      default: false, // Default to false
    },
    MFASecretKey: {
      type: String,
      required: function () {
        return this.isMFAEnabled; // MFASecretKey is required if MFA is enabled
      },
    },
    isActive: { type: Boolean, default: false }, // user's active status. Default is true.
    isAdmin: { type: Boolean, default: false }, // Whether or not the user is an admin
    isExpert: { type: Boolean, default: false }, // Whether or not the user is an expert
  },
  { timestamps: true }
);

// hook to check if password has been modified
UserSchema.pre<IUser>("save", function (next) {
  if (this.isModified("password")) {
    console.log("Password has been modified."); // encrypt password
  }
  next();
});

UserSchema.methods.generateAccessToken = function () {
  // Generate a JSON Web Token (JWT) containing user information
  // Sign the token with the ACCESS_TOKEN_SECRET environment variable
  // Set the expiration time for the token based on the ACCESS_TOKEN_EXPIRY environment variable

  return JWT.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      city: this.city,
    },
    process.env.ACCESS_TOKEN_SECRET!,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY!,
    }
  );
};

UserSchema.methods.generateRefreshToken = function () {
  return JWT.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET!,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY!,
    }
  );
};

// Create the User model
const UserModel = mongoose.model<IUser>("User", UserSchema);

export { UserModel, IUser };
