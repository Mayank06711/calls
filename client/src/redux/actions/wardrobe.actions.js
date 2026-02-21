import {
  FETCH_STYLE_PROFILE_REQUEST,
  FETCH_STYLE_PROFILE_SUCCESS,
  FETCH_STYLE_PROFILE_FAILURE,
  UPDATE_STYLE_PROFILE_REQUEST,
  UPDATE_STYLE_PROFILE_SUCCESS,
  UPDATE_STYLE_PROFILE_FAILURE,
  FETCH_PROFILE_OPTIONS_REQUEST,
  FETCH_PROFILE_OPTIONS_SUCCESS,
  FETCH_PROFILE_OPTIONS_FAILURE,
  FETCH_CLOSET_REQUEST,
  FETCH_CLOSET_SUCCESS,
  FETCH_CLOSET_FAILURE,
  ADD_CLOTH_REQUEST,
  ADD_CLOTH_SUCCESS,
  ADD_CLOTH_FAILURE,
  ADD_CLOTH_BATCH_REQUEST,
  ADD_CLOTH_BATCH_SUCCESS,
  ADD_CLOTH_BATCH_FAILURE,
  DELETE_CLOTH_REQUEST,
  DELETE_CLOTH_SUCCESS,
  DELETE_CLOTH_FAILURE,
  FETCH_SUGGESTION_REQUEST,
  FETCH_SUGGESTION_SUCCESS,
  FETCH_SUGGESTION_FAILURE,
  CLEAR_SUGGESTION,
  FETCH_PAIRINGS_REQUEST,
  FETCH_PAIRINGS_SUCCESS,
  FETCH_PAIRINGS_FAILURE,
  FETCH_OUTFITS_REQUEST,
  FETCH_OUTFITS_SUCCESS,
  FETCH_OUTFITS_FAILURE,
  SAVE_OUTFIT_REQUEST,
  SAVE_OUTFIT_SUCCESS,
  SAVE_OUTFIT_FAILURE,
  SET_BUILDER_SLOT,
  CLEAR_BUILDER_SLOT,
  CLEAR_BUILDER,
  SET_BUILDER_AI_SUGGESTIONS,
  SET_BUILDER_META,
  SET_BUILDER_MODE,
  SET_CANVAS_ITEMS,
  UPDATE_CANVAS_ITEM,
  ADD_CANVAS_ITEM,
  REMOVE_CANVAS_ITEM,
  CLEAR_CANVAS,
  DELETE_OUTFIT_REQUEST,
  DELETE_OUTFIT_SUCCESS,
  DELETE_OUTFIT_FAILURE,
  TOGGLE_OUTFIT_FAVORITE_REQUEST,
  TOGGLE_OUTFIT_FAVORITE_SUCCESS,
  TOGGLE_OUTFIT_FAVORITE_FAILURE,
  SET_OUTFIT_FILTERS,
  LOG_WEAR_REQUEST,
  LOG_WEAR_SUCCESS,
  LOG_WEAR_FAILURE,
  FETCH_WEAR_HISTORY_REQUEST,
  FETCH_WEAR_HISTORY_SUCCESS,
  FETCH_WEAR_HISTORY_FAILURE,
  FETCH_WEAR_STATS_REQUEST,
  FETCH_WEAR_STATS_SUCCESS,
  FETCH_WEAR_STATS_FAILURE,
  FETCH_PLANNED_WEARS_REQUEST,
  FETCH_PLANNED_WEARS_SUCCESS,
  FETCH_PLANNED_WEARS_FAILURE,
  MARK_PLANNED_WORN_SUCCESS,
  DELETE_PLANNED_WEAR_SUCCESS,
  FETCH_PRODUCT_CATALOG_REQUEST,
  FETCH_PRODUCT_CATALOG_SUCCESS,
  FETCH_PRODUCT_CATALOG_FAILURE,
  SET_CLOSET_FILTER,
  SET_BUILDER_SLOTS,
  UPDATE_BUILDER_SLOT_ITEM,
  ADD_BUILDER_SLOT,
  REMOVE_BUILDER_SLOT,
  SET_PROCESSING_STATUS,
  SET_PREVIEW_FLATLAY,
  CLEAR_PREVIEW_FLATLAY,
  SET_PROCESSING_ERROR,
  PROCESS_ITEM_REQUEST,
  PROCESS_ITEM_SUCCESS,
  PROCESS_ITEM_FAILURE,
  UPDATE_ITEM_PROCESSING_STATUS,
  FETCH_COLLECTIONS_REQUEST,
  FETCH_COLLECTIONS_SUCCESS,
  FETCH_COLLECTIONS_FAILURE,
  CREATE_COLLECTION_REQUEST,
  CREATE_COLLECTION_SUCCESS,
  CREATE_COLLECTION_FAILURE,
  UPDATE_COLLECTION_REQUEST,
  UPDATE_COLLECTION_SUCCESS,
  UPDATE_COLLECTION_FAILURE,
  DELETE_COLLECTION_REQUEST,
  DELETE_COLLECTION_SUCCESS,
  DELETE_COLLECTION_FAILURE,
  ADD_ITEMS_TO_COLLECTION_SUCCESS,
  REMOVE_ITEMS_FROM_COLLECTION_SUCCESS,
  SET_ACTIVE_COLLECTION,
  SHARE_OUTFIT_SUCCESS,
  FETCH_SAVED_OUTFITS_REQUEST,
  FETCH_SAVED_OUTFITS_SUCCESS,
  FETCH_SAVED_OUTFITS_FAILURE,
  UNSAVE_OUTFIT_SUCCESS,
  ANALYZE_STYLE_DNA_REQUEST,
  ANALYZE_STYLE_DNA_SUCCESS,
  ANALYZE_STYLE_DNA_FAILURE,
  FETCH_STYLE_DNA_REQUEST,
  FETCH_STYLE_DNA_SUCCESS,
  FETCH_STYLE_DNA_FAILURE,
  CLEAR_STYLE_DNA,
} from "../action_creators";

