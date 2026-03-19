import {
  SET_EXPERT_CATALOG,
  SET_EXPERT_DETAIL,
  CLEAR_EXPERT_DETAIL,
  SET_EXPERT_CATALOG_FILTERS,
} from "../action_creators";

export const setExpertCatalog = (payload) => ({
  type: SET_EXPERT_CATALOG,
  payload,
});

export const setExpertDetail = (payload) => ({
  type: SET_EXPERT_DETAIL,
  payload,
});

export const clearExpertDetail = () => ({
  type: CLEAR_EXPERT_DETAIL,
});

export const setExpertCatalogFilters = (payload) => ({
  type: SET_EXPERT_CATALOG_FILTERS,
  payload,
});
