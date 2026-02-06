import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Close, ChevronLeft, ChevronRight, ExpandMore } from "@mui/icons-material";
import { CircularProgress, IconButton } from "@mui/material";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
import { CustomSelect } from "../shared/OccasionSeasonPicker";
import {
  generateBatchUploadUrlsThunk,
  addClothBatchThunk,
  processItemThunk,
} from "../../../../../redux/thunks/wardrobe.thunks";
import { showNotification } from "../../../../../redux/actions/notification.actions";
import { getCloudinaryThumbnail } from "../../../../../utils/cloudinaryUtils";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const PENDING_KEY = "wardrobe_pending_uploads";

const CATEGORIES = [
  { label: "Top", value: "Top" },
  { label: "Bottom", value: "Bottom" },
  { label: "Layer / Outerwear", value: "Outerwear" },
  { label: "Footwear", value: "Shoes" },
  { label: "Accessory", value: "Accessory" },
];

const SUBCATEGORY_OPTIONS = {
  Top: ["Polo T-Shirt", "Round Neck T-Shirt", "Henley T-Shirt", "Formal Shirt", "Casual Shirt", "Denim Shirt", "Linen Shirt", "Kurta", "Tank Top", "Sweatshirt", "Hoodie"],
  Bottom: ["Chinos", "Jeans", "Trousers", "Joggers", "Shorts", "Formal Pants", "Cargo Pants", "Dhoti Pants", "Track Pants"],
  Outerwear: ["Blazer", "Jacket", "Cardigan", "Bomber Jacket", "Denim Jacket", "Vest", "Windbreaker", "Overcoat", "Shawl"],
  Shoes: ["Sneakers", "Loafers", "Oxford Shoes", "Boots", "Sandals", "Slip-Ons", "Canvas Shoes", "Formal Shoes", "Sports Shoes"],
  Accessory: ["Watch", "Belt", "Sunglasses", "Bracelet", "Scarf", "Tie", "Pocket Square", "Cap"],
};

const PATTERN_OPTIONS = ["Solid", "Striped", "Checked", "Floral", "Embroidered", "Polka Dot", "Abstract", "Printed"];
const FABRIC_OPTIONS = ["Cotton", "Silk", "Linen", "Denim", "Wool", "Polyester", "Chiffon", "Velvet", "Satin", "Leather", "Georgette", "Crepe", "Khadi", "Other"];
const SEASON_OPTIONS = ["Summer", "Winter", "Monsoon", "All"];
const OCCASION_OPTIONS = ["Wedding", "Office", "Casual", "Party", "Travel", "Festive", "Date Night", "Sports", "Lounge"];

// Upload a single file to S3 or Cloudinary based on server response
async function uploadFile(file, uploadData) {
  const { provider, uploadUrl, uploadParams, presignedUrl, fileUrl } = uploadData;

  console.log("─────────────────*****─────────────────");
  console.log("[uploadFile] Provider:", provider, "| File:", file.name, file.size, "bytes");

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
    const resultUrl = json.secure_url || json.url;
    console.log("[uploadFile] Cloudinary →", resultUrl);
    console.log("─────────────────*****─────────────────");
    return resultUrl;
  }

  // S3 presigned PUT
  const url = presignedUrl || uploadUrl;
  await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  const resultUrl = fileUrl || url.split("?")[0];
  console.log("[uploadFile] S3 →", resultUrl);
  console.log("─────────────────*****─────────────────");
  return resultUrl;
}

// localStorage helpers for recovery
function savePending(items) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(items));
  } catch (_) { /* quota exceeded — ignore */ }
}
function loadPending() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}
function clearPending() {
  try { localStorage.removeItem(PENDING_KEY); } catch (_) { /* ignore */ }
}