// ─── Style Profile ────────────────────────────────────────────────────────────

export const fetchStyleProfileRequest = () => ({ type: FETCH_STYLE_PROFILE_REQUEST });
export const fetchStyleProfileSuccess = (data) => ({ type: FETCH_STYLE_PROFILE_SUCCESS, payload: data });
export const fetchStyleProfileFailure = (error) => ({ type: FETCH_STYLE_PROFILE_FAILURE, payload: error });

export const updateStyleProfileRequest = () => ({ type: UPDATE_STYLE_PROFILE_REQUEST });
export const updateStyleProfileSuccess = (data) => ({ type: UPDATE_STYLE_PROFILE_SUCCESS, payload: data });
export const updateStyleProfileFailure = (error) => ({ type: UPDATE_STYLE_PROFILE_FAILURE, payload: error });

// ─── Profile Options ──────────────────────────────────────────────────────────

export const fetchProfileOptionsRequest = () => ({ type: FETCH_PROFILE_OPTIONS_REQUEST });
export const fetchProfileOptionsSuccess = (data) => ({ type: FETCH_PROFILE_OPTIONS_SUCCESS, payload: data });
export const fetchProfileOptionsFailure = (error) => ({ type: FETCH_PROFILE_OPTIONS_FAILURE, payload: error });

// ─── Closet ───────────────────────────────────────────────────────────────────

export const fetchClosetRequest = () => ({ type: FETCH_CLOSET_REQUEST });
export const fetchClosetSuccess = (data) => ({ type: FETCH_CLOSET_SUCCESS, payload: data });
export const fetchClosetFailure = (error) => ({ type: FETCH_CLOSET_FAILURE, payload: error });

export const addClothRequest = () => ({ type: ADD_CLOTH_REQUEST });
export const addClothSuccess = (data) => ({ type: ADD_CLOTH_SUCCESS, payload: data });
export const addClothFailure = (error) => ({ type: ADD_CLOTH_FAILURE, payload: error });

