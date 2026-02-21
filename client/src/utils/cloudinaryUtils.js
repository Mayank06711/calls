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

/**
 * Upload a single file to S3 or Cloudinary based on the server-provided upload data.
 * @param {File} file - The file to upload
 * @param {Object} uploadData - Server response from generate-upload-url endpoint
 * @returns {string} The uploaded file's URL
 */
export async function uploadFile(file, uploadData) {
  const { provider, uploadUrl, uploadParams, presignedUrl, fileUrl } = uploadData;

  if (provider === "cloudinary") {
    const formData = new FormData();
    formData.append("file", file);
    if (uploadParams) {
      Object.entries(uploadParams).forEach(([key, val]) => {
        formData.append(key, String(val));
      });
    }
    const res = await fetch(uploadUrl, { method: "POST", body: formData });
    const json = await res.json();
    return json.secure_url || json.url;
  }

  // S3 presigned PUT
  const url = presignedUrl || uploadUrl;
  await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  return fileUrl || url.split("?")[0];
}
