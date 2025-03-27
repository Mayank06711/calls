import mongoose from "mongoose";

export interface MediaItem {
  public_id: string;
  url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
}

export interface IMedia extends Document {
  userId: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId;
  photos: MediaItem[];
  videos: MediaItem[];
  createdAt: Date;
  updatedAt: Date;

  // Add these method signatures
  getPhotoById(publicId: string): MediaItem | null;
  getVideoById(publicId: string): MediaItem | null;
  getLatestPhoto(): MediaItem | null;
  getLatestVideo(): MediaItem | null;
  addPhoto(photoData: Partial<MediaItem>): Promise<MediaItem>;
  addVideo(videoData: Partial<MediaItem>): Promise<MediaItem>;
  getAllPhotos(): MediaItem[];
  getAllVideos(): MediaItem[];
  getAllPhotoUrls(): { url: string; thumbnail_url?: string }[];
  getAllVideoUrls(): { url: string; thumbnail_url?: string }[];
  removePhoto(publicId: string): Promise<void>;
  removeVideo(publicId: string): Promise<void>;
}