export const addClothBatchRequest = () => ({ type: ADD_CLOTH_BATCH_REQUEST });
export const addClothBatchSuccess = (data) => ({ type: ADD_CLOTH_BATCH_SUCCESS, payload: data });
export const addClothBatchFailure = (error) => ({ type: ADD_CLOTH_BATCH_FAILURE, payload: error });

export const deleteClothRequest = () => ({ type: DELETE_CLOTH_REQUEST });
export const deleteClothSuccess = (id) => ({ type: DELETE_CLOTH_SUCCESS, payload: id });
export const deleteClothFailure = (error) => ({ type: DELETE_CLOTH_FAILURE, payload: error });

// ─── Suggestions ──────────────────────────────────────────────────────────────

export const fetchSuggestionRequest = () => ({ type: FETCH_SUGGESTION_REQUEST });
export const fetchSuggestionSuccess = (data) => ({ type: FETCH_SUGGESTION_SUCCESS, payload: data });
export const fetchSuggestionFailure = (error) => ({ type: FETCH_SUGGESTION_FAILURE, payload: error });
export const clearSuggestion = () => ({ type: CLEAR_SUGGESTION });

// ─── Pairings ─────────────────────────────────────────────────────────────────

export const fetchPairingsRequest = () => ({ type: FETCH_PAIRINGS_REQUEST });
export const fetchPairingsSuccess = (data) => ({ type: FETCH_PAIRINGS_SUCCESS, payload: data });
export const fetchPairingsFailure = (error) => ({ type: FETCH_PAIRINGS_FAILURE, payload: error });

// ─── Outfits ──────────────────────────────────────────────────────────────────

export const fetchOutfitsRequest = () => ({ type: FETCH_OUTFITS_REQUEST });
export const fetchOutfitsSuccess = (data) => ({ type: FETCH_OUTFITS_SUCCESS, payload: data });
export const fetchOutfitsFailure = (error) => ({ type: FETCH_OUTFITS_FAILURE, payload: error });

export const saveOutfitRequest = () => ({ type: SAVE_OUTFIT_REQUEST });
export const saveOutfitSuccess = (data) => ({ type: SAVE_OUTFIT_SUCCESS, payload: data });
export const saveOutfitFailure = (error) => ({ type: SAVE_OUTFIT_FAILURE, payload: error });

// ─── Builder ──────────────────────────────────────────────────────────────────

export const setBuilderSlot = (slot, item) => ({ type: SET_BUILDER_SLOT, payload: { slot, item } });
export const clearBuilderSlot = (slot) => ({ type: CLEAR_BUILDER_SLOT, payload: slot });
export const clearBuilder = () => ({ type: CLEAR_BUILDER });
export const setBuilderAiSuggestions = (data) => ({ type: SET_BUILDER_AI_SUGGESTIONS, payload: data });
export const setBuilderMeta = (meta) => ({ type: SET_BUILDER_META, payload: meta });
export const setBuilderMode = (mode) => ({ type: SET_BUILDER_MODE, payload: mode });
export const setCanvasItems = (items) => ({ type: SET_CANVAS_ITEMS, payload: items });
export const updateCanvasItem = (id, updates) => ({ type: UPDATE_CANVAS_ITEM, payload: { id, updates } });
export const addCanvasItem = (item) => ({ type: ADD_CANVAS_ITEM, payload: item });
export const removeCanvasItem = (id) => ({ type: REMOVE_CANVAS_ITEM, payload: id });
export const clearCanvas = () => ({ type: CLEAR_CANVAS });

// Builder Slots (dynamic slot array for slot-mode builder)
export const setBuilderSlots = (slots) => ({ type: SET_BUILDER_SLOTS, payload: slots });
export const updateBuilderSlotItem = (key, item) => ({ type: UPDATE_BUILDER_SLOT_ITEM, payload: { key, item } });
export const addBuilderSlot = (slot) => ({ type: ADD_BUILDER_SLOT, payload: slot });
export const removeBuilderSlot = (key) => ({ type: REMOVE_BUILDER_SLOT, payload: key });

