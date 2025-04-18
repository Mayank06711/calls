export interface CacheOptions {
  isPublic?: boolean;
  isPrivate?: boolean;
  noCache?: boolean;
  maxAge?: number; // in seconds
  identifier?: string; // Optional custom identifier
}

export type ContentType = "html" | "text" | "both";
