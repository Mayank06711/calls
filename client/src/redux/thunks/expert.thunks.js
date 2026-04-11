import { ENDPOINTS, HTTP_METHODS } from "../../constants/apiEndpoints";
import { makeRequest } from "../../utils/apiHandlers";
import { LOADER_TYPES } from "../action_creators";
import {
  setExpertCatalog,
  setExpertDetail,
  showNotification,
  startLoader,
  stopLoader,
} from "../actions";

export const fetchExpertCatalog =
  ({ category, sort, page } = {}) =>
  async (dispatch) => {
    const loaderType = LOADER_TYPES.EXPERT_CATALOG;
    try {
      dispatch(startLoader(loaderType));

      const params = {};
      if (category) params.category = category;
      if (sort) params.sort = sort;
      if (page) params.page = page;

      const result = await makeRequest(
        HTTP_METHODS.GET,
        ENDPOINTS.EXPERT.CATALOG,
        params
      );

      if (result.error) {
        dispatch(showNotification(result.error.message, result.error.statusCode));
        dispatch(stopLoader(loaderType));
        return;
      }

      if (result.data?.success) {
        dispatch(
          setExpertCatalog({
            experts: result.data.data.experts,
            pagination: result.data.data.pagination,
          })
        );
      }

      dispatch(stopLoader(loaderType));
    } catch (error) {
      console.error("Error fetching expert catalog:", error);
      dispatch(showNotification("Failed to load experts", 500));
      dispatch(stopLoader(loaderType));
    }
  };

export const fetchExpertDetail = (expertId) => async (dispatch) => {
  const loaderType = LOADER_TYPES.EXPERT_DETAIL;
  try {
    dispatch(startLoader(loaderType));

    const result = await makeRequest(
      HTTP_METHODS.GET,
      `${ENDPOINTS.EXPERT.CATALOG}/${expertId}`
    );

    if (result.error) {
      dispatch(showNotification(result.error.message, result.error.statusCode));
      dispatch(stopLoader(loaderType));
      return;
    }

    if (result.data?.success) {
      dispatch(setExpertDetail(result.data.data));
    }

    dispatch(stopLoader(loaderType));
  } catch (error) {
    console.error("Error fetching expert detail:", error);
    dispatch(showNotification("Failed to load expert details", 500));
    dispatch(stopLoader(loaderType));
  }
};
