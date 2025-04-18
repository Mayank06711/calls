import mongoose, { Schema } from "mongoose";
import { IMedia, MediaItem } from "../interface/IMedia";

const MediaItemSchema = new Schema({
  public_id: { type: String, required: true },
  url: { type: String, required: true },
  thumbnail_url: String,
  title: String,
  description: String,
  tags: [String],
  createdAt: { type: Date, default: Date.now },
});

const MediaSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    chatId: { type: String },
    photos: [MediaItemSchema],
    videos: [MediaItemSchema],
  },
  { timestamps: true }
);

// Add instance methods
MediaSchema.methods.getPhotoById = function (
  publicId: string
): MediaItem | null {
  return (
    this.photos.find((photo: MediaItem) => photo.public_id === publicId) || null
  );
};

MediaSchema.methods.getVideoById = function (
  publicId: string
): MediaItem | null {
  return (
    this.videos.find((video: MediaItem) => video.public_id === publicId) || null
  );
};

MediaSchema.methods.getLatestPhoto = function (): MediaItem | null {
  return this.photos.length > 0 ? this.photos[this.photos.length - 1] : null;
};

MediaSchema.methods.getLatestVideo = function (): MediaItem | null {
  return this.videos.length > 0 ? this.videos[this.videos.length - 1] : null;
};

MediaSchema.methods.addPhoto = async function (
  photoData: Partial<MediaItem>
): Promise<MediaItem> {
  this.photos.push({
    ...photoData,
    createdAt: new Date(),
  });
  await this.save();
  return this.photos[this.photos.length - 1];
};

MediaSchema.methods.addVideo = async function (
  videoData: Partial<MediaItem>
): Promise<MediaItem> {
  this.videos.push({
    ...videoData,
    createdAt: new Date(),
  });
  await this.save();
  return this.videos[this.videos.length - 1];
};

MediaSchema.methods.getAllPhotos = function (): MediaItem[] {
  return this.photos || [];
};

MediaSchema.methods.getAllVideos = function (): MediaItem[] {
  return this.videos || [];
};

MediaSchema.methods.getAllPhotoUrls = function () {
  return this.photos.map((photo: MediaItem) => ({
    url: photo.url,
    thumbnail_url: photo.thumbnail_url,
  }));
};

MediaSchema.methods.getAllVideoUrls = function () {
  return this.videos.map((video: MediaItem) => ({
    url: video.url,
    thumbnail_url: video.thumbnail_url,
  }));
};

MediaSchema.methods.removePhoto = async function (
  publicId: string
): Promise<void> {
  this.photos = this.photos.filter(
    (photo: MediaItem) => photo.public_id !== publicId
  );
  await this.save();
};

MediaSchema.methods.removeVideo = async function (
  publicId: string
): Promise<void> {
  this.videos = this.videos.filter(
    (video: MediaItem) => video.public_id !== publicId
  );
  await this.save();
};

// Index for faster queries
MediaSchema.index({ userId: 1 });

const MediaModel = mongoose.model<IMedia>("Media", MediaSchema); // Fixed model name from "User" to "Media"

export { MediaModel };
