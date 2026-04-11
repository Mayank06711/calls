import { ENDPOINTS, HTTP_METHODS } from "../../constants/apiEndpoints";
import { makeRequest } from "../../utils/apiHandlers";
import { LOADER_TYPES } from "../action_creators";
import {
  setCreditBalance,
  setCreditPacks,
  setCreditTransactions,
  setAvailableSlots,
  clearAvailableSlots,
  setMyBookings,
  setExpertBookings,
  setExpertAvailability,
  showNotification,
  startLoader,
  stopLoader,
} from "../actions";
import {
  setBookingDetail,
  setBookingPermissions,
  setClientCloset,
  setClientOutfits,
  updateClientClosetItem,
  addClientClosetItem as addClientClosetItemAction,
  addClientOutfit as addClientOutfitAction,
  addSharedCatalogItem,
  addTryOnResult,
  updateBookingEndTime,
  setBookingChatMessages,
  addBookingChatMessage,
} from "../actions/booking.actions";

// ─── Credits ────────────────────────────────────────────────────────────────

export const fetchCreditBalance = () => async (dispatch) => {
  const loaderType = LOADER_TYPES.CREDIT_BALANCE;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(HTTP_METHODS.GET, ENDPOINTS.CREDITS.BALANCE);
    if (result.data?.success) {
      dispatch(setCreditBalance(result.data.data.creditBalance));
    }
    dispatch(stopLoader(loaderType));
  } catch (error) {
    console.error("Error fetching credit balance:", error);
    dispatch(stopLoader(loaderType));
  }
};

export const fetchCreditPacks = () => async (dispatch) => {
  const loaderType = LOADER_TYPES.CREDIT_PACKS;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(HTTP_METHODS.GET, ENDPOINTS.CREDITS.PACKS);
    if (result.data?.success) {
      dispatch(setCreditPacks(result.data.data.packs));
    }
    dispatch(stopLoader(loaderType));
  } catch (error) {
    console.error("Error fetching credit packs:", error);
    dispatch(stopLoader(loaderType));
  }
};

export const fetchCreditTransactions =
  ({ page, limit } = {}) =>
  async (dispatch) => {
    try {
      const params = {};
      if (page) params.page = page;
      if (limit) params.limit = limit;
      const result = await makeRequest(
        HTTP_METHODS.GET,
        ENDPOINTS.CREDITS.TRANSACTIONS,
        params
      );
      if (result.data?.success) {
        dispatch(setCreditTransactions(result.data.data));
      }
    } catch (error) {
      console.error("Error fetching credit transactions:", error);
    }
  };

export const purchaseCreditPack = (packId, onOrderCreated) => async (dispatch) => {
  const loaderType = LOADER_TYPES.CREDIT_PURCHASE;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(HTTP_METHODS.POST, ENDPOINTS.CREDITS.PURCHASE, {
      packId,
    });

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      dispatch(stopLoader(loaderType));
      return;
    }

    if (result.data?.success && onOrderCreated) {
      // Pass order data to caller for Razorpay popup
      onOrderCreated(result.data.data);
    }
    dispatch(stopLoader(loaderType));
  } catch (error) {
    console.error("Error purchasing credit pack:", error);
    dispatch(showNotification("Failed to create purchase order", 500));
    dispatch(stopLoader(loaderType));
  }
};

