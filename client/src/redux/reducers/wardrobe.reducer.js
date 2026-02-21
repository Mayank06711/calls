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
  DELETE_OUTFIT_REQUEST,
  DELETE_OUTFIT_SUCCESS,
  DELETE_OUTFIT_FAILURE,
  TOGGLE_OUTFIT_FAVORITE_REQUEST,
  TOGGLE_OUTFIT_FAVORITE_SUCCESS,
  TOGGLE_OUTFIT_FAVORITE_FAILURE,
  SET_OUTFIT_FILTERS,
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

const initialState = {
  styleProfile: {
    loading: false,
    saving: false,
    error: null,
    data: null,
    hasProfile: false,
  },
  profileOptions: {
    loading: false,
    error: null,
    data: null,
  },
  closet: {
    loading: false,
    error: null,
    items: [],
    totalCount: 0,
    adding: false,
    deleting: null,
    filter: 'All',
  },
  suggestions: {
    loading: false,
    error: null,
    result: null,
    flow: null,
  },
  pairings: {
    loading: false,
    error: null,
    data: [],
    unpaired: [],
    page: 1,
    totalPages: 1,
  },
  outfits: {
    loading: false,
    saving: false,
    deleting: false,
    togglingFavorite: null,
    error: null,
    saved: [],
    savedFromOthers: [],
    filters: { occasion: '', season: '', favorite: false, source: '' },
  },
  builder: {
    mode: 'canvas', // 'canvas' | 'slots'
    top: null,
    bottom: null,
    layer: null,
    footwear: null,
    aiSuggestions: null,
    meta: { name: '', occasion: '', season: '', tags: [], notes: '' },
    canvasItems: [], // [{ id, itemId, x, y, width, height, rotation, zIndex }]
    slots: [
      { key: 'top', type: 'Top', label: 'Top', emoji: '👕', item: null },
      { key: 'bottom', type: 'Bottom', label: 'Bottom', emoji: '👖', item: null },
      { key: 'full_body', type: 'Full Body', label: 'Full Body', emoji: '👗', item: null },
      { key: 'layer', type: 'Outerwear', label: 'Layer', emoji: '🧥', item: null },
      { key: 'footwear', type: 'Shoes', label: 'Shoes', emoji: '👟', item: null },
    ],
    // ─── Phase 7: Python AI Service ────────────────────────────────────
    previewFlatlay: null,        // { url, thumbnailUrl, colorPalette }
    processingStatus: 'idle',    // 'idle' | 'processing' | 'ready' | 'error'
    processingError: null,
  },
  wearLog: {
    loading: false,
    logging: false,
    error: null,
    history: [],
    stats: null,
    page: 1,
    totalPages: 1,
  },
  plannedWears: {
    loading: false,
    error: null,
    items: [],
  },
  productCatalog: {
    loading: false,
    error: null,
    products: [],
  },
  collections: {
    loading: false,
    creating: false,
    error: null,
    list: [],
    activeId: null,
  },
  styleDna: {
    analyzing: false,
    loading: false,
    error: null,
    data: null,
    hasAnalysis: false,
  },
};

