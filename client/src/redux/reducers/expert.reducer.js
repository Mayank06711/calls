import {
  SET_EXPERT_CATALOG,
  SET_EXPERT_DETAIL,
  CLEAR_EXPERT_DETAIL,
  SET_EXPERT_CATALOG_FILTERS,
} from "../action_creators";

const initialState = {
  catalog: { experts: [], pagination: null },
  detail: null,
  filters: { category: null, sort: "rating" },
};

export const expertCatalogReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_EXPERT_CATALOG:
      return {
        ...state,
        catalog: {
          experts: action.payload.experts,
          pagination: action.payload.pagination,
        },
      };
    case SET_EXPERT_DETAIL:
      return { ...state, detail: action.payload };
    case CLEAR_EXPERT_DETAIL:
      return { ...state, detail: null };
    case SET_EXPERT_CATALOG_FILTERS:
      return { ...state, filters: { ...state.filters, ...action.payload } };
    default:
      return state;
  }
};