// ─── Outfit CRUD extras ─────────────────────────────────────────────────────

export const deleteOutfitRequest = () => ({ type: DELETE_OUTFIT_REQUEST });
export const deleteOutfitSuccess = (id) => ({ type: DELETE_OUTFIT_SUCCESS, payload: id });
export const deleteOutfitFailure = (error) => ({ type: DELETE_OUTFIT_FAILURE, payload: error });

export const toggleOutfitFavoriteRequest = (id) => ({ type: TOGGLE_OUTFIT_FAVORITE_REQUEST, payload: id });
export const toggleOutfitFavoriteSuccess = (data) => ({ type: TOGGLE_OUTFIT_FAVORITE_SUCCESS, payload: data });
export const toggleOutfitFavoriteFailure = (error) => ({ type: TOGGLE_OUTFIT_FAVORITE_FAILURE, payload: error });

export const setOutfitFilters = (filters) => ({ type: SET_OUTFIT_FILTERS, payload: filters });

// ─── Wear Log ────────────────────────────────────────────────────────────────

export const logWearRequest = () => ({ type: LOG_WEAR_REQUEST });
export const logWearSuccess = (data) => ({ type: LOG_WEAR_SUCCESS, payload: data });
export const logWearFailure = (error) => ({ type: LOG_WEAR_FAILURE, payload: error });

export const fetchWearHistoryRequest = () => ({ type: FETCH_WEAR_HISTORY_REQUEST });
export const fetchWearHistorySuccess = (data) => ({ type: FETCH_WEAR_HISTORY_SUCCESS, payload: data });
export const fetchWearHistoryFailure = (error) => ({ type: FETCH_WEAR_HISTORY_FAILURE, payload: error });

export const fetchWearStatsRequest = () => ({ type: FETCH_WEAR_STATS_REQUEST });
export const fetchWearStatsSuccess = (data) => ({ type: FETCH_WEAR_STATS_SUCCESS, payload: data });
export const fetchWearStatsFailure = (error) => ({ type: FETCH_WEAR_STATS_FAILURE, payload: error });

// ─── Planned Wears ──────────────────────────────────────────────────────────

export const fetchPlannedWearsRequest = () => ({ type: FETCH_PLANNED_WEARS_REQUEST });
export const fetchPlannedWearsSuccess = (data) => ({ type: FETCH_PLANNED_WEARS_SUCCESS, payload: data });
export const fetchPlannedWearsFailure = (error) => ({ type: FETCH_PLANNED_WEARS_FAILURE, payload: error });
export const markPlannedWornSuccess = (id) => ({ type: MARK_PLANNED_WORN_SUCCESS, payload: id });
export const deletePlannedWearSuccess = (id) => ({ type: DELETE_PLANNED_WEAR_SUCCESS, payload: id });

// ─── Product Catalog ─────────────────────────────────────────────────────────

export const fetchProductCatalogRequest = () => ({ type: FETCH_PRODUCT_CATALOG_REQUEST });
export const fetchProductCatalogSuccess = (data) => ({ type: FETCH_PRODUCT_CATALOG_SUCCESS, payload: data });
export const fetchProductCatalogFailure = (error) => ({ type: FETCH_PRODUCT_CATALOG_FAILURE, payload: error });

// ─── Filters ──────────────────────────────────────────────────────────────────

export const setClosetFilter = (filterType, value) => ({ type: SET_CLOSET_FILTER, payload: { filterType, value } });

// ─── Phase 7: Python AI Service Integration ────────────────────────────────────

export const setProcessingStatus = (status) => ({ type: SET_PROCESSING_STATUS, payload: status });
export const setPreviewFlatlay = (data) => ({ type: SET_PREVIEW_FLATLAY, payload: data });
export const clearPreviewFlatlay = () => ({ type: CLEAR_PREVIEW_FLATLAY });
export const setProcessingError = (error) => ({ type: SET_PROCESSING_ERROR, payload: error });