export const verifyCreditPurchase =
  ({ providerOrderId, providerPaymentId, signature }) =>
  async (dispatch) => {
    try {
      const result = await makeRequest(
        HTTP_METHODS.POST,
        ENDPOINTS.CREDITS.VERIFY_PURCHASE,
        { providerOrderId, providerPaymentId, signature }
      );

      if (result.error) {
        dispatch(showNotification(result.error.message, result.error.statusCode));
        return false;
      }

      if (result.data?.success) {
        dispatch(setCreditBalance(result.data.data.creditBalance));
        dispatch(showNotification("Credits purchased successfully!", 200));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error verifying credit purchase:", error);
      dispatch(showNotification("Verification failed", 500));
      return false;
    }
  };

// ─── Bookings ───────────────────────────────────────────────────────────────

export const fetchAvailableSlots =
  ({ expertId, date, duration }) =>
  async (dispatch) => {
    const loaderType = LOADER_TYPES.AVAILABLE_SLOTS;
    try {
      dispatch(startLoader(loaderType));
      const result = await makeRequest(
        HTTP_METHODS.GET,
        `${ENDPOINTS.BOOKINGS.SLOTS}/${expertId}`,
        { date, duration }
      );

      if (result.error) {
        dispatch(showNotification(result.error.message, result.error.statusCode));
        dispatch(stopLoader(loaderType));
        return;
      }

      if (result.data?.success) {
        dispatch(setAvailableSlots(result.data.data));
      }
      dispatch(stopLoader(loaderType));
    } catch (error) {
      console.error("Error fetching available slots:", error);
      dispatch(stopLoader(loaderType));
    }
  };

export const createBooking =
  ({ expertId, date, startTime, duration, notes }, onSuccess) =>
  async (dispatch) => {
    const loaderType = LOADER_TYPES.CREATE_BOOKING;
    try {
      dispatch(startLoader(loaderType));
      const result = await makeRequest(HTTP_METHODS.POST, ENDPOINTS.BOOKINGS.CREATE, {
        expertId,
        date,
        startTime,
        duration,
        notes,
      });

      if (result.error) {
        dispatch(showNotification(result.error.message, result.error.statusCode));
        dispatch(stopLoader(loaderType));
        return;
      }

      if (result.data?.success) {
        dispatch(setCreditBalance(result.data.data.creditBalance));
        dispatch(clearAvailableSlots());
        dispatch(showNotification("Booking confirmed!", 200));
        // Pre-fetch user's bookings so My Bookings page loads instantly
        // Await so data is in Redux before onSuccess navigates
        await dispatch(fetchMyBookings());
        if (onSuccess) onSuccess(result.data.data.booking);
      }
      dispatch(stopLoader(loaderType));
    } catch (error) {
      console.error("Error creating booking:", error);
      dispatch(showNotification("Failed to create booking", 500));
      dispatch(stopLoader(loaderType));
    }
  };

export const createInstantBooking =
  ({ category, duration }, onSuccess) =>
  async (dispatch) => {
    const loaderType = LOADER_TYPES.CREATE_INSTANT_BOOKING;
    try {
      dispatch(startLoader(loaderType));
      const result = await makeRequest(
        HTTP_METHODS.POST,
        ENDPOINTS.BOOKINGS.INSTANT,
        { category, duration }
      );

      if (result.error) {
        dispatch(showNotification(result.error.message, result.error.statusCode));
        dispatch(stopLoader(loaderType));
        return null;
      }

      if (result.data?.success) {
        const { booking, creditBalance } = result.data.data;

        if (!booking) {
          // No experts available
          dispatch(showNotification(result.data.message || "No experts available right now", 200));
          dispatch(stopLoader(loaderType));
          return null;
        }

        dispatch(setCreditBalance(creditBalance));
        dispatch(showNotification("Instant session created!", 200));
        await dispatch(fetchMyBookings());
        dispatch(stopLoader(loaderType));
        if (onSuccess) onSuccess(booking);
        return booking;
      }

      dispatch(stopLoader(loaderType));
      return null;
    } catch (error) {
      console.error("Error creating instant booking:", error);
      dispatch(showNotification("Failed to create instant session", 500));
      dispatch(stopLoader(loaderType));
      return null;
    }
  };

export const fetchMyBookings = () => async (dispatch) => {
  const loaderType = LOADER_TYPES.MY_BOOKINGS;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(HTTP_METHODS.GET, ENDPOINTS.BOOKINGS.MY);

    if (result.error) {
      console.error("fetchMyBookings API error:", result.error);
      dispatch(showNotification(result.error.message || "Failed to load bookings", result.error.statusCode));
      dispatch(stopLoader(loaderType));
      return;
    }

    if (result.data?.success) {
      dispatch(setMyBookings(result.data.data));
    }
    dispatch(stopLoader(loaderType));
  } catch (error) {
    console.error("Error fetching my bookings:", error);
    dispatch(showNotification("Failed to load bookings", 500));
    dispatch(stopLoader(loaderType));
  }
};

export const fetchExpertBookings = () => async (dispatch) => {
  const loaderType = LOADER_TYPES.EXPERT_BOOKINGS;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(HTTP_METHODS.GET, ENDPOINTS.BOOKINGS.EXPERT);

    if (result.error) {
      console.error("fetchExpertBookings API error:", result.error);
      dispatch(showNotification(result.error.message || "Failed to load bookings", result.error.statusCode));
      dispatch(stopLoader(loaderType));
      return;
    }

    if (result.data?.success) {
      dispatch(setExpertBookings(result.data.data));
    }
    dispatch(stopLoader(loaderType));
  } catch (error) {
    console.error("Error fetching expert bookings:", error);
    dispatch(showNotification("Failed to load bookings", 500));
    dispatch(stopLoader(loaderType));
  }
};

