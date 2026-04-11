import {
  SET_ITEM_CATALOG_LIST,
  SET_ITEM_CATALOG_DETAIL,
  CLEAR_ITEM_CATALOG_DETAIL,
  ADD_ITEM_CATALOG_ITEM,
  UPDATE_ITEM_CATALOG_ITEM,
  REMOVE_ITEM_CATALOG_ITEM,
  ADD_ITEM_CATALOG_SUGGESTION,
} from "../action_creators";

const initialState = {
  list: { items: [], pagination: null },
  detail: null,
};

export const itemCatalogReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_ITEM_CATALOG_LIST:
      return { ...state, list: { items: action.payload.items, pagination: action.payload.pagination } };
    case SET_ITEM_CATALOG_DETAIL:
      return { ...state, detail: action.payload };
    case CLEAR_ITEM_CATALOG_DETAIL:
      return { ...state, detail: null };
    case ADD_ITEM_CATALOG_ITEM:
      return { ...state, list: { ...state.list, items: [action.payload, ...state.list.items] } };
    case UPDATE_ITEM_CATALOG_ITEM:
      return {
        ...state,
        list: {
          ...state.list,
          items: state.list.items.map((i) => (i._id === action.payload._id ? action.payload : i)),
        },
        detail: state.detail?._id === action.payload._id ? action.payload : state.detail,
      };
    case REMOVE_ITEM_CATALOG_ITEM:
      return {
        ...state,
        list: { ...state.list, items: state.list.items.filter((i) => i._id !== action.payload) },
      };
    case ADD_ITEM_CATALOG_SUGGESTION:
      return {
        ...state,
        detail:
          state.detail?._id === action.payload.itemId
            ? { ...state.detail, suggestions: action.payload.suggestions }
            : state.detail,
      };
    default:
      return state;
  }
};
