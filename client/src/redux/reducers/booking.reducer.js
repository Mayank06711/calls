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

const initialState = {
  creditBalance: 0,
  creditPacks: [],
  creditTransactions: { transactions: [], pagination: null },
  availableSlots: { slots: [], timezone: "", date: "", duration: 30 },
  myBookings: { upcoming: [], past: [] },
  expertBookings: { upcoming: [], past: [] },
  expertAvailability: null,
  // Session permission
  bookingDetail: null,
  clientCloset: [],
  clientOutfits: [],
  sharedCatalogItems: [],
  tryOnResults: [],
  bookingChatMessages: [],
  chatWritable: false,
};

export const bookingReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_CREDIT_BALANCE:
      return { ...state, creditBalance: action.payload };
    case SET_CREDIT_PACKS:
      return { ...state, creditPacks: action.payload };
    case SET_CREDIT_TRANSACTIONS:
      return { ...state, creditTransactions: action.payload };
    case SET_AVAILABLE_SLOTS:
      return { ...state, availableSlots: action.payload };
    case CLEAR_AVAILABLE_SLOTS:
      return { ...state, availableSlots: initialState.availableSlots };
    case SET_MY_BOOKINGS:
      return { ...state, myBookings: action.payload };
    case SET_EXPERT_BOOKINGS:
      return { ...state, expertBookings: action.payload };
    case SET_EXPERT_AVAILABILITY:
      return { ...state, expertAvailability: action.payload };

    // Session permission
    case SET_BOOKING_DETAIL:
      return {
        ...state,
        bookingDetail: action.payload,
        sharedCatalogItems: action.payload?.booking?.sharedCatalogItems || [],
        tryOnResults: action.payload?.booking?.tryOnResults || [],
        chatWritable: action.payload?.chatWritable || false,
      };
    case SET_BOOKING_PERMISSIONS:
      return {
        ...state,
        bookingDetail: state.bookingDetail
          ? { ...state.bookingDetail, permissions: { ...state.bookingDetail.permissions, ...action.payload } }
          : state.bookingDetail,
      };
    case SET_CLIENT_CLOSET:
      return { ...state, clientCloset: action.payload };
    case SET_CLIENT_OUTFITS:
      return { ...state, clientOutfits: action.payload };
    case CLEAR_BOOKING_DETAIL:
      return {
        ...state,
        bookingDetail: null,
        clientCloset: [],
        clientOutfits: [],
        sharedCatalogItems: [],
        tryOnResults: [],
        bookingChatMessages: [],
        chatWritable: false,
      };
    case UPDATE_CLIENT_CLOSET_ITEM:
      return {
        ...state,
        clientCloset: state.clientCloset.map((item) =>
          item._id === action.payload._id ? action.payload : item
        ),
      };
    case ADD_CLIENT_CLOSET_ITEM:
      return {
        ...state,
        clientCloset: [action.payload, ...state.clientCloset],
      };
    case ADD_CLIENT_OUTFIT:
      return {
        ...state,
        clientOutfits: [action.payload, ...state.clientOutfits],
      };

    case ADD_SHARED_CATALOG_ITEM:
      return {
        ...state,
        sharedCatalogItems: state.sharedCatalogItems.some(
          (s) =>
            (s.catalogItem?._id || s.catalogItem) ===
            (action.payload.catalogItem?._id || action.payload.catalogItem)
        )
          ? state.sharedCatalogItems
          : [...state.sharedCatalogItems, action.payload],
      };

    case ADD_TRYON_RESULT:
      return {
        ...state,
        tryOnResults: [...state.tryOnResults, action.payload],
      };
    case UPDATE_TRYON_RESULT:
      return {
        ...state,
        tryOnResults: state.tryOnResults.map((r) =>
          (r._id === action.payload.resultId || r.tryOnResultId === action.payload.resultId)
            ? { ...r, ...action.payload.updates }
            : r
        ),
      };

    case UPDATE_BOOKING_END_TIME:
      return {
        ...state,
        bookingDetail: state.bookingDetail
          ? {
              ...state.bookingDetail,
              booking: {
                ...state.bookingDetail.booking,
                endTime: action.payload.newEndTime,
                duration: action.payload.newDuration,
                creditsCharged: action.payload.totalCreditsCharged,
                // Use absolute totalExtendedMinutes from server (avoids double-counting
                // when both HTTP response and socket event dispatch this action)
                totalExtendedMinutes:
                  action.payload.totalExtendedMinutes !== undefined
                    ? action.payload.totalExtendedMinutes
                    : (state.bookingDetail.booking.totalExtendedMinutes || 0) +
                      (action.payload.extensionMinutes || 0),
              },
            }
          : state.bookingDetail,
        creditBalance:
          action.payload.creditBalance !== undefined
            ? action.payload.creditBalance
            : state.creditBalance,
      };

    // Instant Booking Started
    case SET_INSTANT_BOOKING_STARTED:
      return {
        ...state,
        bookingDetail: state.bookingDetail
          ? {
              ...state.bookingDetail,
              booking: {
                ...state.bookingDetail.booking,
                startTime: action.payload.startTime,
                endTime: action.payload.endTime,
                startedAt: action.payload.startedAt,
              },
            }
          : state.bookingDetail,
      };

    // Booking Chat
    case SET_BOOKING_CHAT_MESSAGES:
      return { ...state, bookingChatMessages: action.payload };

    case ADD_BOOKING_CHAT_MESSAGE:
      return {
        ...state,
        bookingChatMessages: state.bookingChatMessages.some(
          (m) => m._id === action.payload._id
        )
          ? state.bookingChatMessages
          : [...state.bookingChatMessages, action.payload],
      };

    default:
      return state;
  }
};