export const processItemRequest = () => ({ type: PROCESS_ITEM_REQUEST });
export const processItemSuccess = (data) => ({ type: PROCESS_ITEM_SUCCESS, payload: data });
export const processItemFailure = (error) => ({ type: PROCESS_ITEM_FAILURE, payload: error });

export const updateItemProcessingStatus = (itemId, status, data) => ({
  type: UPDATE_ITEM_PROCESSING_STATUS,
  payload: { itemId, status, data }
});

// ─── Collections ─────────────────────────────────────────────────────────────

export const fetchCollectionsRequest = () => ({ type: FETCH_COLLECTIONS_REQUEST });
export const fetchCollectionsSuccess = (data) => ({ type: FETCH_COLLECTIONS_SUCCESS, payload: data });
export const fetchCollectionsFailure = (error) => ({ type: FETCH_COLLECTIONS_FAILURE, payload: error });

export const createCollectionRequest = () => ({ type: CREATE_COLLECTION_REQUEST });
export const createCollectionSuccess = (data) => ({ type: CREATE_COLLECTION_SUCCESS, payload: data });
export const createCollectionFailure = (error) => ({ type: CREATE_COLLECTION_FAILURE, payload: error });

export const updateCollectionRequest = () => ({ type: UPDATE_COLLECTION_REQUEST });
export const updateCollectionSuccess = (data) => ({ type: UPDATE_COLLECTION_SUCCESS, payload: data });
export const updateCollectionFailure = (error) => ({ type: UPDATE_COLLECTION_FAILURE, payload: error });

export const deleteCollectionRequest = () => ({ type: DELETE_COLLECTION_REQUEST });
export const deleteCollectionSuccess = (id) => ({ type: DELETE_COLLECTION_SUCCESS, payload: id });
export const deleteCollectionFailure = (error) => ({ type: DELETE_COLLECTION_FAILURE, payload: error });

export const addItemsToCollectionSuccess = (data) => ({ type: ADD_ITEMS_TO_COLLECTION_SUCCESS, payload: data });
export const removeItemsFromCollectionSuccess = (data) => ({ type: REMOVE_ITEMS_FROM_COLLECTION_SUCCESS, payload: data });
export const setActiveCollection = (id) => ({ type: SET_ACTIVE_COLLECTION, payload: id });

// ─── Sharing ─────────────────────────────────────────────────────────────────

export const shareOutfitSuccess = (data) => ({ type: SHARE_OUTFIT_SUCCESS, payload: data });

// ─── Saved Outfits (bookmarks from other users) ──────────────────────────────

export const fetchSavedOutfitsRequest = () => ({ type: FETCH_SAVED_OUTFITS_REQUEST });
export const fetchSavedOutfitsSuccess = (data) => ({ type: FETCH_SAVED_OUTFITS_SUCCESS, payload: data });
export const fetchSavedOutfitsFailure = (error) => ({ type: FETCH_SAVED_OUTFITS_FAILURE, payload: error });
export const unsaveOutfitSuccess = (outfitId) => ({ type: UNSAVE_OUTFIT_SUCCESS, payload: outfitId });

// ─── Style DNA (AI Photo Analysis) ──────────────────────────────────────────

export const analyzeStyleDnaRequest = () => ({ type: ANALYZE_STYLE_DNA_REQUEST });
export const analyzeStyleDnaSuccess = (data) => ({ type: ANALYZE_STYLE_DNA_SUCCESS, payload: data });
export const analyzeStyleDnaFailure = (error) => ({ type: ANALYZE_STYLE_DNA_FAILURE, payload: error });

export const fetchStyleDnaRequest = () => ({ type: FETCH_STYLE_DNA_REQUEST });
export const fetchStyleDnaSuccess = (data) => ({ type: FETCH_STYLE_DNA_SUCCESS, payload: data });
export const fetchStyleDnaFailure = (error) => ({ type: FETCH_STYLE_DNA_FAILURE, payload: error });

export const clearStyleDna = () => ({ type: CLEAR_STYLE_DNA });
