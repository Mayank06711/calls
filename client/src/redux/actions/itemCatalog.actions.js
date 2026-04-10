import {
  SET_ITEM_CATALOG_LIST,
  SET_ITEM_CATALOG_DETAIL,
  CLEAR_ITEM_CATALOG_DETAIL,
  ADD_ITEM_CATALOG_ITEM,
  UPDATE_ITEM_CATALOG_ITEM,
  REMOVE_ITEM_CATALOG_ITEM,
  ADD_ITEM_CATALOG_SUGGESTION,
} from "../action_creators";

export const setItemCatalogList = (payload) => ({ type: SET_ITEM_CATALOG_LIST, payload });
export const setItemCatalogDetail = (payload) => ({ type: SET_ITEM_CATALOG_DETAIL, payload });
export const clearItemCatalogDetail = () => ({ type: CLEAR_ITEM_CATALOG_DETAIL });
export const addItemCatalogItem = (payload) => ({ type: ADD_ITEM_CATALOG_ITEM, payload });
export const updateItemCatalogItem = (payload) => ({ type: UPDATE_ITEM_CATALOG_ITEM, payload });
export const removeItemCatalogItem = (payload) => ({ type: REMOVE_ITEM_CATALOG_ITEM, payload });
export const addItemCatalogSuggestion = (itemId, suggestions) => ({
  type: ADD_ITEM_CATALOG_SUGGESTION,
  payload: { itemId, suggestions },
});
