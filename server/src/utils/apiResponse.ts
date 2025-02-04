import crypto from "crypto";
import { Request, Response } from "express";
import { CacheOptions } from "../types/IGeneral";
import { ApiError } from "./apiError";

const sendCachedResponse = (
  req: Request,
  res: Response,
  data: Record<string, any>,
  message: string = "Success",
  statusCode: number = 200,
  options: CacheOptions = {}
) => {
  const responseData = {
    success: true,
    message,
    data,
  };

  // Generate ETag using identifier or metadata instead of full response
  const etag = generateETag(data, options);

  // Check if client has matching ETag
  if (req.headers["if-none-match"] === etag) {
    return res.status(304).end();
  }

  // Set cache headers based on options
  if (options.noCache) {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });
  } else if (options.isPrivate) {
    res.set({
      "Cache-Control": `private, max-age=${
        options.maxAge || 300
      }, must-revalidate`,
      ETag: etag,
      "Last-Modified": new Date().toUTCString(),
      Vary: "Origin, Authorization",
    });
  } else if (options.isPublic) {
    res.set({
      "Cache-Control": `public, max-age=${options.maxAge || 3600}`,
      ETag: etag,
      "Last-Modified": new Date().toUTCString(),
      Vary: "Origin",
    });
  }

  return res.status(statusCode).json(successResponse(data, message));
};

const generateETag = (
  data: Record<string, any>,
  options: CacheOptions
): string => {
  let metadata: string;

  // Priority 1: MongoDB document metadata
  if (data._id && data.updatedAt) {
    metadata = `${data._id}-${new Date(data.updatedAt).getTime()}`;
  }
  // Priority 2: Custom identifier
  else if (options.identifier) {
    metadata = `${options.identifier}-${Date.now()}`;
  }
  // Priority 3: Generate unique string using timestamp and random values
  else {
    metadata = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
  }

  return `"${crypto
    .createHash("SHA-256")
    .update(metadata)
    .digest("hex")
    .substring(0, 24)}"`;
};

const successResponse = (
  data: Record<string, any>,
  message: string = "Success"
) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: message,
      data: data,
    }),
  };
};

const errorResponse = (error: any, msg: string = "Error") => {
  if (error instanceof ApiError) {
    throw error;
  }
  throw new ApiError(500, msg + error.message);
};

export { errorResponse, successResponse, sendCachedResponse };
