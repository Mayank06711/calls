import axios from "axios";
import { getCloudinary } from "../../db";
import { BookingModel } from "../../models/bookingModel";
import { SocketManager } from "../../socket";

// ─── Prompt Templates ──────────────────────────────────────────────────────

const PROMPTS: Record<string, string> = {
  clothing: `Virtual fashion try-on: Dress the person shown in images 1 and 2 in the exact clothing item displayed in images 3 and 4.

CRITICAL RULES:
- The person's face, body shape, skin tone, hair color, and hairstyle must remain EXACTLY unchanged
- The clothing must precisely match the reference: same color, fabric texture, pattern, cut, and all design details
- The garment should drape naturally on the person's body with realistic folds, wrinkles, and shadows appropriate to the fabric type
- Maintain natural body proportions — the clothing should fit as it would on a real person
- Use soft, even studio lighting with subtle shadows that give depth
- Place the person against a clean, neutral light-gray background
- Output ONE front-facing photo: full-body if the item includes bottoms/shoes, waist-up if it's only a top layer
- The final result must look like a high-end e-commerce product photo — professional, sharp, 4K quality`,

  hair: `Virtual hairstyle try-on: Apply the exact hairstyle shown in reference images 3 and 4 to the person in images 1 and 2.

CRITICAL RULES:
- The person's face shape, skin tone, eye color, eyebrows, and all facial features must remain EXACTLY unchanged
- The hairstyle must match the reference precisely: same cut, length, layers, volume, color, highlights, and styling technique
- Hair must look natural with proper volume, texture, strand detail, and realistic movement/flow
- Lighting should highlight the hair's shine, dimension, and color depth
- Keep the person's clothing/outfit from their original photo unchanged
- Place against a clean, soft background
- Output ONE portrait photo (head and shoulders) showing the complete hairstyle
- Result must look like a professional salon portfolio photo — natural, editorial quality`,

  makeup: `Virtual makeup try-on: Apply the exact makeup look from reference images 3 and 4 to the person in images 1 and 2.

CRITICAL RULES:
- The person's face shape, bone structure, skin tone, hair, and facial features must remain EXACTLY unchanged
- Reproduce the makeup precisely: same eye shadow colors and blending, same lip color and finish, same blush/contour placement, same brow shaping
- The makeup must look professionally applied — smooth blending, clean lines, natural-looking coverage
- Maintain visible skin texture underneath the makeup for realism (not airbrushed/plastic)
- Use soft beauty lighting that showcases the makeup colors and techniques
- Keep the person's hairstyle from their original photo unchanged
- Output ONE close-up beauty portrait focusing on the face and makeup
- Result must look like a professional beauty editorial — crisp detail, true-to-life color rendering`,
};

// ─── NanoBanana API Types ──────────────────────────────────────────────────

interface GenerateResponse {
  code: number;
  msg: string;
  data: { taskId: string };
}

interface RecordInfoResponse {
  code: number;
  data: {
    successFlag: number; // 0=generating, 1=success, 2=creation failed, 3=gen failed
    response?: {
      resultImageUrl?: string[];
    };
  };
}

// ─── Service ───────────────────────────────────────────────────────────────

class NanoBananaService {
  private static readonly BASE_URL =
    "https://api.nanobananaapi.ai/api/v1/nanobanana";
  private static readonly POLL_INTERVAL_MS = 3000;
  private static readonly MAX_POLL_ATTEMPTS = 100; // ~5 minutes
  private static readonly REQUEST_TIMEOUT_MS = 30000;

  private static getApiKey(): string {
    const key = process.env.NANOBANANA_API_KEY;
    if (!key) throw new Error("NANOBANANA_API_KEY not configured");
    return key;
  }

  static getPrompt(category: "clothing" | "hair" | "makeup"): string {
    return PROMPTS[category];
  }

