/**
 * Derive a thumbnail URL from a Cloudinary URL by inserting transformation params.
 * Works for any Cloudinary URL format:
 *   https://res.cloudinary.com/<cloud>/image/upload/v123/folder/file.jpg
 *   → https://res.cloudinary.com/<cloud>/image/upload/c_fill,w_400,h_400,q_auto/v123/folder/file.jpg
 *
 * If the URL is not a Cloudinary URL, returns the original URL unchanged.
 */
export function getCloudinaryThumbnail(url, width = 400, height = 400) {
  if (!url || typeof url !== "string") return url;

  // Match Cloudinary upload URLs
  const match = url.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/
  );
  if (!match) return url;

  const [, base, rest] = match;
  return `${base}c_fill,w_${width},h_${height},q_auto/${rest}`;
}
