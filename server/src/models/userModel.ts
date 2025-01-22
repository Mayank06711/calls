import mongoose, { Document, Schema } from "mongoose";
import JWT, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { AuthServices } from "../helper/auth";
// Define an interface for the Photo object
interface Photo {
  public_id: string; // Cloudinary's public_id for deletion
  url: string; // Original image URL
  thumbnail_url?: string; // Optional thumbnail URL
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
  dob: string;
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

  // Add timestamp fields
  createdAt: Date;
  updatedAt: Date;

  // defining methods here so that typescript can
  // Define the methods you plan to add to the schem TypeScript knows about the instance methods you're adding.
  generateAccessToken(): string;
  generateRefreshToken(): string;
  isPasswordCorrect(password: string): Promise<boolean>;
}

// User schema
const UserSchema: Schema<IUser> = new Schema(
  {
    fullName: { type: String, required: true, default: "user" },
    username: { type: String, required: true, unique: true },
    email: {
      type: String,
      trim: true,
      default: undefined, // Treat missing emails as undefined
      unique: false, // Remove 'unique' here because it's managed by the partial index
      validate: {
        validator: function (v) {
          return v === undefined || v.length > 0; // Allow undefined or non-empty strings
        },
        message: "Email cannot be null or empty",
      },
    },
    phoneNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Not to say"],
      default: "Not to say",
    },
    age: { type: Number, required: true, default: 18 },
    dob: { type: String },
    city: { type: String, required: true, default: "India" },
    country: { type: String, default: "India" },
    refreshToken: { type: String },
    isEmailVerified: { type: Boolean, required: true, default: false },
    isPhoneVerified: { type: Boolean, required: true, default: false },
    photo: {
      type: {
        public_id: { type: String }, // Required for deletion from Cloudinary
        url: { type: String }, // Original image URL
        thumbnail_url: { type: String }, // Optional thumbnail URL
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

// This is a partial index on the 'email' field in the User collection.
// It enforces uniqueness on non-null email values.
UserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $exists: true, $ne: null } },
  }
);

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
      console.log("Generating password");
    }
    // Hash the password
    const saltRounds = 10;
    this.password = bcrypt.hashSync(this.password, saltRounds);
    console.log("hashed password");
  }
  next();
});

// Instance Methods

UserSchema.methods.generateAccessToken = function () {
  // Generate a JSON Web Token (JWT) containing user information
  // Sign the token with the ACCESS_TOKEN_SECRET environment variable
  // Set the expiration time for the token based on the ACCESS_TOKEN_EXPIRY environment variable

  // Create payload
  const payload = {
    _id: this._id,
    email: this.email,
    username: this.username,
    city: this.city,
    iss: "KYF",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 15 minutes
    aud: "kyf-api",
    jti: crypto.randomBytes(16).toString("hex"),
  };

  // Encrypt the payload
  const encryptedPayload = AuthServices.encrypt(JSON.stringify(payload));

  return JWT.sign(
    { 
      data: encryptedPayload,
      iss: "KYF",
      aud: "kyf-api"
    },
    process.env.ACCESS_TOKEN_SECRET!,
    {
      algorithm: 'HS512',
      expiresIn: process.env.ACCESS_TOKEN_SECRET_EXPIRY!,
    }
  );
};

UserSchema.methods.generateRefreshToken = function () {
  // Creating payload
  const payload = {
    _id: this._id,
    iss: "KYF",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15 * 24 * 60 * 60, // 15 days
    aud: "kyf-api",
    jti: crypto.randomBytes(16).toString("hex"),
  };

  // Encrypt the payload
  const encryptedPayload = AuthServices.encrypt(JSON.stringify(payload));

  return JWT.sign(
    { 
      data: encryptedPayload,
      iss: "KYF",
      aud: "kyf-api"
    },
    process.env.REFRESH_TOKEN_SECRET!,
    {
      algorithm: 'HS512',
      expiresIn: process.env.REFRESH_TOKEN_SECRET_EXPIRY!,
    }
  );
};

UserSchema.methods.isPasswordCorrect = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

// Create the User model
const UserModel = mongoose.model<IUser>("User", UserSchema);

export { UserModel, IUser };