export const cancelBooking = (bookingId, reason, onSuccess) => async (dispatch) => {
  try {
    const result = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.BOOKINGS.CANCEL}/${bookingId}/cancel`,
      { reason }
    );

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      return;
    }

    if (result.data?.success) {
      dispatch(showNotification(result.data.message || "Booking cancelled", 200));
      if (result.data.data.refundedCredits > 0) {
        dispatch(fetchCreditBalance());
      }
      if (onSuccess) onSuccess(result.data.data);
    }
  } catch (error) {
    console.error("Error cancelling booking:", error);
    dispatch(showNotification("Failed to cancel booking", 500));
  }
};

export const connectBooking = (bookingId) => async (dispatch) => {
  const loaderType = LOADER_TYPES.CONNECT_BOOKING;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.BOOKINGS.CONNECT}/${bookingId}/connect`
    );

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      dispatch(stopLoader(loaderType));
      return null;
    }

    dispatch(stopLoader(loaderType));
    if (result.data?.success) {
      return result.data.data; // { expertUserId, bookingId }
    }
    return null;
  } catch (error) {
    console.error("Error connecting booking:", error);
    dispatch(showNotification("Failed to connect", 500));
    dispatch(stopLoader(loaderType));
    return null;
  }
};

// ─── Expert Availability ─────────────────────────────────────────────────────

export const fetchExpertAvailability = (expertId) => async (dispatch) => {
  const loaderType = LOADER_TYPES.EXPERT_AVAILABILITY;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(
      HTTP_METHODS.GET,
      `${ENDPOINTS.EXPERT.AVAILABILITY}/${expertId}`
    );
    if (result.data?.success) {
      dispatch(setExpertAvailability(result.data.data.availability));
    }
    dispatch(stopLoader(loaderType));
  } catch (error) {
    console.error("Error fetching expert availability:", error);
    dispatch(stopLoader(loaderType));
  }
};

export const updateExpertAvailability =
  (data, onSuccess) => async (dispatch) => {
    const loaderType = LOADER_TYPES.EXPERT_AVAILABILITY;
    try {
      dispatch(startLoader(loaderType));
      const result = await makeRequest(
        HTTP_METHODS.PUT,
        ENDPOINTS.EXPERT.AVAILABILITY,
        data
      );

      if (result.error) {
        dispatch(showNotification(result.error.message, result.error.statusCode));
        dispatch(stopLoader(loaderType));
        return;
      }

      if (result.data?.success) {
        dispatch(setExpertAvailability(result.data.data.availability));
        dispatch(showNotification("Availability updated!", 200));
        if (onSuccess) onSuccess();
      }
      dispatch(stopLoader(loaderType));
    } catch (error) {
      console.error("Error updating availability:", error);
      dispatch(showNotification("Failed to update availability", 500));
      dispatch(stopLoader(loaderType));
    }
  };

// ─── Session Permissions ────────────────────────────────────────────────────

export const fetchBookingDetail = (bookingId) => async (dispatch) => {
  const loaderType = LOADER_TYPES.BOOKING_DETAIL;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(
      HTTP_METHODS.GET,
      `${ENDPOINTS.BOOKINGS.DETAIL}/${bookingId}/detail`
    );

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      dispatch(stopLoader(loaderType));
      return null;
    }

    if (result.data?.success) {
      dispatch(setBookingDetail(result.data.data));
      dispatch(stopLoader(loaderType));
      return result.data.data;
    }
    dispatch(stopLoader(loaderType));
    return null;
  } catch (error) {
    console.error("Error fetching booking detail:", error);
    dispatch(stopLoader(loaderType));
    return null;
  }
};

export const toggleBookingPermissions = (bookingId, permissions) => async (dispatch) => {
  try {
    const result = await makeRequest(
      HTTP_METHODS.PATCH,
      `${ENDPOINTS.BOOKINGS.PERMISSIONS}/${bookingId}/permissions`,
      permissions
    );

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      return false;
    }

    if (result.data?.success) {
      dispatch(setBookingPermissions(result.data.data.permissions));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error toggling permissions:", error);
    dispatch(showNotification("Failed to update permissions", 500));
    return false;
  }
};