  /**
   * Submit a generation request to NanoBanana Pro.
   * imageUrls order: [personPhoto1, personPhoto2, styleImage1, styleImage2]
   */
  static async submitGeneration(
    prompt: string,
    imageUrls: string[]
  ): Promise<string> {
    const response = await axios.post<GenerateResponse>(
      `${this.BASE_URL}/generate`,
      {
        prompt,
        type: "IMAGETOIAMGE", // NanoBanana's exact spelling
        imageUrls,
        numImages: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${this.getApiKey()}`,
          "Content-Type": "application/json",
        },
        timeout: this.REQUEST_TIMEOUT_MS,
      }
    );

    const taskId = response.data?.data?.taskId;
    if (!taskId) throw new Error("NanoBanana API did not return a taskId");
    return taskId;
  }

  /**
   * Poll NanoBanana for task completion. Returns the result image URL.
   */
  static async pollForResult(taskId: string): Promise<string> {
    for (let attempt = 0; attempt < this.MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.POLL_INTERVAL_MS)
      );

      const response = await axios.get<RecordInfoResponse>(
        `${this.BASE_URL}/record-info`,
        {
          params: { taskId },
          headers: { Authorization: `Bearer ${this.getApiKey()}` },
          timeout: this.REQUEST_TIMEOUT_MS,
        }
      );

      const flag = response.data?.data?.successFlag;

      if (flag === 1) {
        const resultUrl =
          response.data.data.response?.resultImageUrl?.[0];
        if (!resultUrl)
          throw new Error("NanoBanana returned success but no resultImageUrl");
        return resultUrl;
      }
      if (flag === 2) throw new Error("NanoBanana: Task creation failed");
      if (flag === 3)
        throw new Error("NanoBanana: Image generation failed");
      // flag === 0 → still generating, continue polling
    }

    throw new Error("NanoBanana: Polling timed out after 5 minutes");
  }

  /**
   * Re-upload a generated image URL to Cloudinary for permanent storage.
   */
  static async uploadToCloudinary(
    imageUrl: string,
    bookingId: string
  ): Promise<string> {
    const cloudinary = getCloudinary();
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: `tryon/${bookingId}`,
      resource_type: "image",
      quality: "auto:best",
      format: "jpg",
    });
    return result.secure_url;
  }

  /**
   * Full background processing pipeline (fire-and-forget).
   * 1. Submit to NanoBanana  2. Poll  3. Upload to Cloudinary
   * 4. Update DB  5. Emit socket events
   */
  static async processInBackground(
    bookingId: string,
    tryOnResultId: string,
    prompt: string,
    imageUrls: string[],
    userId: string,
    expertUserId: string
  ): Promise<void> {
    try {
      // 1. Submit generation
      const taskId = await this.submitGeneration(prompt, imageUrls);

      // Update status to "generating" with taskId
      await BookingModel.updateOne(
        { _id: bookingId, "tryOnResults._id": tryOnResultId },
        {
          $set: {
            "tryOnResults.$.status": "generating",
            "tryOnResults.$.taskId": taskId,
          },
        }
      );

      // 2. Poll for result
      const nanobananaResultUrl = await this.pollForResult(taskId);

      // 3. Upload to Cloudinary
      const cloudinaryUrl = await this.uploadToCloudinary(
        nanobananaResultUrl,
        bookingId
      );

      // 4. Update booking with completed result
      await BookingModel.updateOne(
        { _id: bookingId, "tryOnResults._id": tryOnResultId },
        {
          $set: {
            "tryOnResults.$.status": "completed",
            "tryOnResults.$.resultImageUrl": cloudinaryUrl,
            "tryOnResults.$.completedAt": new Date(),
          },
        }
      );

      // 5. Emit socket events to both parties
      const eventData = {
        bookingId,
        tryOnResultId,
        status: "completed",
        resultImageUrl: cloudinaryUrl,
      };
      await this.emitToParticipants(userId, expertUserId, eventData);

      console.log(
        `[TryOn] Completed for booking ${bookingId}, result: ${tryOnResultId}`
      );
    } catch (error: any) {
      console.error(
        `[TryOn] Failed for booking ${bookingId}:`,
        error.message
      );

      // Update status to failed
      await BookingModel.updateOne(
        { _id: bookingId, "tryOnResults._id": tryOnResultId },
        {
          $set: {
            "tryOnResults.$.status": "failed",
            "tryOnResults.$.error": error.message || "Unknown error",
          },
        }
      ).catch((e: any) =>
        console.error("[TryOn] Failed to update status:", e)
      );

      // Notify both parties of failure
      const failData = {
        bookingId,
        tryOnResultId,
        status: "failed",
        error: error.message || "Try-on generation failed",
      };
      await this.emitToParticipants(userId, expertUserId, failData);
    }
  }

  private static async emitToParticipants(
    userId: string,
    expertUserId: string,
    data: Record<string, any>
  ): Promise<void> {
    const socketManager = SocketManager.getInstance();
    for (const targetId of [userId, expertUserId]) {
      try {
        const sock = await socketManager.getSocketIdUsingUserId(targetId);
        if (sock?.socketId) {
          await socketManager.emitEvent({
            event: "booking:tryon-result",
            data,
            targetSocketIds: [sock.socketId],
          });
        }
      } catch (err) {
        console.error(`[TryOn] Socket emit error for ${targetId}:`, err);
      }
    }
  }
}

export { NanoBananaService };
