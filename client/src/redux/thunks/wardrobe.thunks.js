import { ENDPOINTS, HTTP_METHODS } from "../../constants/apiEndpoints";
import { makeRequest } from "../../utils/apiHandlers";
import {
  fetchStyleProfileRequest,
  fetchStyleProfileSuccess,
  fetchStyleProfileFailure,
  updateStyleProfileRequest,
  updateStyleProfileSuccess,
  updateStyleProfileFailure,
  fetchProfileOptionsRequest,
  fetchProfileOptionsSuccess,
  fetchProfileOptionsFailure,
  fetchClosetRequest,
  fetchClosetSuccess,
  fetchClosetFailure,
  addClothRequest,
  addClothSuccess,
  addClothFailure,
  addClothBatchRequest,
  addClothBatchSuccess,
  addClothBatchFailure,
  deleteClothRequest,
  deleteClothSuccess,
  deleteClothFailure,
  fetchSuggestionRequest,
  fetchSuggestionSuccess,
  fetchSuggestionFailure,
  fetchPairingsRequest,
  fetchPairingsSuccess,
  fetchPairingsFailure,
  fetchOutfitsRequest,
  fetchOutfitsSuccess,
  fetchOutfitsFailure,
  saveOutfitRequest,
  saveOutfitSuccess,
  saveOutfitFailure,
  deleteOutfitRequest,
  deleteOutfitSuccess,
  deleteOutfitFailure,
  toggleOutfitFavoriteRequest,
  toggleOutfitFavoriteSuccess,
  toggleOutfitFavoriteFailure,
  logWearRequest,
  logWearSuccess,
  logWearFailure,
  fetchWearHistoryRequest,
  fetchWearHistorySuccess,
  fetchWearHistoryFailure,
  fetchWearStatsRequest,
  fetchWearStatsSuccess,
  fetchWearStatsFailure,
  fetchPlannedWearsRequest,
  fetchPlannedWearsSuccess,
  fetchPlannedWearsFailure,
  markPlannedWornSuccess,
  deletePlannedWearSuccess,
  fetchProductCatalogRequest,
  fetchProductCatalogSuccess,
  fetchProductCatalogFailure,
  updateItemProcessingStatus,
  fetchCollectionsRequest,
  fetchCollectionsSuccess,
  fetchCollectionsFailure,
  createCollectionRequest,
  createCollectionSuccess,
  createCollectionFailure,
  updateCollectionRequest,
  updateCollectionSuccess,
  updateCollectionFailure,
  deleteCollectionRequest,
  deleteCollectionSuccess,
  deleteCollectionFailure,
  addItemsToCollectionSuccess,
  removeItemsFromCollectionSuccess,
  shareOutfitSuccess,
  fetchSavedOutfitsRequest,
  fetchSavedOutfitsSuccess,
  fetchSavedOutfitsFailure,
  analyzeStyleDnaRequest,
  analyzeStyleDnaSuccess,
  analyzeStyleDnaFailure,
  fetchStyleDnaRequest,
  fetchStyleDnaSuccess,
  fetchStyleDnaFailure,
} from "../actions/wardrobe.actions";
import { showNotification } from "../actions/notification.actions";

// ─── Style Profile ────────────────────────────────────────────────────────────

export const fetchStyleProfileThunk = () => async (dispatch) => {
  try {
    dispatch(fetchStyleProfileRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.WARDROBE.STYLE_PROFILE
    );
    if (error) {
      // 404 means no profile yet — not a real error
      if (error.statusCode === 404 || error.message?.includes("not found")) {
        dispatch(fetchStyleProfileSuccess(null));
        return { success: true, data: null };
      }
      dispatch(fetchStyleProfileFailure(error.message));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(fetchStyleProfileSuccess(data.data));
      return { success: true, data: data.data };
    }
    // No profile yet — not an error
    dispatch(fetchStyleProfileSuccess(null));
    return { success: true, data: null };
  } catch (error) {
    // 404 from axios rejection also means no profile
    if (error.response?.status === 404 || error.message?.includes("not found")) {
      dispatch(fetchStyleProfileSuccess(null));
      return { success: true, data: null };
    }
    dispatch(fetchStyleProfileFailure(error.message || "Failed to fetch style profile"));
    return { success: false, error: error.message };
  }
};