export const fetchClientCloset = (bookingId, filters) => async (dispatch) => {
  const loaderType = LOADER_TYPES.CLIENT_CLOSET;
  try {
    dispatch(startLoader(loaderType));
    const params = {};
    if (filters?.type && filters.type !== "All") params.type = filters.type;

    const result = await makeRequest(
      HTTP_METHODS.GET,
      `${ENDPOINTS.BOOKINGS.CLIENT_CLOSET}/${bookingId}/client-closet`,
      Object.keys(params).length > 0 ? params : null
    );

    if (result.error) {
      // Permission not granted — lock the tab silently (LockedTab UI handles messaging)
      if (result.error.statusCode === 403) {
        dispatch(setBookingPermissions({ closet: false }));
        dispatch(setClientCloset([]));
      } else {
        dispatch(showNotification(result.error.message, result.error.statusCode));
      }
      dispatch(stopLoader(loaderType));
      return;
    }

    if (result.data?.success) {
      dispatch(setClientCloset(result.data.data.items));
      // Server returned data → permission is granted; sync local state
      dispatch(setBookingPermissions({ closet: true }));
    }
    dispatch(stopLoader(loaderType));
  } catch (error) {
    console.error("Error fetching client closet:", error);
    dispatch(stopLoader(loaderType));
  }
};

export const addClientClosetItem = (bookingId, itemData, onSuccess) => async (dispatch) => {
  try {
    const result = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.BOOKINGS.CLIENT_CLOSET}/${bookingId}/client-closet`,
      itemData
    );

    if (result.error) {
      if (result.error.statusCode === 403) {
        dispatch(setBookingPermissions({ closet: false }));
        dispatch(setClientCloset([]));
      }
      dispatch(showNotification(result.error.message, result.error.statusCode));
      return;
    }

    if (result.data?.success) {
      dispatch(addClientClosetItemAction(result.data.data.item));
      dispatch(showNotification("Item added to client's closet", 200));
      if (onSuccess) onSuccess(result.data.data.item);
    }
  } catch (error) {
    console.error("Error adding client closet item:", error);
    dispatch(showNotification("Failed to add item", 500));
  }
};

export const editClientClosetItem = (bookingId, itemId, updates, onSuccess) => async (dispatch) => {
  try {
    const result = await makeRequest(
      HTTP_METHODS.PUT,
      `${ENDPOINTS.BOOKINGS.CLIENT_CLOSET}/${bookingId}/client-closet/${itemId}`,
      updates
    );

    if (result.error) {
      if (result.error.statusCode === 403) {
        dispatch(setBookingPermissions({ closet: false }));
        dispatch(setClientCloset([]));
      }
      dispatch(showNotification(result.error.message, result.error.statusCode));
      return;
    }

    if (result.data?.success) {
      dispatch(updateClientClosetItem(result.data.data.item));
      dispatch(showNotification("Item updated", 200));
      if (onSuccess) onSuccess(result.data.data.item);
    }
  } catch (error) {
    console.error("Error editing client closet item:", error);
    dispatch(showNotification("Failed to update item", 500));
  }
};

export const fetchClientOutfits = (bookingId) => async (dispatch) => {
  const loaderType = LOADER_TYPES.CLIENT_OUTFITS;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(
      HTTP_METHODS.GET,
      `${ENDPOINTS.BOOKINGS.CLIENT_OUTFITS}/${bookingId}/client-outfits`
    );

    if (result.error) {
      // Permission not granted — lock the tab silently (LockedTab UI handles messaging)
      if (result.error.statusCode === 403) {
        dispatch(setBookingPermissions({ outfits: false }));
        dispatch(setClientOutfits([]));
      } else {
        dispatch(showNotification(result.error.message, result.error.statusCode));
      }
      dispatch(stopLoader(loaderType));
      return;
    }

    if (result.data?.success) {
      dispatch(setClientOutfits(result.data.data.outfits));
      // Server returned data → permission is granted; sync local state
      dispatch(setBookingPermissions({ outfits: true }));
    }
    dispatch(stopLoader(loaderType));
  } catch (error) {
    console.error("Error fetching client outfits:", error);
    dispatch(stopLoader(loaderType));
  }
};

export const createClientOutfit = (bookingId, outfitData, onSuccess) => async (dispatch) => {
  try {
    const result = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.BOOKINGS.CLIENT_OUTFITS}/${bookingId}/client-outfits`,
      outfitData
    );

    if (result.error) {
      if (result.error.statusCode === 403) {
        dispatch(setBookingPermissions({ outfits: false }));
        dispatch(setClientOutfits([]));
      }
      dispatch(showNotification(result.error.message, result.error.statusCode));
      return false;
    }

    if (result.data?.success) {
      dispatch(addClientOutfitAction(result.data.data.outfit));
      dispatch(showNotification("Outfit created for client!", 200));
      if (onSuccess) onSuccess(result.data.data.outfit);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error creating client outfit:", error);
    dispatch(showNotification("Failed to create outfit", 500));
    return false;
  }
};

// ─── Catalog Sharing ───────────────────────────────────────────────────────

