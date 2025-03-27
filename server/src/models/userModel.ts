import mongoose, { Schema } from "mongoose";
import JWT, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { AuthServices } from "../helper/auth";
import { MediaModel } from "./mediaModel";
import { IUser } from "../interface/IUser";
import { MediaItem } from "../interface/IMedia";

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
    mediaId: { type: Schema.Types.ObjectId, ref: "Media" },
    profilePhotoId: { type: String },
    profileVideoId: { type: String },
    currentSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
    },
    isSubscribed: {
      type:Boolean,
      default: false
    },
    referral: {
      type: Schema.Types.ObjectId,
      ref: "Referral",
    },
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
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 15 minutes
    aud: "kyf-api",
    jti: crypto.randomBytes(16).toString("hex"),
  };

  // Encrypt the payload
  const encryptedPayload = AuthServices.encrypt(JSON.stringify(payload));

  return JWT.sign(
    {
      data: encryptedPayload,
      iss: "KYF",
      aud: "kyf-api",
    },
    process.env.ACCESS_TOKEN_SECRET!,
    {
      algorithm: "HS512",
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
      aud: "kyf-api",
    },
    process.env.REFRESH_TOKEN_SECRET!,
    {
      algorithm: "HS512",
      expiresIn: process.env.REFRESH_TOKEN_SECRET_EXPIRY!,
    }
  );
};

UserSchema.methods.isPasswordCorrect = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

// Add instance methods
UserSchema.methods.getProfileMedia = async function () {
  const media = await MediaModel.findById(this.mediaId);
  // Return empty object if no media found instead of throwing error
  if (!media) return { photo: null, video: null };

  const profilePhoto = this.profilePhotoId
    ? media.getPhotoById(this.profilePhotoId)
    : null;
  const profileVideo = this.profileVideoId
    ? media.getVideoById(this.profileVideoId)
    : null;

  return {
    photo: profilePhoto,
    video: profileVideo,
  };
};

UserSchema.methods.getAllMedia = async function () {
  const media = await MediaModel.findById(this.mediaId);
  // Return empty object if no media found instead of throwing error
  if (!media) return { photo: [], video: [] };
  return {
    photos: media.getAllPhotoUrls(),
    videos: media.getAllVideoUrls(),
  };
};

UserSchema.methods.addProfilePhoto = async function (
  photoData: Partial<MediaItem>
) {
  let media = await MediaModel.findById(this.mediaId);
  // If no media document exists, create one
  if (!media) {
    media = await MediaModel.create({
      userId: this._id,
      photos: [],
      videos: [],
    });
    this.mediaId = media._id;
    await this.save();
  }

  const newPhoto = await media.addPhoto(photoData);
  this.profilePhotoId = newPhoto.public_id; // Update current profile photo
  await this.save();
  return newPhoto;
};

UserSchema.methods.addProfileVideo = async function (
  videoData: Partial<MediaItem>
) {
  let media = await MediaModel.findById(this.mediaId);

  // If no media document exists, create one
  if (!media) {
    media = await MediaModel.create({
      userId: this._id,
      photos: [],
      videos: [],
    });
    this.mediaId = media._id;
    await this.save();
  }
  const newVideo = await media.addVideo(videoData);
  this.profileVideoId = newVideo.public_id; // Update current profile video
  await this.save();
  return newVideo;
};

UserSchema.methods.removeProfilePhoto = async function (publicId: string) {
  const media = await MediaModel.findById(this.mediaId);
  if (!media) return; // Silently return if no media exists

  await media.removePhoto(publicId);
  if (this.profilePhotoId === publicId) {
    // If removing current profile photo, set to latest photo or null
    const latestPhoto = media.getLatestPhoto();
    this.profilePhotoId = latestPhoto?.public_id || null;
    await this.save();
  }
};

UserSchema.methods.removeProfileVideo = async function (publicId: string) {
  const media = await MediaModel.findById(this.mediaId);
  if (!media) return;

  await media.removeVideo(publicId);
  if (this.profileVideoId === publicId) {
    // If removing current profile video, set to latest video or null
    const latestVideo = media.getLatestVideo();
    this.profileVideoId = latestVideo?.public_id || null;
    await this.save();
  }
};

// Create the User model
const UserModel = mongoose.model<IUser>("User", UserSchema);

export { UserModel, IUser };