function AddItemModal({ onClose, preloadedImage = null }) {
  const colors = useSubscriptionColors();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const adding = useSelector((state) => state.wardrobe.closet.adding);

  const emptyMeta = { type: "", subcategory: "", color: "", brand: "", pattern: "", fabric: "", season: "All", occasions: [], notes: "", hasPersonInPhoto: true };

  const [items, setItems] = useState(() => {
    if (preloadedImage) {
      return [{
        file: preloadedImage,
        preview: URL.createObjectURL(preloadedImage),
        ...emptyMeta,
      }];
    }
    return [];
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(""); // status text during upload
  const [pendingRecovery, setPendingRecovery] = useState(null);
  const [showMore, setShowMore] = useState(false);

  // On mount, check for pending uploads from a failed previous session
  useEffect(() => {
    const pending = loadPending();
    if (pending && pending.length > 0) {
      setPendingRecovery(pending);
    }
  }, []);

  const current = items[currentIdx];

  // Validate and add files
  const handleImageSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Validate each file
    const valid = [];
    let rejected = 0;

    for (const file of selectedFiles) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        rejected++;
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected++;
        dispatch(showNotification(`${file.name} exceeds 5MB limit`, "error"));
        continue;
      }
      valid.push(file);
    }

    if (rejected > 0 && valid.length === 0) {
      dispatch(showNotification("Only JPEG, PNG, WebP, GIF images under 5MB allowed", "error"));
      return;
    }
    if (rejected > 0) {
      dispatch(showNotification(`${rejected} file(s) rejected (wrong type or too large)`, "warning"));
    }

    // Enforce max 10 total
    const remaining = MAX_FILES - items.length;
    if (remaining <= 0) {
      dispatch(showNotification(`Maximum ${MAX_FILES} images allowed`, "warning"));
      return;
    }
    const toAdd = valid.slice(0, remaining);
    if (valid.length > remaining) {
      dispatch(showNotification(`Only ${remaining} more image(s) can be added (max ${MAX_FILES})`, "warning"));
    }

    const newItems = toAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      ...emptyMeta,
    }));

    setItems((prev) => {
      const merged = [...prev, ...newItems];
      if (prev.length === 0) setCurrentIdx(0);
      return merged;
    });

    // Reset input so same files can be re-selected
    e.target.value = "";
  };

  const handleChange = (key, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[currentIdx] = { ...updated[currentIdx], [key]: value };
      if (key === "type") updated[currentIdx].subcategory = "";
      return updated;
    });
  };

  const toggleOccasion = (occasion) => {
    setItems((prev) => {
      const updated = [...prev];
      const cur = updated[currentIdx];
      const list = cur.occasions || [];
      updated[currentIdx] = {
        ...cur,
        occasions: list.includes(occasion) ? list.filter((o) => o !== occasion) : [...list, occasion],
      };
      return updated;
    });
  };

  const removeCurrentImage = () => {
    setItems((prev) => prev.filter((_, i) => i !== currentIdx));
    setCurrentIdx((prev) => Math.max(0, Math.min(prev, items.length - 2)));
  };

  // Recover pending uploads from localStorage
  const handleRecoverPending = () => {
    if (!pendingRecovery) return;
    // These items already have photoUrl/thumbnailUrl — go straight to batch save
    handleBatchSave(pendingRecovery);
    setPendingRecovery(null);
  };

  const dismissRecovery = () => {
    clearPending();
    setPendingRecovery(null);
  };

  // Batch save items to server
  const handleBatchSave = async (itemsToSave) => {
    setUploadProgress("Saving to closet...");
    const result = await dispatch(addClothBatchThunk(itemsToSave));
    if (result?.success) {
      clearPending();
      dispatch(showNotification(`${itemsToSave.length} item${itemsToSave.length > 1 ? "s" : ""} added to closet`, "success"));

      // Fire-and-forget: trigger AI processing (bg removal + color extraction) for each saved item
      if (result.data) {
        for (const savedItem of result.data) {
          dispatch(processItemThunk({
            itemId: savedItem._id,
            photoUrl: savedItem.photoUrl,
            itemType: savedItem.type,
            hasPersonInPhoto: savedItem.hasPersonInPhoto || false,
          }));
        }
      }

      onClose();
    } else {
      dispatch(showNotification(result?.error || "Failed to save items", "error"));
    }
    setUploading(false);
    setUploadProgress("");
  };

  const handleSubmit = async () => {
    // Validate all items have required fields
    const invalid = items.filter((item) => !item.type || !item.subcategory || !item.file);
    if (invalid.length > 0) {
      dispatch(showNotification("Each item needs a photo, category, and subcategory", "error"));
      return;
    }

    setUploading(true);

    // Step 1: Get all upload URLs in one batch request
    setUploadProgress("Getting upload URLs...");
    const files = items.map((item) => ({
      fileName: item.file.name,
      contentType: item.file.type,
    }));

    const urlResult = await dispatch(generateBatchUploadUrlsThunk(files));
    if (!urlResult?.success || !urlResult.urls) {
      dispatch(showNotification(urlResult?.error || "Failed to get upload URLs", "error"));
      setUploading(false);
      setUploadProgress("");
      return;
    }

    // Step 2: Upload all files concurrently with Promise.all
    setUploadProgress("Uploading photos...");
    const uploadResults = await Promise.all(
      items.map(async (item, i) => {
        const uploadData = urlResult.urls[i];
        if (!uploadData?.success) {
          return { index: i, photoUrl: null, error: "No upload URL" };
        }
        try {
          const photoUrl = await uploadFile(item.file, uploadData);
          const thumbnailUrl = getCloudinaryThumbnail(photoUrl);
          return { index: i, photoUrl, thumbnailUrl };
        } catch (err) {
          console.error(`[AddItem] Upload failed for item ${i + 1}:`, err);
          return { index: i, photoUrl: null, error: err.message };
        }
      })
    );

    // Check which uploads succeeded
    const successfulUploads = uploadResults.filter((r) => r.photoUrl);
    const failedCount = uploadResults.length - successfulUploads.length;

    if (successfulUploads.length === 0) {
      dispatch(showNotification("All uploads failed", "error"));
      setUploading(false);
      setUploadProgress("");
      return;
    }

    if (failedCount > 0) {
      dispatch(showNotification(`${failedCount} upload(s) failed, saving ${successfulUploads.length} items`, "warning"));
    }

    // Step 3: Build items payload and save to localStorage for recovery
    const itemsToSave = successfulUploads.map((upload) => {
      const item = items[upload.index];
      const payload = {
        type: item.type,
        subcategory: item.subcategory,
        photoUrl: upload.photoUrl,
        thumbnailUrl: upload.thumbnailUrl || undefined,
        color: item.color || undefined,
        brand: item.brand || undefined,
        hasPersonInPhoto: item.hasPersonInPhoto || false,
      };
      if (item.pattern) payload.pattern = item.pattern;
      if (item.fabric) payload.fabric = item.fabric;
      if (item.season && item.season !== "All") payload.season = item.season;
      if (item.occasions?.length > 0) payload.occasions = item.occasions;
      if (item.notes?.trim()) payload.notes = item.notes.trim();
      return payload;
    });

    // Save to localStorage in case batch save fails
    savePending(itemsToSave);

    // Step 4: Batch save to server
    await handleBatchSave(itemsToSave);
  };

  const subcategoryList = current ? (SUBCATEGORY_OPTIONS[current.type] || []) : [];
  const allValid = items.length > 0 && items.every((item) => item.type && item.subcategory && item.file);

  const selectClass =
    "w-full px-3 py-2 rounded-lg border text-sm dark:bg-dark-primary bg-light-secondary dark:text-dark-text text-light-text focus:outline-none transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl dark:bg-dark-primary bg-white border p-5 mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ borderColor: `${colors.fourth}30` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold dark:text-dark-text text-light-text">
            Add Clothing {items.length > 1 ? `Items (${items.length}/${MAX_FILES})` : "Item"}
          </h3>
          <IconButton onClick={onClose} size="small">
            <Close style={{ color: colors.fourth }} />
          </IconButton>
        </div>

        {/* Recovery banner */}
        {pendingRecovery && !uploading && (
          <div
            className="rounded-lg border p-3 mb-4 text-xs"
            style={{ borderColor: `${colors.fourth}60`, backgroundColor: `${colors.fourth}10` }}
          >
            <p className="font-medium dark:text-dark-text text-light-text mb-1.5">
              {pendingRecovery.length} item(s) from a previous upload weren't saved
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleRecoverPending}
                className="px-3 py-1 rounded text-white text-[11px] font-medium"
                style={{ backgroundColor: colors.fourth }}
              >
                Resume & Save
              </button>
              <button
                onClick={dismissRecovery}
                className="px-3 py-1 rounded text-[11px] font-medium dark:text-dark-text/60 text-light-text/60 border"
                style={{ borderColor: `${colors.fourth}30` }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Image area */}
        {items.length === 0 ? (
          <div
            className="rounded-xl border-2 border-dashed p-6 mb-4 text-center cursor-pointer transition-all hover:opacity-80"
            style={{ borderColor: `${colors.fourth}30` }}
            onClick={() => fileInputRef.current?.click()}
          >
            <p className="text-sm dark:text-dark-text/40 text-light-text/40 mb-1">
              Click to select photos
            </p>
            <p className="text-[10px] dark:text-dark-text/30 text-light-text/30">
              Up to {MAX_FILES} images (JPEG, PNG, WebP, GIF &middot; max 5MB each)
            </p>
          </div>
        ) : (
          <div className="mb-4">
            {/* Image with navigation */}
            <div className="relative rounded-xl border-2 border-dashed overflow-hidden"
              style={{ borderColor: `${colors.fourth}30` }}
            >
              <img
                src={current.preview}
                alt={`Item ${currentIdx + 1}`}
                className="w-full h-36 object-contain bg-black/5 dark:bg-white/5"
              />

              {/* Page indicator */}
              {items.length > 1 && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/50 text-white">
                  {currentIdx + 1} / {items.length}
                </div>
              )}

              {/* Left arrow */}
              {items.length > 1 && currentIdx > 0 && (
                <button
                  onClick={() => setCurrentIdx((p) => p - 1)}
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
                >
                  <ChevronLeft fontSize="small" />
                </button>
              )}

              {/* Right arrow */}
              {items.length > 1 && currentIdx < items.length - 1 && (
                <button
                  onClick={() => setCurrentIdx((p) => p + 1)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
                >
                  <ChevronRight fontSize="small" />
                </button>
              )}

              {/* Remove / Add more */}
              <div className="absolute bottom-2 right-2 flex gap-1">
                <button
                  onClick={removeCurrentImage}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                >
                  Remove
                </button>
                {items.length < MAX_FILES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-black/40 hover:bg-black/60 text-white transition-colors"
                  >
                    + More
                  </button>
                )}
              </div>
            </div>

            {/* Thumbnail strip */}
            {items.length > 1 && (
              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                {items.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                      i === currentIdx ? "border-opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                    style={{ borderColor: i === currentIdx ? colors.fourth : "transparent" }}
                  >
                    <img src={item.preview} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleImageSelect}
        />

        {/* Form for current item */}
        {current && (
          <>
            {/* Photo type toggle + guidance */}
            <div
              className="flex items-start gap-2.5 mb-3 p-2.5 rounded-lg border"
              style={{ borderColor: `${colors.fourth}20`, backgroundColor: `${colors.fourth}06` }}
            >
              <button
                type="button"
                onClick={() => handleChange("hasPersonInPhoto", !current.hasPersonInPhoto)}
                className="mt-0.5 w-9 h-5 rounded-full flex-shrink-0 relative transition-colors"
                style={{ backgroundColor: current.hasPersonInPhoto ? colors.fourth : "rgba(128,128,128,0.3)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: current.hasPersonInPhoto ? 18 : 2 }}
                />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-medium dark:text-dark-text/80 text-light-text/80 leading-tight">
                  {current.hasPersonInPhoto ? "Person wearing this item" : "Item photo only"}
                </p>
                <p className="text-[10px] dark:text-dark-text/40 text-light-text/40 mt-0.5 leading-relaxed">
                  {current.hasPersonInPhoto
                    ? "We'll use advanced segmentation to extract the clothing"
                    : "Best for flat-lay or product photos without a person"}
                </p>
              </div>
            </div>

            {/* Category */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1 dark:text-dark-text/60 text-light-text/60">
                Category <span className="text-red-400">*</span>
              </label>
              <CustomSelect
                value={current.type}
                onChange={(v) => handleChange("type", v)}
                options={CATEGORIES}
                placeholder="Select category"
                colors={colors}
              />
            </div>

            {/* Subcategory */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1 dark:text-dark-text/60 text-light-text/60">
                Subcategory <span className="text-red-400">*</span>
              </label>
              {subcategoryList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {subcategoryList.map((sub) => {
                    const isSelected = current.subcategory === sub;
                    return (
                      <button
                        key={sub}
                        onClick={() => handleChange("subcategory", sub)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all
                          ${isSelected ? "text-white" : "dark:text-dark-text/70 text-light-text/70"}`}
                        style={{
                          backgroundColor: isSelected ? colors.fourth : "transparent",
                          borderColor: isSelected ? colors.fourth : `${colors.fourth}30`,
                        }}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  value={current.subcategory}
                  onChange={(e) => handleChange("subcategory", e.target.value)}
                  placeholder="e.g. Polo T-Shirt"
                  className={selectClass}
                  style={{ borderColor: `${colors.fourth}40` }}
                />
              )}
            </div>

            {/* Color & Brand */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium mb-1 dark:text-dark-text/60 text-light-text/60">
                  Color
                </label>
                <input
                  value={current.color}
                  onChange={(e) => handleChange("color", e.target.value)}
                  placeholder="e.g. Navy Blue"
                  className={selectClass}
                  style={{ borderColor: `${colors.fourth}40` }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 dark:text-dark-text/60 text-light-text/60">
                  Brand
                </label>
                <input
                  value={current.brand}
                  onChange={(e) => handleChange("brand", e.target.value)}
                  placeholder="Optional"
                  className={selectClass}
                  style={{ borderColor: `${colors.fourth}40` }}
                />
              </div>
            </div>

            {/* More details toggle */}
            <button
              type="button"
              onClick={() => setShowMore((p) => !p)}
              className="flex items-center gap-1 text-xs font-medium mb-3 transition-colors"
              style={{ color: colors.fourth }}
            >
              <ExpandMore
                sx={{ fontSize: 16, transition: "transform 0.2s", transform: showMore ? "rotate(180deg)" : "none" }}
              />
              {showMore ? "Less details" : "More details (pattern, fabric, season...)"}
            </button>

            {showMore && (
              <div className="space-y-3 mb-4">
                {/* Pattern */}
                <div>
                  <label className="block text-xs font-medium mb-1 dark:text-dark-text/60 text-light-text/60">Pattern</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PATTERN_OPTIONS.map((opt) => {
                      const sel = current.pattern === opt;
                      return (
                        <button key={opt} onClick={() => handleChange("pattern", sel ? "" : opt)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${sel ? "text-white" : "dark:text-dark-text/70 text-light-text/70"}`}
                          style={{ backgroundColor: sel ? colors.fourth : "transparent", borderColor: sel ? colors.fourth : `${colors.fourth}30` }}
                        >{opt}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Fabric */}
                <div>
                  <label className="block text-xs font-medium mb-1 dark:text-dark-text/60 text-light-text/60">Fabric</label>
                  <div className="flex flex-wrap gap-1.5">
                    {FABRIC_OPTIONS.map((opt) => {
                      const sel = current.fabric === opt;
                      return (
                        <button key={opt} onClick={() => handleChange("fabric", sel ? "" : opt)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${sel ? "text-white" : "dark:text-dark-text/70 text-light-text/70"}`}
                          style={{ backgroundColor: sel ? colors.fourth : "transparent", borderColor: sel ? colors.fourth : `${colors.fourth}30` }}
                        >{opt}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Season */}
                <div>
                  <label className="block text-xs font-medium mb-1 dark:text-dark-text/60 text-light-text/60">Season</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SEASON_OPTIONS.map((opt) => {
                      const sel = current.season === opt;
                      return (
                        <button key={opt} onClick={() => handleChange("season", opt)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${sel ? "text-white" : "dark:text-dark-text/70 text-light-text/70"}`}
                          style={{ backgroundColor: sel ? colors.fourth : "transparent", borderColor: sel ? colors.fourth : `${colors.fourth}30` }}
                        >{opt}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Occasions (multi-select) */}
                <div>
                  <label className="block text-xs font-medium mb-1 dark:text-dark-text/60 text-light-text/60">
                    Occasions <span className="text-[10px] dark:text-dark-text/40 text-light-text/40">(select multiple)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {OCCASION_OPTIONS.map((opt) => {
                      const sel = (current.occasions || []).includes(opt);
                      return (
                        <button key={opt} onClick={() => toggleOccasion(opt)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${sel ? "text-white" : "dark:text-dark-text/70 text-light-text/70"}`}
                          style={{ backgroundColor: sel ? colors.fourth : "transparent", borderColor: sel ? colors.fourth : `${colors.fourth}30` }}
                        >{opt}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium mb-1 dark:text-dark-text/60 text-light-text/60">
                    Notes <span className="text-[10px] dark:text-dark-text/40 text-light-text/40">(describe this item)</span>
                  </label>
                  <textarea
                    value={current.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="e.g. My favorite summer shirt, goes well with khaki shorts"
                    maxLength={500}
                    rows={2}
                    className={selectClass + " resize-none"}
                    style={{ borderColor: `${colors.fourth}40` }}
                  />
                  <p className="text-[10px] mt-0.5 dark:text-dark-text/30 text-light-text/30 text-right">
                    {(current.notes || "").length}/500
                  </p>
                </div>
              </div>
            )}

            {/* Completion status */}
            {items.length > 1 && (
              <div className="flex gap-1 mb-3">
                {items.map((item, i) => {
                  const filled = item.type && item.subcategory;
                  return (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full transition-colors ${
                        filled ? "bg-green-500" : "dark:bg-dark-text/10 bg-light-text/10"
                      }`}
                      style={i === currentIdx ? { backgroundColor: colors.fourth } : undefined}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium dark:text-dark-text/70 text-light-text/70 border transition-all hover:opacity-80"
            style={{ borderColor: `${colors.fourth}30` }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allValid || adding || uploading || items.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ backgroundColor: colors.fourth }}
          >
            {(adding || uploading) && <CircularProgress size={14} style={{ color: "white" }} />}
            {uploading
              ? uploadProgress
              : items.length > 1
                ? `Add ${items.length} Items`
                : "Add to Closet"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddItemModal;