export const shareCatalogItem = (bookingId, catalogItemId, note) => async (dispatch) => {
  try {
    const result = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.BOOKINGS.DETAIL}/${bookingId}/share-catalog-item`,
      { catalogItemId, note: note || undefined }
    );

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      return false;
    }

    if (result.data?.success) {
      dispatch(addSharedCatalogItem(result.data.data.sharedItem));
      dispatch(showNotification("Item shared with client!", 200));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error sharing catalog item:", error);
    dispatch(showNotification("Failed to share item", 500));
    return false;
  }
};

// ─── Virtual Try-On ─────────────────────────────────────────────────────────

export const requestTryOn = (bookingId, catalogItemId, personPhotoUrls) => async (dispatch) => {
  try {
    const result = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.BOOKINGS.DETAIL}/${bookingId}/try-on`,
      { catalogItemId, personPhotoUrls }
    );

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      return null;
    }

    if (result.data?.success) {
      dispatch(addTryOnResult({
        _id: result.data.data.tryOnResultId,
        tryOnResultId: result.data.data.tryOnResultId,
        catalogItem: catalogItemId,
        status: "pending",
        personPhotos: personPhotoUrls,
        requestedAt: new Date().toISOString(),
      }));
      dispatch(showNotification("Try-on is being generated...", 200));
      return result.data.data;
    }
    return null;
  } catch (error) {
    console.error("Error requesting try-on:", error);
    dispatch(showNotification("Failed to request try-on", 500));
    return null;
  }
};

export const generateTryOnUploadUrl = (bookingId, fileName) => async (dispatch) => {
  try {
    const result = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.BOOKINGS.DETAIL}/${bookingId}/try-on-upload-url`,
      { fileName }
    );

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      return null;
    }

    if (result.data?.success) {
      return result.data.data;
    }
    return null;
  } catch (error) {
    console.error("Error generating try-on upload URL:", error);
    return null;
  }
};

// ─── Session Extension ──────────────────────────────────────────────────────

export const extendSession = (bookingId, extensionMinutes) => async (dispatch) => {
  const loaderType = LOADER_TYPES.EXTEND_SESSION;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.BOOKINGS.EXTEND}/${bookingId}/extend`,
      { extensionMinutes }
    );

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      dispatch(stopLoader(loaderType));
      return false;
    }

    if (result.data?.success) {
      const { booking, extensionCost, creditBalance } = result.data.data;
      dispatch(updateBookingEndTime({
        newEndTime: booking.endTime,
        newDuration: booking.duration,
        creditsCharged: extensionCost,
        totalCreditsCharged: booking.creditsCharged,
        totalExtendedMinutes: booking.totalExtendedMinutes,
        extensionMinutes,
        creditBalance,
      }));
      dispatch(setCreditBalance(creditBalance));
      dispatch(showNotification(`Session extended by ${extensionMinutes} minutes!`, 200));
      dispatch(stopLoader(loaderType));
      return true;
    }
    dispatch(stopLoader(loaderType));
    return false;
  } catch (error) {
    console.error("Error extending session:", error);
    dispatch(showNotification("Failed to extend session", 500));
    dispatch(stopLoader(loaderType));
    return false;
  }
};

// ─── Booking Chat ────────────────────────────────────────────────────────

export const fetchBookingChat = (bookingId) => async (dispatch) => {
  const loaderType = LOADER_TYPES.BOOKING_CHAT;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(
      HTTP_METHODS.GET,
      `${ENDPOINTS.BOOKINGS.CHAT}/${bookingId}/chat`
    );

    if (result.error) {
      if (result.error.statusCode === 404) {
        dispatch(setBookingChatMessages([]));
      } else {
        dispatch(showNotification(result.error.message, result.error.statusCode));
      }
      dispatch(stopLoader(loaderType));
      return;
    }

    if (result.data?.success) {
      dispatch(setBookingChatMessages(result.data.data.messages || []));
    }
    dispatch(stopLoader(loaderType));
  } catch (error) {
    console.error("Error fetching booking chat:", error);
    dispatch(stopLoader(loaderType));
  }
};

export const sendBookingChatMessage = (bookingId, text) => async (dispatch) => {
  try {
    const result = await makeRequest(
      HTTP_METHODS.POST,
      `${ENDPOINTS.BOOKINGS.CHAT}/${bookingId}/chat`,
      { text }
    );

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      return null;
    }

    if (result.data?.success) {
      dispatch(addBookingChatMessage(result.data.data.message));
      return result.data.data.message;
    }
    return null;
  } catch (error) {
    console.error("Error sending booking chat message:", error);
    dispatch(showNotification("Failed to send message", 500));
    return null;
  }
};
