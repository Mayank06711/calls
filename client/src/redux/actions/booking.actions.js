import {
  SET_CREDIT_BALANCE,
  SET_CREDIT_PACKS,
  SET_CREDIT_TRANSACTIONS,
  SET_AVAILABLE_SLOTS,
  SET_MY_BOOKINGS,
  SET_EXPERT_BOOKINGS,
  SET_EXPERT_AVAILABILITY,
  CLEAR_AVAILABLE_SLOTS,
  SET_BOOKING_DETAIL,
  SET_BOOKING_PERMISSIONS,
  SET_CLIENT_CLOSET,
  SET_CLIENT_OUTFITS,
  CLEAR_BOOKING_DETAIL,
  UPDATE_CLIENT_CLOSET_ITEM,
  ADD_CLIENT_CLOSET_ITEM,
  ADD_CLIENT_OUTFIT,
  ADD_SHARED_CATALOG_ITEM,
  ADD_TRYON_RESULT,
  UPDATE_TRYON_RESULT,
  UPDATE_BOOKING_END_TIME,
  SET_INSTANT_BOOKING_STARTED,
  SET_BOOKING_CHAT_MESSAGES,
  ADD_BOOKING_CHAT_MESSAGE,
} from "../action_creators/booking.action_creators";

export const setCreditBalance = (balance) => ({
  type: SET_CREDIT_BALANCE,
  payload: balance,
});

export const setCreditPacks = (packs) => ({
  type: SET_CREDIT_PACKS,
  payload: packs,
});

export const setCreditTransactions = (data) => ({
  type: SET_CREDIT_TRANSACTIONS,
  payload: data,
});

export const setAvailableSlots = (data) => ({
  type: SET_AVAILABLE_SLOTS,
  payload: data,
});

export const clearAvailableSlots = () => ({
  type: CLEAR_AVAILABLE_SLOTS,
});

export const setMyBookings = (data) => ({
  type: SET_MY_BOOKINGS,
  payload: data,
});

export const setExpertBookings = (data) => ({
  type: SET_EXPERT_BOOKINGS,
  payload: data,
});

export const setExpertAvailability = (data) => ({
  type: SET_EXPERT_AVAILABILITY,
  payload: data,
});

// Session Permission actions
export const setBookingDetail = (data) => ({
  type: SET_BOOKING_DETAIL,
  payload: data,
});

export const setBookingPermissions = (permissions) => ({
  type: SET_BOOKING_PERMISSIONS,
  payload: permissions,
});

export const setClientCloset = (items) => ({
  type: SET_CLIENT_CLOSET,
  payload: items,
});

export const setClientOutfits = (outfits) => ({
  type: SET_CLIENT_OUTFITS,
  payload: outfits,
});

export const clearBookingDetail = () => ({
  type: CLEAR_BOOKING_DETAIL,
});

export const updateClientClosetItem = (item) => ({
  type: UPDATE_CLIENT_CLOSET_ITEM,
  payload: item,
});

export const addClientClosetItem = (item) => ({
  type: ADD_CLIENT_CLOSET_ITEM,
  payload: item,
});

export const addClientOutfit = (outfit) => ({
  type: ADD_CLIENT_OUTFIT,
  payload: outfit,
});

export const addSharedCatalogItem = (item) => ({
  type: ADD_SHARED_CATALOG_ITEM,
  payload: item,
});

export const addTryOnResult = (result) => ({
  type: ADD_TRYON_RESULT,
  payload: result,
});

export const updateTryOnResult = (resultId, updates) => ({
  type: UPDATE_TRYON_RESULT,
  payload: { resultId, updates },
});

export const updateBookingEndTime = (data) => ({
  type: UPDATE_BOOKING_END_TIME,
  payload: data,
});

export const setBookingChatMessages = (messages) => ({
  type: SET_BOOKING_CHAT_MESSAGES,
  payload: messages,
});

export const addBookingChatMessage = (message) => ({
  type: ADD_BOOKING_CHAT_MESSAGE,
  payload: message,
});

export const setInstantBookingStarted = (data) => ({
  type: SET_INSTANT_BOOKING_STARTED,
  payload: data,
});