const wardrobeReducer = (state = initialState, action) => {
  switch (action.type) {
    // ─── Style Profile ──────────────────────────────────────────────
    case FETCH_STYLE_PROFILE_REQUEST:
      return { ...state, styleProfile: { ...state.styleProfile, loading: true, error: null } };
    case FETCH_STYLE_PROFILE_SUCCESS:
      return {
        ...state,
        styleProfile: {
          ...state.styleProfile,
          loading: false,
          data: action.payload,
          hasProfile: !!action.payload,
        },
      };
    case FETCH_STYLE_PROFILE_FAILURE:
      return { ...state, styleProfile: { ...state.styleProfile, loading: false, error: action.payload } };

    case UPDATE_STYLE_PROFILE_REQUEST:
      return { ...state, styleProfile: { ...state.styleProfile, saving: true, error: null } };
    case UPDATE_STYLE_PROFILE_SUCCESS:
      return {
        ...state,
        styleProfile: {
          ...state.styleProfile,
          saving: false,
          data: action.payload,
          hasProfile: true,
        },
      };
    case UPDATE_STYLE_PROFILE_FAILURE:
      return { ...state, styleProfile: { ...state.styleProfile, saving: false, error: action.payload } };

    // ─── Profile Options ────────────────────────────────────────────
    case FETCH_PROFILE_OPTIONS_REQUEST:
      return { ...state, profileOptions: { ...state.profileOptions, loading: true, error: null } };
    case FETCH_PROFILE_OPTIONS_SUCCESS:
      return { ...state, profileOptions: { ...state.profileOptions, loading: false, data: action.payload } };
    case FETCH_PROFILE_OPTIONS_FAILURE:
      return { ...state, profileOptions: { ...state.profileOptions, loading: false, error: action.payload } };

    // ─── Closet ─────────────────────────────────────────────────────
    case FETCH_CLOSET_REQUEST:
      return { ...state, closet: { ...state.closet, loading: true, error: null } };
    case FETCH_CLOSET_SUCCESS:
      return {
        ...state,
        closet: {
          ...state.closet,
          loading: false,
          items: action.payload.items || action.payload,
          totalCount: action.payload.totalCount || (action.payload.items || action.payload).length,
        },
      };
    case FETCH_CLOSET_FAILURE:
      return { ...state, closet: { ...state.closet, loading: false, error: action.payload } };

    case ADD_CLOTH_REQUEST:
      return { ...state, closet: { ...state.closet, adding: true, error: null } };
    case ADD_CLOTH_SUCCESS:
      return {
        ...state,
        closet: {
          ...state.closet,
          adding: false,
          items: [...state.closet.items, action.payload],
          totalCount: state.closet.totalCount + 1,
        },
      };
    case ADD_CLOTH_FAILURE:
      return { ...state, closet: { ...state.closet, adding: false, error: action.payload } };

    case ADD_CLOTH_BATCH_REQUEST:
      return { ...state, closet: { ...state.closet, adding: true, error: null } };
    case ADD_CLOTH_BATCH_SUCCESS: {
      const newItems = Array.isArray(action.payload) ? action.payload : [];
      return {
        ...state,
        closet: {
          ...state.closet,
          adding: false,
          items: [...state.closet.items, ...newItems],
          totalCount: state.closet.totalCount + newItems.length,
        },
      };
    }
    case ADD_CLOTH_BATCH_FAILURE:
      return { ...state, closet: { ...state.closet, adding: false, error: action.payload } };

    case DELETE_CLOTH_REQUEST:
      return { ...state, closet: { ...state.closet, deleting: action.payload, error: null } };
    case DELETE_CLOTH_SUCCESS:
      return {
        ...state,
        closet: {
          ...state.closet,
          deleting: null,
          items: state.closet.items.filter((item) => item._id !== action.payload),
          totalCount: state.closet.totalCount - 1,
        },
        collections: {
          ...state.collections,
          list: state.collections.list.map((c) => ({
            ...c,
            itemIds: c.itemIds.filter((id) => (typeof id === "object" ? id._id : id) !== action.payload),
          })),
        },
      };
    case DELETE_CLOTH_FAILURE:
      return { ...state, closet: { ...state.closet, deleting: null, error: action.payload } };

    case SET_CLOSET_FILTER:
      return {
        ...state,
        closet: { ...state.closet, filter: action.payload.value },
      };

    // ─── Suggestions ────────────────────────────────────────────────
    case FETCH_SUGGESTION_REQUEST:
      return { ...state, suggestions: { ...state.suggestions, loading: true, error: null } };
    case FETCH_SUGGESTION_SUCCESS:
      return {
        ...state,
        suggestions: {
          ...state.suggestions,
          loading: false,
          result: action.payload.result,
          flow: action.payload.flow,
        },
      };
    case FETCH_SUGGESTION_FAILURE:
      return { ...state, suggestions: { ...state.suggestions, loading: false, error: action.payload } };
    case CLEAR_SUGGESTION:
      return { ...state, suggestions: { ...initialState.suggestions } };

    // ─── Pairings ───────────────────────────────────────────────────
    case FETCH_PAIRINGS_REQUEST:
      return { ...state, pairings: { ...state.pairings, loading: true, error: null } };
    case FETCH_PAIRINGS_SUCCESS:
      return {
        ...state,
        pairings: {
          ...state.pairings,
          loading: false,
          data: action.payload.pairings || action.payload.data || [],
          unpaired: action.payload.unpaired || [],
          page: action.payload.page || 1,
          totalPages: action.payload.totalPages || 1,
        },
      };
    case FETCH_PAIRINGS_FAILURE:
      return { ...state, pairings: { ...state.pairings, loading: false, error: action.payload } };

    // ─── Outfits ────────────────────────────────────────────────────
    case FETCH_OUTFITS_REQUEST:
      return { ...state, outfits: { ...state.outfits, loading: true, error: null } };
    case FETCH_OUTFITS_SUCCESS:
      return { ...state, outfits: { ...state.outfits, loading: false, saved: action.payload } };
    case FETCH_OUTFITS_FAILURE:
      return { ...state, outfits: { ...state.outfits, loading: false, error: action.payload } };

    case SAVE_OUTFIT_REQUEST:
      return { ...state, outfits: { ...state.outfits, saving: true, error: null } };
    case SAVE_OUTFIT_SUCCESS:
      return {
        ...state,
        outfits: {
          ...state.outfits,
          saving: false,
          saved: [...state.outfits.saved, action.payload],
        },
      };
    case SAVE_OUTFIT_FAILURE:
      return { ...state, outfits: { ...state.outfits, saving: false, error: action.payload } };

    case DELETE_OUTFIT_REQUEST:
      return { ...state, outfits: { ...state.outfits, deleting: true, error: null } };
    case DELETE_OUTFIT_SUCCESS:
      return {
        ...state,
        outfits: {
          ...state.outfits,
          deleting: false,
          saved: state.outfits.saved.filter((o) => o._id !== action.payload),
        },
      };
    case DELETE_OUTFIT_FAILURE:
      return { ...state, outfits: { ...state.outfits, deleting: false, error: action.payload } };

    case TOGGLE_OUTFIT_FAVORITE_REQUEST:
      return { ...state, outfits: { ...state.outfits, togglingFavorite: action.payload } };
    case TOGGLE_OUTFIT_FAVORITE_SUCCESS:
      return {
        ...state,
        outfits: {
          ...state.outfits,
          togglingFavorite: null,
          saved: state.outfits.saved.map((o) =>
            o._id === action.payload._id ? { ...o, isFavorite: action.payload.isFavorite } : o
          ),
          savedFromOthers: state.outfits.savedFromOthers.map((o) =>
            o._id === action.payload._id ? { ...o, isFavorite: action.payload.isFavorite } : o
          ),
        },
      };
    case TOGGLE_OUTFIT_FAVORITE_FAILURE:
      return { ...state, outfits: { ...state.outfits, togglingFavorite: null, error: action.payload } };

    case SET_OUTFIT_FILTERS:
      return { ...state, outfits: { ...state.outfits, filters: { ...state.outfits.filters, ...action.payload } } };

    // ─── Builder ────────────────────────────────────────────────────
    case SET_BUILDER_SLOT:
      return {
        ...state,
        builder: { ...state.builder, [action.payload.slot]: action.payload.item },
      };
    case CLEAR_BUILDER_SLOT:
      return {
        ...state,
        builder: { ...state.builder, [action.payload]: null },
      };
    case CLEAR_BUILDER:
      return { ...state, builder: { ...initialState.builder, slots: initialState.builder.slots.map((s) => ({ ...s, item: null })) } };
    case SET_BUILDER_AI_SUGGESTIONS:
      return { ...state, builder: { ...state.builder, aiSuggestions: action.payload } };
    case SET_BUILDER_META:
      return { ...state, builder: { ...state.builder, meta: { ...state.builder.meta, ...action.payload } } };
    case SET_BUILDER_MODE:
      return { ...state, builder: { ...state.builder, mode: action.payload } };
    case SET_CANVAS_ITEMS:
      return { ...state, builder: { ...state.builder, canvasItems: action.payload } };
    case ADD_CANVAS_ITEM:
      return { ...state, builder: { ...state.builder, canvasItems: [...state.builder.canvasItems, action.payload] } };
    case UPDATE_CANVAS_ITEM:
      return {
        ...state,
        builder: {
          ...state.builder,
          canvasItems: state.builder.canvasItems.map((ci) =>
            ci.id === action.payload.id ? { ...ci, ...action.payload.updates } : ci
          ),
        },
      };
    case REMOVE_CANVAS_ITEM:
      return {
        ...state,
        builder: {
          ...state.builder,
          canvasItems: state.builder.canvasItems.filter((ci) => ci.id !== action.payload),
        },
      };
    case CLEAR_CANVAS:
      return { ...state, builder: { ...state.builder, canvasItems: [] } };

    // ─── Builder Slots (dynamic) ──────────────────────────────────
    case SET_BUILDER_SLOTS:
      return { ...state, builder: { ...state.builder, slots: action.payload } };
    case UPDATE_BUILDER_SLOT_ITEM:
      return {
        ...state,
        builder: {
          ...state.builder,
          slots: state.builder.slots.map((s) =>
            s.key === action.payload.key ? { ...s, item: action.payload.item } : s
          ),
        },
      };
    case ADD_BUILDER_SLOT:
      return {
        ...state,
        builder: {
          ...state.builder,
          slots: [...state.builder.slots, action.payload],
        },
      };
    case REMOVE_BUILDER_SLOT:
      return {
        ...state,
        builder: {
          ...state.builder,
          slots: state.builder.slots.filter((s) => s.key !== action.payload),
        },
      };

    // ─── Wear Log ───────────────────────────────────────────────────
    case LOG_WEAR_REQUEST:
      return { ...state, wearLog: { ...state.wearLog, logging: true, error: null } };
    case LOG_WEAR_SUCCESS:
      return {
        ...state,
        wearLog: {
          ...state.wearLog,
          logging: false,
          history: [action.payload, ...state.wearLog.history],
        },
      };
    case LOG_WEAR_FAILURE:
      return { ...state, wearLog: { ...state.wearLog, logging: false, error: action.payload } };

    case FETCH_WEAR_HISTORY_REQUEST:
      return { ...state, wearLog: { ...state.wearLog, loading: true, error: null } };
    case FETCH_WEAR_HISTORY_SUCCESS:
      return {
        ...state,
        wearLog: {
          ...state.wearLog,
          loading: false,
          history: action.payload.logs || action.payload.history || action.payload,
          page: action.payload.page || 1,
          totalPages: action.payload.totalPages || 1,
        },
      };
    case FETCH_WEAR_HISTORY_FAILURE:
      return { ...state, wearLog: { ...state.wearLog, loading: false, error: action.payload } };

    case FETCH_WEAR_STATS_REQUEST:
      return { ...state, wearLog: { ...state.wearLog, loading: true, error: null } };
    case FETCH_WEAR_STATS_SUCCESS:
      return { ...state, wearLog: { ...state.wearLog, loading: false, stats: action.payload } };
    case FETCH_WEAR_STATS_FAILURE:
      return { ...state, wearLog: { ...state.wearLog, loading: false, error: action.payload } };

    // ─── Planned Wears ──────────────────────────────────────────────
    case FETCH_PLANNED_WEARS_REQUEST:
      return { ...state, plannedWears: { ...state.plannedWears, loading: true, error: null } };
    case FETCH_PLANNED_WEARS_SUCCESS:
      return { ...state, plannedWears: { ...state.plannedWears, loading: false, items: action.payload } };
    case FETCH_PLANNED_WEARS_FAILURE:
      return { ...state, plannedWears: { ...state.plannedWears, loading: false, error: action.payload } };
    case MARK_PLANNED_WORN_SUCCESS:
      return {
        ...state,
        plannedWears: {
          ...state.plannedWears,
          items: state.plannedWears.items.filter((p) => p._id !== action.payload),
        },
      };
    case DELETE_PLANNED_WEAR_SUCCESS:
      return {
        ...state,
        plannedWears: {
          ...state.plannedWears,
          items: state.plannedWears.items.filter((p) => p._id !== action.payload),
        },
      };

    // ─── Product Catalog ────────────────────────────────────────────
    case FETCH_PRODUCT_CATALOG_REQUEST:
      return { ...state, productCatalog: { ...state.productCatalog, loading: true, error: null } };
    case FETCH_PRODUCT_CATALOG_SUCCESS:
      return { ...state, productCatalog: { ...state.productCatalog, loading: false, products: action.payload } };
    case FETCH_PRODUCT_CATALOG_FAILURE:
      return { ...state, productCatalog: { ...state.productCatalog, loading: false, error: action.payload } };

    // ─── Phase 7: Python AI Service ────────────────────────────────────
    case SET_PROCESSING_STATUS:
      return { ...state, builder: { ...state.builder, processingStatus: action.payload } };

    case SET_PREVIEW_FLATLAY:
      return { ...state, builder: { ...state.builder, previewFlatlay: action.payload, processingStatus: 'ready' } };

    case CLEAR_PREVIEW_FLATLAY:
      return {
        ...state,
        builder: { ...state.builder, previewFlatlay: null, processingStatus: 'idle', processingError: null },
      };

    case SET_PROCESSING_ERROR:
      return { ...state, builder: { ...state.builder, processingError: action.payload, processingStatus: 'error' } };

    case UPDATE_ITEM_PROCESSING_STATUS:
      return {
        ...state,
        closet: {
          ...state.closet,
          items: state.closet.items.map((item) =>
            item._id === action.payload.itemId
              ? {
                  ...item,
                  processingStatus: action.payload.status,
                  ...action.payload.data,
                }
              : item
          ),
        },
      };

    // ─── Collections ────────────────────────────────────────────
    case FETCH_COLLECTIONS_REQUEST:
      return { ...state, collections: { ...state.collections, loading: true, error: null } };
    case FETCH_COLLECTIONS_SUCCESS:
      return { ...state, collections: { ...state.collections, loading: false, list: action.payload } };
    case FETCH_COLLECTIONS_FAILURE:
      return { ...state, collections: { ...state.collections, loading: false, error: action.payload } };

    case CREATE_COLLECTION_REQUEST:
      return { ...state, collections: { ...state.collections, creating: true, error: null } };
    case CREATE_COLLECTION_SUCCESS:
      return {
        ...state,
        collections: {
          ...state.collections,
          creating: false,
          list: [action.payload, ...state.collections.list],
        },
      };
    case CREATE_COLLECTION_FAILURE:
      return { ...state, collections: { ...state.collections, creating: false, error: action.payload } };

    case UPDATE_COLLECTION_REQUEST:
      return { ...state, collections: { ...state.collections, error: null } };
    case UPDATE_COLLECTION_SUCCESS:
      return {
        ...state,
        collections: {
          ...state.collections,
          list: state.collections.list.map((c) =>
            c._id === action.payload._id ? action.payload : c
          ),
        },
      };
    case UPDATE_COLLECTION_FAILURE:
      return { ...state, collections: { ...state.collections, error: action.payload } };

    case DELETE_COLLECTION_REQUEST:
      return { ...state, collections: { ...state.collections, error: null } };
    case DELETE_COLLECTION_SUCCESS:
      return {
        ...state,
        collections: {
          ...state.collections,
          list: state.collections.list.filter((c) => c._id !== action.payload),
          activeId: state.collections.activeId === action.payload ? null : state.collections.activeId,
        },
      };
    case DELETE_COLLECTION_FAILURE:
      return { ...state, collections: { ...state.collections, error: action.payload } };

    case ADD_ITEMS_TO_COLLECTION_SUCCESS:
    case REMOVE_ITEMS_FROM_COLLECTION_SUCCESS:
      return {
        ...state,
        collections: {
          ...state.collections,
          list: state.collections.list.map((c) =>
            c._id === action.payload._id ? action.payload : c
          ),
        },
      };

    case SET_ACTIVE_COLLECTION:
      return { ...state, collections: { ...state.collections, activeId: action.payload } };

    // ─── Sharing ───────────────────────────────────────────────
    case SHARE_OUTFIT_SUCCESS:
      return {
        ...state,
        outfits: {
          ...state.outfits,
          saved: state.outfits.saved.map((o) =>
            o._id === action.payload.outfitId
              ? { ...o, shareToken: action.payload.shareToken, isPublic: true }
              : o
          ),
        },
      };

    // ─── Saved (bookmarked) outfits from other users ──────────────────────
    case FETCH_SAVED_OUTFITS_REQUEST:
      return { ...state, outfits: { ...state.outfits, loading: true, error: null } };
    case FETCH_SAVED_OUTFITS_SUCCESS:
      return { ...state, outfits: { ...state.outfits, loading: false, savedFromOthers: action.payload } };
    case FETCH_SAVED_OUTFITS_FAILURE:
      return { ...state, outfits: { ...state.outfits, loading: false, error: action.payload } };

    case UNSAVE_OUTFIT_SUCCESS:
      return {
        ...state,
        outfits: {
          ...state.outfits,
          savedFromOthers: state.outfits.savedFromOthers.filter((o) => o._id !== action.payload),
        },
      };

    // ─── Style DNA (AI Photo Analysis) ──────────────────────────────
    case ANALYZE_STYLE_DNA_REQUEST:
      return { ...state, styleDna: { ...state.styleDna, analyzing: true, error: null } };
    case ANALYZE_STYLE_DNA_SUCCESS:
      return {
        ...state,
        styleDna: { ...state.styleDna, analyzing: false, data: action.payload, hasAnalysis: !!action.payload },
      };
    case ANALYZE_STYLE_DNA_FAILURE:
      return { ...state, styleDna: { ...state.styleDna, analyzing: false, error: action.payload } };

    case FETCH_STYLE_DNA_REQUEST:
      return { ...state, styleDna: { ...state.styleDna, loading: true, error: null } };
    case FETCH_STYLE_DNA_SUCCESS:
      return {
        ...state,
        styleDna: { ...state.styleDna, loading: false, data: action.payload, hasAnalysis: !!action.payload },
      };
    case FETCH_STYLE_DNA_FAILURE:
      return { ...state, styleDna: { ...state.styleDna, loading: false, error: action.payload } };

    case CLEAR_STYLE_DNA:
      return { ...state, styleDna: { ...initialState.styleDna } };

    default:
      return state;
  }
};

export { wardrobeReducer };
