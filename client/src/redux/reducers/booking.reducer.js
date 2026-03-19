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
      return { ...state, bookingDetail: action.payload };
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

    default:
      return state;
  }
};
