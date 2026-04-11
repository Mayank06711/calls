import { ENDPOINTS, HTTP_METHODS } from "../../constants/apiEndpoints";
import { makeRequest } from "../../utils/apiHandlers";
import { LOADER_TYPES } from "../action_creators";
import {
  setItemCatalogList,
  setItemCatalogDetail,
  addItemCatalogItem,
  updateItemCatalogItem,
  removeItemCatalogItem,
  addItemCatalogSuggestion,
  showNotification,
  startLoader,
  stopLoader,
} from "../actions";

const BASE = ENDPOINTS.ITEM_CATALOG.BASE;

export const fetchItemCatalog = (filters = {}) => async (dispatch) => {
  const loaderType = LOADER_TYPES.ITEM_CATALOG_LIST;
  try {
    dispatch(startLoader(loaderType));
    const params = {};
    if (filters.category) params.category = filters.category;
    if (filters.gender) params.gender = filters.gender;
    if (filters.clothingType) params.clothingType = filters.clothingType;
    if (filters.season) params.season = filters.season;
    if (filters.hairType) params.hairType = filters.hairType;
    if (filters.hairLength) params.hairLength = filters.hairLength;
    if (filters.lookType) params.lookType = filters.lookType;
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;

    const result = await makeRequest(HTTP_METHODS.GET, BASE, params);

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      dispatch(stopLoader(loaderType));
      return;
    }

    if (result.data?.success) {
      dispatch(setItemCatalogList(result.data.data));
    }
    dispatch(stopLoader(loaderType));
  } catch (error) {
    console.error("Error fetching item catalog:", error);
    dispatch(stopLoader(loaderType));
  }
};

export const fetchItemCatalogDetail = (id) => async (dispatch) => {
  const loaderType = LOADER_TYPES.ITEM_CATALOG_DETAIL;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(HTTP_METHODS.GET, `${BASE}/${id}`);

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      dispatch(stopLoader(loaderType));
      return null;
    }

    if (result.data?.success) {
      dispatch(setItemCatalogDetail(result.data.data.item));
      dispatch(stopLoader(loaderType));
      return result.data.data.item;
    }
    dispatch(stopLoader(loaderType));
    return null;
  } catch (error) {
    console.error("Error fetching catalog item detail:", error);
    dispatch(stopLoader(loaderType));
    return null;
  }
};

export const createCatalogItem = (data, onSuccess) => async (dispatch) => {
  const loaderType = LOADER_TYPES.ITEM_CATALOG_CREATE;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(HTTP_METHODS.POST, BASE, data);

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      dispatch(stopLoader(loaderType));
      return null;
    }

    if (result.data?.success) {
      dispatch(addItemCatalogItem(result.data.data.item));
      dispatch(showNotification("Catalog item created!", 200));
      dispatch(stopLoader(loaderType));
      if (onSuccess) onSuccess(result.data.data.item);
      return result.data.data.item;
    }
    dispatch(stopLoader(loaderType));
    return null;
  } catch (error) {
    console.error("Error creating catalog item:", error);
    dispatch(showNotification("Failed to create catalog item", 500));
    dispatch(stopLoader(loaderType));
    return null;
  }
};

export const updateCatalogItem = (id, data, onSuccess) => async (dispatch) => {
  const loaderType = LOADER_TYPES.ITEM_CATALOG_UPDATE;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(HTTP_METHODS.PUT, `${BASE}/${id}`, data);

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      dispatch(stopLoader(loaderType));
      return null;
    }

    if (result.data?.success) {
      dispatch(updateItemCatalogItem(result.data.data.item));
      dispatch(showNotification("Catalog item updated!", 200));
      dispatch(stopLoader(loaderType));
      if (onSuccess) onSuccess(result.data.data.item);
      return result.data.data.item;
    }
    dispatch(stopLoader(loaderType));
    return null;
  } catch (error) {
    console.error("Error updating catalog item:", error);
    dispatch(showNotification("Failed to update catalog item", 500));
    dispatch(stopLoader(loaderType));
    return null;
  }
};

export const deleteCatalogItem = (id, onSuccess) => async (dispatch) => {
  const loaderType = LOADER_TYPES.ITEM_CATALOG_DELETE;
  try {
    dispatch(startLoader(loaderType));
    const result = await makeRequest(HTTP_METHODS.DELETE, `${BASE}/${id}`);

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      dispatch(stopLoader(loaderType));
      return false;
    }

    if (result.data?.success) {
      dispatch(removeItemCatalogItem(id));
      dispatch(showNotification("Catalog item deleted", 200));
      dispatch(stopLoader(loaderType));
      if (onSuccess) onSuccess();
      return true;
    }
    dispatch(stopLoader(loaderType));
    return false;
  } catch (error) {
    console.error("Error deleting catalog item:", error);
    dispatch(showNotification("Failed to delete catalog item", 500));
    dispatch(stopLoader(loaderType));
    return false;
  }
};

export const addCatalogSuggestion = (id, text, onSuccess) => async (dispatch) => {
  try {
    const result = await makeRequest(HTTP_METHODS.POST, `${BASE}/${id}/suggestions`, { text });

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      return false;
    }

    if (result.data?.success) {
      dispatch(addItemCatalogSuggestion(id, result.data.data.suggestions));
      dispatch(showNotification("Suggestion added!", 200));
      if (onSuccess) onSuccess();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error adding suggestion:", error);
    dispatch(showNotification("Failed to add suggestion", 500));
    return false;
  }
};