export const updateStyleProfileThunk = (profileData) => async (dispatch) => {
  try {
    dispatch(updateStyleProfileRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.PUT,
      ENDPOINTS.WARDROBE.STYLE_PROFILE,
      profileData
    );
    if (error) {
      dispatch(updateStyleProfileFailure(error.message));
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(updateStyleProfileSuccess(data.data));
      dispatch(showNotification("Style profile saved", "success"));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(updateStyleProfileFailure(error.message || "Failed to save style profile"));
    dispatch(showNotification("Error saving style profile", "error"));
    return { success: false, error: error.message };
  }
};

// ─── Profile Options ──────────────────────────────────────────────────────────

export const fetchProfileOptionsThunk = () => async (dispatch) => {
  try {
    dispatch(fetchProfileOptionsRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.WARDROBE.PROFILE_OPTIONS
    );
    if (error) {
      dispatch(fetchProfileOptionsFailure(error.message));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(fetchProfileOptionsSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(fetchProfileOptionsFailure(error.message || "Failed to fetch profile options"));
    return { success: false, error: error.message };
  }
};

// ─── Closet ───────────────────────────────────────────────────────────────────

export const fetchClosetThunk = () => async (dispatch) => {
  try {
    dispatch(fetchClosetRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.WARDROBE.CLOTHS
    );
    if (error) {
      dispatch(fetchClosetFailure(error.message));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(fetchClosetSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(fetchClosetFailure(error.message || "Failed to fetch closet items"));
    return { success: false, error: error.message };
  }
};

export const addClothThunk = (clothData) => async (dispatch) => {
  try {
    dispatch(addClothRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.WARDROBE.CLOTHS,
      clothData
    );
    if (error) {
      dispatch(addClothFailure(error.message));
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(addClothSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(addClothFailure(error.message || "Failed to add item"));
    dispatch(showNotification("Error adding item", "error"));
    return { success: false, error: error.message };
  }
};

export const deleteClothThunk = (id) => async (dispatch) => {
  try {
    dispatch(deleteClothRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.DELETE,
      `${ENDPOINTS.WARDROBE.CLOTH_BY_ID}/${id}`
    );
    if (error) {
      dispatch(deleteClothFailure(error.message));
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(deleteClothSuccess(id));
      dispatch(showNotification("Item removed", "success"));
      return { success: true };
    }
  } catch (error) {
    dispatch(deleteClothFailure(error.message || "Failed to delete item"));
    dispatch(showNotification("Error removing item", "error"));
    return { success: false, error: error.message };
  }
};

// ─── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTION_ENDPOINTS = {
  'full-outfit': ENDPOINTS.WARDROBE.SUGGEST_FULL_OUTFIT,
  'from-item': ENDPOINTS.WARDROBE.SUGGEST_FROM_ITEM,
  'top': ENDPOINTS.WARDROBE.SUGGEST_TOP,
  'layer': ENDPOINTS.WARDROBE.SUGGEST_LAYER,
  'footwear': ENDPOINTS.WARDROBE.SUGGEST_FOOTWEAR,
};

export const fetchSuggestionThunk = (flow, payload) => async (dispatch) => {
  try {
    dispatch(fetchSuggestionRequest());
    const endpoint = SUGGESTION_ENDPOINTS[flow];
    if (!endpoint) {
      dispatch(fetchSuggestionFailure(`Unknown suggestion flow: ${flow}`));
      return { success: false, error: `Unknown flow: ${flow}` };
    }
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      endpoint,
      payload
    );
    if (error) {
      dispatch(fetchSuggestionFailure(error.message));
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      if (!data.data) {
        // Server returned success but no suggestion data (e.g. "No exact match found")
        const msg = data.message || "No suggestions found for this combination";
        dispatch(fetchSuggestionFailure(msg));
        dispatch(showNotification(msg, "info"));
        return { success: false, error: msg };
      }
      dispatch(fetchSuggestionSuccess({ result: data.data, flow }));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(fetchSuggestionFailure(error.message || "Failed to get suggestions"));
    dispatch(showNotification("Error getting suggestions", "error"));
    return { success: false, error: error.message };
  }
};

// ─── Pairings ─────────────────────────────────────────────────────────────────

export const generatePairingsThunk = (payload) => async (dispatch) => {
  try {
    dispatch(fetchPairingsRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.WARDROBE.GENERATE_PAIRINGS,
      payload
    );
    if (error) {
      dispatch(fetchPairingsFailure(error.message));
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(fetchPairingsSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(fetchPairingsFailure(error.message || "Failed to generate pairings"));
    dispatch(showNotification("Error generating pairings", "error"));
    return { success: false, error: error.message };
  }
};

// ─── Outfits ──────────────────────────────────────────────────────────────────

export const fetchOutfitsThunk = () => async (dispatch) => {
  try {
    dispatch(fetchOutfitsRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.WARDROBE.OUTFITS
    );
    if (error) {
      dispatch(fetchOutfitsFailure(error.message));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(fetchOutfitsSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(fetchOutfitsFailure(error.message || "Failed to fetch outfits"));
    return { success: false, error: error.message };
  }
};

export const saveOutfitThunk = (outfitData) => async (dispatch) => {
  try {
    dispatch(saveOutfitRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.WARDROBE.OUTFITS,
      outfitData
    );
    if (error) {
      dispatch(saveOutfitFailure(error.message));
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(saveOutfitSuccess(data.data));
      dispatch(showNotification("Outfit saved", "success"));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(saveOutfitFailure(error.message || "Failed to save outfit"));
    dispatch(showNotification("Error saving outfit", "error"));
    return { success: false, error: error.message };
  }
};

// ─── Batch Operations ─────────────────────────────────────────────────────

export const generateBatchUploadUrlsThunk = (files) => async () => {
  try {
    console.log("─────────────────*****─────────────────");
    console.log("[BatchUploadThunk] Requesting upload URLs for", files.length, "files");
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.WARDROBE.GENERATE_UPLOAD_URLS,
      { files }
    );
    console.log("[BatchUploadThunk] Response → data:", data, "| error:", error);
    if (error) {
      console.error("[BatchUploadThunk] Server error:", error.message);
      console.log("─────────────────*****─────────────────");
      return { success: false, error: error.message };
    }
    if (data?.success) {
      console.log("[BatchUploadThunk] Got", data.urls?.length, "upload URLs");
      console.log("─────────────────*****─────────────────");
      return { success: true, urls: data.urls };
    }
    console.error("[BatchUploadThunk] Unexpected response:", data);
    console.log("─────────────────*****─────────────────");
    return { success: false, error: "Unexpected response" };
  } catch (error) {
    console.error("[BatchUploadThunk] Exception:", error);
    console.log("─────────────────*****─────────────────");
    return { success: false, error: error.message || "Failed to generate batch upload URLs" };
  }
};

export const addClothBatchThunk = (items) => async (dispatch) => {
  try {
    dispatch(addClothBatchRequest());
    console.log("─────────────────*****─────────────────");
    console.log("[AddClothBatchThunk] Saving", items.length, "items");
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.WARDROBE.CLOTHS_BATCH,
      { items }
    );
    console.log("[AddClothBatchThunk] Response → data:", data, "| error:", error);
    if (error) {
      dispatch(addClothBatchFailure(error.message));
      console.log("─────────────────*****─────────────────");
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(addClothBatchSuccess(data.data));
      console.log("[AddClothBatchThunk] Saved", data.data?.length, "items");
      console.log("─────────────────*****─────────────────");
      return { success: true, data: data.data };
    }
    dispatch(addClothBatchFailure("Unexpected response"));
    console.log("─────────────────*****─────────────────");
    return { success: false, error: "Unexpected response" };
  } catch (error) {
    dispatch(addClothBatchFailure(error.message || "Failed to save items"));
    console.log("─────────────────*****─────────────────");
    return { success: false, error: error.message };
  }
};

// ─── Upload URL ───────────────────────────────────────────────────────────────

export const deleteOutfitThunk = (outfitId) => async (dispatch) => {
  try {
    dispatch(deleteOutfitRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.DELETE,
      `${ENDPOINTS.WARDROBE.OUTFIT_BY_ID}/${outfitId}`
    );
    if (error) {
      dispatch(deleteOutfitFailure(error.message));
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(deleteOutfitSuccess(outfitId));
      dispatch(showNotification("Outfit deleted", "success"));
      return { success: true };
    }
  } catch (error) {
    dispatch(deleteOutfitFailure(error.message || "Failed to delete outfit"));
    dispatch(showNotification("Error deleting outfit", "error"));
    return { success: false, error: error.message };
  }
};

export const toggleOutfitFavoriteThunk = (outfitId) => async (dispatch) => {
  try {
    dispatch(toggleOutfitFavoriteRequest(outfitId));
    const { data, error } = await makeRequest(
      HTTP_METHODS.PATCH,
      `${ENDPOINTS.WARDROBE.OUTFIT_BY_ID}/${outfitId}/favorite`,
      {}
    );
    if (error) {
      dispatch(toggleOutfitFavoriteFailure(error.message));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(toggleOutfitFavoriteSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(toggleOutfitFavoriteFailure(error.message || "Failed to toggle favorite"));
    return { success: false, error: error.message };
  }
};

// ─── Wear Log ────────────────────────────────────────────────────────────────

export const logWearThunk = (wearData) => async (dispatch) => {
  try {
    dispatch(logWearRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.WARDROBE.WEAR_LOG,
      wearData
    );
    if (error) {
      dispatch(logWearFailure(error.message));
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(logWearSuccess(data.data));
      dispatch(showNotification("Outfit logged", "success"));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(logWearFailure(error.message || "Failed to log wear"));
    dispatch(showNotification("Error logging outfit", "error"));
    return { success: false, error: error.message };
  }
};

export const fetchWearHistoryThunk = (params = {}) => async (dispatch) => {
  try {
    dispatch(fetchWearHistoryRequest());
    const query = new URLSearchParams(params).toString();
    const url = query ? `${ENDPOINTS.WARDROBE.WEAR_LOG}?${query}` : ENDPOINTS.WARDROBE.WEAR_LOG;
    const { data, error } = await makeRequest(HTTP_METHODS.GET, url);
    if (error) {
      dispatch(fetchWearHistoryFailure(error.message));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(fetchWearHistorySuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(fetchWearHistoryFailure(error.message || "Failed to fetch wear history"));
    return { success: false, error: error.message };
  }
};

export const fetchWearStatsThunk = () => async (dispatch) => {
  try {
    dispatch(fetchWearStatsRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.WARDROBE.WEAR_STATS
    );
    if (error) {
      dispatch(fetchWearStatsFailure(error.message));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(fetchWearStatsSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(fetchWearStatsFailure(error.message || "Failed to fetch wear stats"));
    return { success: false, error: error.message };
  }
};

// ─── Planned Wears ──────────────────────────────────────────────────────────

export const fetchPlannedWearsThunk = () => async (dispatch) => {
  try {
    dispatch(fetchPlannedWearsRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.WARDROBE.PLANNED_WEARS
    );
    if (error) {
      dispatch(fetchPlannedWearsFailure(error.message));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(fetchPlannedWearsSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(fetchPlannedWearsFailure(error.message || "Failed to fetch planned wears"));
    return { success: false, error: error.message };
  }
};

export const markPlannedAsWornThunk = (id) => async (dispatch) => {
  try {
    const { data, error } = await makeRequest(
      HTTP_METHODS.PATCH,
      `${ENDPOINTS.WARDROBE.PLANNED_WEARS}/${id}/worn`
    );
    if (error) {
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(markPlannedWornSuccess(id));
      dispatch(showNotification("Marked as worn!", "success"));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(showNotification("Error marking as worn", "error"));
    return { success: false, error: error.message };
  }
};

export const deletePlannedWearThunk = (id) => async (dispatch) => {
  try {
    const { data, error } = await makeRequest(
      HTTP_METHODS.DELETE,
      `${ENDPOINTS.WARDROBE.PLANNED_WEARS}/${id}`
    );
    if (error) {
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(deletePlannedWearSuccess(id));
      dispatch(showNotification("Plan removed", "success"));
      return { success: true };
    }
  } catch (error) {
    dispatch(showNotification("Error removing plan", "error"));
    return { success: false, error: error.message };
  }
};

// ─── Product Catalog ─────────────────────────────────────────────────────────

export const fetchProductCatalogThunk = (params = {}) => async (dispatch) => {
  try {
    dispatch(fetchProductCatalogRequest());
    const query = new URLSearchParams(params).toString();
    const url = query ? `${ENDPOINTS.WARDROBE.PRODUCT_CATALOG}?${query}` : ENDPOINTS.WARDROBE.PRODUCT_CATALOG;
    const { data, error } = await makeRequest(HTTP_METHODS.GET, url);
    if (error) {
      dispatch(fetchProductCatalogFailure(error.message));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(fetchProductCatalogSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(fetchProductCatalogFailure(error.message || "Failed to fetch product catalog"));
    return { success: false, error: error.message };
  }
};

// ─── Upload URL ───────────────────────────────────────────────────────────────

export const generateUploadUrlThunk = (fileInfo) => async () => {
  try {
    console.log("─────────────────*****─────────────────");
    console.log("[UploadThunk] Requesting upload URL for:", fileInfo);
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.WARDROBE.GENERATE_UPLOAD_URL,
      fileInfo
    );
    console.log("[UploadThunk] Raw response → data:", data, "| error:", error);
    if (error) {
      console.error("[UploadThunk] Server returned error:", error.message);
      console.log("─────────────────*****─────────────────");
      return { success: false, error: error.message };
    }
    // Server returns { success, provider, uploadUrl, uploadParams, ... } directly (no nested data wrapper)
    if (data?.success) {
      console.log("[UploadThunk] Got upload URL | provider:", data.provider, "| uploadUrl:", data.uploadUrl);
      console.log("─────────────────*****─────────────────");
      return { success: true, data };
    }
    console.error("[UploadThunk] Unexpected response shape:", data);
    console.log("─────────────────*****─────────────────");
    return { success: false, error: "Unexpected response" };
  } catch (error) {
    console.error("[UploadThunk] Exception:", error);
    console.log("─────────────────*****─────────────────");
    return { success: false, error: error.message || "Failed to generate upload URL" };
  }
};

// ─── Python AI Service ────────────────────────────────────────────────────────

/**
 * Process a clothing item: removes background, extracts colors, uploads nobg image.
 * Dispatches updateItemProcessingStatus to merge results into the closet item in Redux.
 */
export const processItemThunk = (itemData) => async (dispatch) => {
  try {
    dispatch(updateItemProcessingStatus(itemData.itemId, "processing", {}));
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.WARDROBE.PROCESS_ITEM,
      itemData
    );
    if (error) {
      dispatch(updateItemProcessingStatus(itemData.itemId, "failed", {}));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(updateItemProcessingStatus(itemData.itemId, "completed", data.data));
      return { success: true, data: data.data };
    }
    dispatch(updateItemProcessingStatus(itemData.itemId, "failed", {}));
    return { success: false, error: "Unexpected response" };
  } catch (error) {
    dispatch(updateItemProcessingStatus(itemData.itemId, "failed", {}));
    return { success: false, error: error.message || "Failed to process item" };
  }
};

/**
 * Generate a flat-lay image from multiple clothing items.
 * Expects { items: [{ itemId, nobgUrl, itemType, dominantColors }], canvasSize? }
 * Returns { flatlayUrl, colorPalette } — caller uses the URL (e.g., for saving).
 */
export const generateFlatlayThunk = (payload) => async () => {
  try {
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.WARDROBE.GENERATE_FLATLAY,
      payload
    );
    if (error) return { success: false, error: error.message };
    if (data?.success) return { success: true, data: data.data };
    return { success: false, error: "Unexpected response" };
  } catch (error) {
    return { success: false, error: error.message || "Failed to generate flat-lay" };
  }
};

// ─── Collections ─────────────────────────────────────────────────────────────

export const fetchCollectionsThunk = () => async (dispatch) => {
  try {
    dispatch(fetchCollectionsRequest());
    const { data, error } = await makeRequest(HTTP_METHODS.GET, ENDPOINTS.WARDROBE.COLLECTIONS);
    if (error) {
      dispatch(fetchCollectionsFailure(error.message));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(fetchCollectionsSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(fetchCollectionsFailure(error.message || "Failed to fetch collections"));
    return { success: false, error: error.message };
  }
};

export const createCollectionThunk = (collectionData) => async (dispatch) => {
  try {
    dispatch(createCollectionRequest());
    const { data, error } = await makeRequest(HTTP_METHODS.POST, ENDPOINTS.WARDROBE.COLLECTIONS, collectionData);
    if (error) {
      dispatch(createCollectionFailure(error.message));
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(createCollectionSuccess(data.data));
      dispatch(showNotification("Collection created", "success"));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(createCollectionFailure(error.message || "Failed to create collection"));
    dispatch(showNotification("Error creating collection", "error"));
    return { success: false, error: error.message };
  }
};

export const updateCollectionThunk = (id, updates) => async (dispatch) => {
  try {
    dispatch(updateCollectionRequest());
    const { data, error } = await makeRequest(HTTP_METHODS.PUT, `${ENDPOINTS.WARDROBE.COLLECTIONS}/${id}`, updates);
    if (error) {
      dispatch(updateCollectionFailure(error.message));
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(updateCollectionSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(updateCollectionFailure(error.message || "Failed to update collection"));
    return { success: false, error: error.message };
  }
};

export const deleteCollectionThunk = (id) => async (dispatch) => {
  try {
    dispatch(deleteCollectionRequest());
    const { data, error } = await makeRequest(HTTP_METHODS.DELETE, `${ENDPOINTS.WARDROBE.COLLECTIONS}/${id}`);
    if (error) {
      dispatch(deleteCollectionFailure(error.message));
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(deleteCollectionSuccess(id));
      dispatch(showNotification("Collection deleted", "success"));
      return { success: true };
    }
  } catch (error) {
    dispatch(deleteCollectionFailure(error.message || "Failed to delete collection"));
    dispatch(showNotification("Error deleting collection", "error"));
    return { success: false, error: error.message };
  }
};

export const addItemsToCollectionThunk = (collectionId, itemIds) => async (dispatch) => {
  try {
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.WARDROBE.COLLECTIONS}/${collectionId}/items`,
      { itemIds }
    );
    if (error) {
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(addItemsToCollectionSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(showNotification("Error adding items", "error"));
    return { success: false, error: error.message };
  }
};

export const removeItemsFromCollectionThunk = (collectionId, itemIds) => async (dispatch) => {
  try {
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.WARDROBE.COLLECTIONS}/${collectionId}/items/remove`,
      { itemIds }
    );
    if (error) {
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(removeItemsFromCollectionSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(showNotification("Error removing items", "error"));
    return { success: false, error: error.message };
  }
};

// ─── Sharing ────────────────────────────────────────────────────────────────

export const shareOutfitThunk = (outfitId) => async (dispatch) => {
  try {
    const { data, error } = await makeRequest(
      HTTP_METHODS.PATCH,
      `${ENDPOINTS.WARDROBE.OUTFIT_BY_ID}/${outfitId}/share`
    );
    if (error) {
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(shareOutfitSuccess({ outfitId, ...data.data }));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(showNotification("Error generating share link", "error"));
    return { success: false, error: error.message };
  }
};

export const sendOutfitThunk = (outfitId, recipientUsername) => async (dispatch) => {
  try {
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.WARDROBE.OUTFIT_BY_ID}/${outfitId}/send`,
      { recipientUsername }
    );
    if (error) {
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(showNotification("Outfit sent!", "success"));
      return { success: true };
    }
  } catch (error) {
    dispatch(showNotification("Error sending outfit", "error"));
    return { success: false, error: error.message };
  }
};

export const fetchSharedOutfitThunk = (shareToken) => async () => {
  try {
    const { data, error } = await makeRequest(
      HTTP_METHODS.GET,
      `${ENDPOINTS.WARDROBE.SHARED_OUTFIT}/${shareToken}`
    );
    if (error) return { success: false, error: error.message };
    if (data?.success) return { success: true, data: data.data };
    return { success: false, error: "Not found" };
  } catch (error) {
    return { success: false, error: error.message || "Failed to load outfit" };
  }
};

export const likeSharedOutfitThunk = (shareToken) => async () => {
  try {
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.WARDROBE.LIKE_SHARED_OUTFIT}/${shareToken}/like`
    );
    if (error) return { success: false, error: error.message };
    if (data?.success) return { success: true, data: data.data };
    return { success: false, error: "Failed" };
  } catch (error) {
    return { success: false, error: error.message || "Failed to like outfit" };
  }
};

export const saveSharedOutfitThunk = (shareToken) => async () => {
  try {
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.WARDROBE.SAVE_SHARED_OUTFIT}/${shareToken}/save`
    );
    if (error) return { success: false, error: error.message };
    if (data?.success) return { success: true, data: data.data };
    return { success: false, error: "Failed" };
  } catch (error) {
    return { success: false, error: error.message || "Failed to save outfit" };
  }
};

export const fetchSavedOutfitsThunk = () => async (dispatch) => {
  try {
    dispatch(fetchSavedOutfitsRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.WARDROBE.SAVED_OUTFITS
    );
    if (error) {
      dispatch(fetchSavedOutfitsFailure(error.message));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(fetchSavedOutfitsSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(fetchSavedOutfitsFailure(error.message || "Failed to fetch saved outfits"));
    return { success: false, error: error.message };
  }
};

// ─── Style DNA (AI Photo Analysis) ──────────────────────────────────────────

/**
 * Analyze photo via Style DNA pipeline.
 * @param {string} [imageUrl] - Optional Cloudinary URL of an uploaded photo. If omitted, uses profile photo.
 * Returns { success, data } on analysis, { success, skipped } if no face / multiple people.
 */
export const analyzeStyleDnaThunk = (imageUrl) => async (dispatch) => {
  try {
    dispatch(analyzeStyleDnaRequest());
    const payload = imageUrl ? { imageUrl } : undefined;
    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.WARDROBE.STYLE_DNA_ANALYZE,
      payload
    );
    if (error) {
      dispatch(analyzeStyleDnaFailure(error.message));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      // No face detected → server skipped silently
      if (data.skipped) {
        dispatch(analyzeStyleDnaSuccess(null));
        return { success: true, skipped: true, reason: data.reason };
      }
      dispatch(analyzeStyleDnaSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    dispatch(analyzeStyleDnaFailure(error.message || "Style DNA analysis failed"));
    return { success: false, error: error.message };
  }
};

/**
 * Fetch existing Style DNA analysis. 404 = null (not an error).
 */
export const fetchStyleDnaThunk = () => async (dispatch) => {
  try {
    dispatch(fetchStyleDnaRequest());
    const { data, error } = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.WARDROBE.STYLE_DNA
    );
    if (error) {
      if (error.statusCode === 404 || error.message?.includes("not found")) {
        dispatch(fetchStyleDnaSuccess(null));
        return { success: true, data: null };
      }
      dispatch(fetchStyleDnaFailure(error.message));
      return { success: false, error: error.message };
    }
    if (data?.success) {
      dispatch(fetchStyleDnaSuccess(data.data));
      return { success: true, data: data.data };
    }
    dispatch(fetchStyleDnaSuccess(null));
    return { success: true, data: null };
  } catch (error) {
    if (error.response?.status === 404 || error.message?.includes("not found")) {
      dispatch(fetchStyleDnaSuccess(null));
      return { success: true, data: null };
    }
    dispatch(fetchStyleDnaFailure(error.message || "Failed to fetch Style DNA"));
    return { success: false, error: error.message };
  }
};

/**
 * Record which auto-fill values were applied to StyleProfile.
 * Fire-and-forget — no Redux state changes needed.
 */
export const markAutoFillAppliedThunk = (autoFilledValues) => async () => {
  try {
    await makeRequest(
      HTTP_METHODS.PATCH,
      ENDPOINTS.WARDROBE.STYLE_DNA_AUTO_FILL,
      { autoFilledValues }
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
