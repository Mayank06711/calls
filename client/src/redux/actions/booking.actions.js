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
