import mongoose, { Document, Schema } from "mongoose";
import JWT, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";

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
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  password: string;
  gender: "Male" | "Female" | "Not to say"; // Enum for gender
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
  isAdmin: boolean; // Whether or not
  isExpert: boolean; // Whether or not the user is an expert

  // defining methods here so that typescript can
  // Define the methods you plan to add to the schem TypeScript knows about the instance methods you're adding.
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

// User schema
const UserSchema: Schema<IUser> = new Schema(
  {
    fullName: { type: String, required: true, default: "user" },
    username: { type: String, required: true, unique: true },
    email: { type: String, unique: true },
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Not to say"],
      default: "Not to say",
    },
    age: { type: Number, required: true, default: 18 },
    city: { type: String, required: true, default: "India" },
    country: { type: String, default: "India" },
    refreshToken: { type: String},
    isEmailVerified: { type: Boolean, required: true, default: false },
    isPhoneVerified: { type: Boolean, required: true, default: false },
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

function generateRandomPassword(length = 12): string {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

// hook to check if password has been modified
UserSchema.pre<IUser>("save", async function (next) {
  // Check if password is being set for the first time or is modified
  if (!this.password || this.isModified("password")) {
    console.log("Generating or hashing password...");
    if (!this.password) {
      // If no password is provided, generate a random one
      this.password = generateRandomPassword(8);
      console.log("Generating password")
    }
    // Hash the password
    const saltRounds = 10;
    this.password = bcrypt.hashSync(this.password, saltRounds);
    console.log("hashed password")
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
      expiresIn: process.env.ACCESS_TOKEN_SECRET_EXPIRY!,
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
      expiresIn: process.env.REFRESH_TOKEN_SECRET_EXPIRY!,
    }
  );
};

UserSchema.methods.isPasswordCorrect = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};


// if you will search with only phoneNumber it will still use indexing
// Compound Indexes, order of fields in a compound index matter you have to search in same order as index
UserSchema.index({ phoneNumber: 1, isPhoneVerified: 1, isActive: 1 }); // Compound index on phoneNumber and isActive
UserSchema.index({
  phoneNumber: 1,
  isPhoneVerified: 1,
  isActive: 1,
  isAdmin: 1,
}); // Compound index on phoneNumber, isPhoneVerified, and isAdmin
UserSchema.index({
  phoneNumber: 1,
  isPhoneVerified: 1,
  isActive: 1,
  isExpert: 1,
}); // Compound index on isPhoneVerified, isAdmin, and isExpert

// Create the User model
const UserModel = mongoose.model<IUser>("User", UserSchema);

export { UserModel, IUser };
