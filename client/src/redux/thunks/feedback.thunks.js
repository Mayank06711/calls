import { makeRequest } from "../../utils/apiHandlers";
import { HTTP_METHODS, ENDPOINTS } from "../../constants/apiEndpoints";
import { showNotification } from "../actions/notification.actions";
import { LOADER_TYPES } from "../action_creators";
import { startLoader, stopLoader } from "../actions";


// Submit Bug Feedback - Anyone can submit (anonymous or logged-in)
export const submitBugFeedbackThunk = (feedbackData) => async (dispatch) => {
  const loaderId = LOADER_TYPES.SUBMIT_BUG_FEEDBACK;

  try {
    dispatch(startLoader(loaderId));
    
    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.FEEDBACK.SUBMIT_BUG,
      feedbackData
    );

    if (error) {
      dispatch(showNotification(error.message, error.statusCode));
      return { success: false, error: error.message };
    }

    if (data.success) {
      dispatch(showNotification(
        data.message || "feedback submitted successfully",
        statusCode
      ));
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } else {
      dispatch(showNotification("Failed to submit bug feedback", statusCode || 500));
      return { success: false, error: "Failed to submit bug feedback" };
    }

  } catch (error) {
    console.error("Error submitting bug feedback:", error);
    dispatch(showNotification(error.message || "Failed to submit bug feedback", 400));
    return { success: false, error: error.message };
  } finally {
    dispatch(stopLoader(loaderId));
  }
};

// Submit Expert Feedback - Only logged-in users
export const submitExpertFeedbackThunk = (feedbackData) => async (dispatch) => {
  const loaderId = LOADER_TYPES.SUBMIT_EXPERT_FEEDBACK;

  try {
    dispatch(startLoader(loaderId));
    
    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.FEEDBACK.SUBMIT_EXPERT,
      feedbackData
    );

    if (error) {
      dispatch(showNotification(error.message, error.statusCode));
      return { success: false, error: error.message };
    }

    if (data.success) {
      dispatch(showNotification(
        data.message || "Expert feedback submitted successfully",
        statusCode
      ));
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } else {
      dispatch(showNotification("Failed to submit expert feedback", statusCode || 500));
      return { success: false, error: "Failed to submit expert feedback" };
    }

  } catch (error) {
    console.error("Error submitting expert feedback:", error);
    dispatch(showNotification(error.message || "Failed to submit expert feedback", 400));
    return { success: false, error: error.message };
  } finally {
    dispatch(stopLoader(loaderId));
  }
};

// Get User's Own Feedback History
export const getUserFeedbackThunk = (params = {}) => async (dispatch) => {
  const loaderId = params.page === 1 ? 
    LOADER_TYPES.GET_USER_FEEDBACK : 
    LOADER_TYPES.GET_MORE_USER_FEEDBACK;

  try {
    dispatch(startLoader(loaderId));
    
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 10
    }).toString();

    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.GET,
      `${ENDPOINTS.FEEDBACK.GET_USER_FEEDBACK}/${params.userId}?${queryParams}`
    );

    if (error) {
      dispatch(showNotification(error.message, error.statusCode));
      return { success: false, error: error.message };
    }

    if (data.success) {
      return {
        success: true,
        data: data.data,
        pagination: {
          ...data.data.pagination,
          isLastPage: data.data.pagination.page >= data.data.pagination.pages
        }
      };
    } else {
      dispatch(showNotification("Failed to fetch user feedback", statusCode || 500));
      return { success: false, error: "Failed to fetch user feedback" };
    }

  } catch (error) {
    console.error("Error fetching user feedback:", error);
    dispatch(showNotification(error.message || "Failed to fetch user feedback", 400));
    return { success: false, error: error.message };
  } finally {
    dispatch(stopLoader(loaderId));
  }
};

// Get All Feedback with filters and pagination
export const getAllFeedbackThunk = (params = {}) => async (dispatch) => {
  const loaderId = params.page === 1 ? 
    LOADER_TYPES.GET_ALL_FEEDBACK : 
    LOADER_TYPES.GET_MORE_FEEDBACK;

  try {
    dispatch(startLoader(loaderId));
    
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 10,
      bugType: params.bugType || '',
      severity: params.severity || '',
      status: params.status || '',
      userId: params.userId || '',
      email: params.email || '',
      startDate: params.startDate || '',
      endDate: params.endDate || '',
      sortBy: params.sortBy || 'createdAt',
      sortOrder: params.sortOrder || 'desc'
    }).toString();

    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.GET,
      `${ENDPOINTS.FEEDBACK.GET_ALL_FEEDBACK}?${queryParams}`
    );

    if (error) {
      dispatch(showNotification(error.message, error.statusCode));
      return { success: false, error: error.message };
    }

    if (data.success) {
      return {
        success: true,
        data: data.data,
        pagination: {
          ...data.data.pagination,
          isLastPage: data.data.pagination.page >= data.data.pagination.pages
        }
      };
    } else {
      dispatch(showNotification("Failed to fetch all feedback", statusCode || 500));
      return { success: false, error: "Failed to fetch all feedback" };
    }

  } catch (error) {
    console.error("Error fetching all feedback:", error);
    dispatch(showNotification(error.message || "Failed to fetch all feedback", 400));
    return { success: false, error: error.message };
  } finally {
    dispatch(stopLoader(loaderId));
  }
};

// Get Feedback Statistics
export const getFeedbackStatsThunk = () => async (dispatch) => {
  const loaderId = LOADER_TYPES.GET_FEEDBACK_STATS;

  try {
    dispatch(startLoader(loaderId));
    
    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.FEEDBACK.GET_FEEDBACK_STATS
    );

    if (error) {
      dispatch(showNotification(error.message, error.statusCode));
      return { success: false, error: error.message };
    }

    if (data.success) {
      return {
        success: true,
        data: data.data
      };
    } else {
      dispatch(showNotification("Failed to fetch feedback statistics", statusCode || 500));
      return { success: false, error: "Failed to fetch feedback statistics" };
    }

  } catch (error) {
    console.error("Error fetching feedback statistics:", error);
    dispatch(showNotification(error.message || "Failed to fetch feedback statistics", 400));
    return { success: false, error: error.message };
  } finally {
    dispatch(stopLoader(loaderId));
  }
};

// Update Feedback Status/Response
export const updateFeedbackThunk = (feedbackId, updateData) => async (dispatch) => {
  const loaderId = LOADER_TYPES.UPDATE_FEEDBACK;

  try {
    dispatch(startLoader(loaderId));
    
    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.PUT,
      `${ENDPOINTS.FEEDBACK.UPDATE_FEEDBACK}/${feedbackId}`,
      updateData
    );

    if (error) {
      dispatch(showNotification(error.message, error.statusCode));
      return { success: false, error: error.message };
    }

    if (data.success) {
      dispatch(showNotification(
        data.message || "Feedback updated successfully",
        statusCode
      ));
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } else {
      dispatch(showNotification("Failed to update feedback", statusCode || 500));
      return { success: false, error: "Failed to update feedback" };
    }

  } catch (error) {
    console.error("Error updating feedback:", error);
    dispatch(showNotification(error.message || "Failed to update feedback", 400));
    return { success: false, error: error.message };
  } finally {
    dispatch(stopLoader(loaderId));
  }
};

// Assign Feedback to Developer
export const assignFeedbackThunk = (feedbackId, developerId) => async (dispatch) => {
  const loaderId = LOADER_TYPES.ASSIGN_FEEDBACK;

  try {
    dispatch(startLoader(loaderId));
    
    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.PUT,
      `${ENDPOINTS.FEEDBACK.ASSIGN_FEEDBACK}/${feedbackId}/assign`,
      { developerId }
    );

    if (error) {
      dispatch(showNotification(error.message, error.statusCode));
      return { success: false, error: error.message };
    }

    if (data.success) {
      dispatch(showNotification(
        data.message || "Feedback assigned successfully",
        statusCode
      ));
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } else {
      dispatch(showNotification("Failed to assign feedback", statusCode || 500));
      return { success: false, error: "Failed to assign feedback" };
    }

  } catch (error) {
    console.error("Error assigning feedback:", error);
    dispatch(showNotification(error.message || "Failed to assign feedback", 400));
    return { success: false, error: error.message };
  } finally {
    dispatch(stopLoader(loaderId));
  }
};

// Mark Feedback as Fixed
export const markFeedbackAsFixedThunk = (feedbackId, response) => async (dispatch) => {
  const loaderId = LOADER_TYPES.MARK_FEEDBACK_FIXED;

  try {
    dispatch(startLoader(loaderId));
    
    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.PUT,
      `${ENDPOINTS.FEEDBACK.MARK_AS_FIXED}/${feedbackId}/fixed`,
      { response }
    );

    if (error) {
      dispatch(showNotification(error.message, error.statusCode));
      return { success: false, error: error.message };
    }

    if (data.success) {
      dispatch(showNotification(
        data.message || "Feedback marked as fixed successfully",
        statusCode
      ));
      return {
        success: true,
        data: data.data,
        message: data.message
      };
    } else {
      dispatch(showNotification("Failed to mark feedback as fixed", statusCode || 500));
      return { success: false, error: "Failed to mark feedback as fixed" };
    }

  } catch (error) {
    console.error("Error marking feedback as fixed:", error);
    dispatch(showNotification(error.message || "Failed to mark feedback as fixed", 400));
    return { success: false, error: error.message };
  } finally {
    dispatch(stopLoader(loaderId));
  }
};

// Delete Feedback
export const deleteFeedbackThunk = (feedbackId) => async (dispatch) => {
  const loaderId = LOADER_TYPES.DELETE_FEEDBACK;

  try {
    dispatch(startLoader(loaderId));
    
    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.DELETE,
      `${ENDPOINTS.FEEDBACK.DELETE_FEEDBACK}/${feedbackId}`
    );

    if (error) {
      dispatch(showNotification(error.message, error.statusCode));
      return { success: false, error: error.message };
    }

    if (data.success) {
      dispatch(showNotification(
        data.message || "Feedback deleted successfully",
        statusCode
      ));
      return {
        success: true,
        feedbackId,
        message: data.message
      };
    } else {
      dispatch(showNotification("Failed to delete feedback", statusCode || 500));
      return { success: false, error: "Failed to delete feedback" };
    }

  } catch (error) {
    console.error("Error deleting feedback:", error);
    dispatch(showNotification(error.message || "Failed to delete feedback", 400));
    return { success: false, error: error.message };
  } finally {
    dispatch(stopLoader(loaderId));
  }
};


// Get Feedback Assigned to Developer
export const getAssignedFeedbackThunk = (params = {}) => async (dispatch) => {
  const loaderId = params.page === 1 ? 
    LOADER_TYPES.GET_ASSIGNED_FEEDBACK : 
    LOADER_TYPES.GET_MORE_ASSIGNED_FEEDBACK;

  try {
    dispatch(startLoader(loaderId));
    
    const queryParams = new URLSearchParams({
      page: params.page || 1,
      limit: params.limit || 10
    }).toString();

    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.GET,
      `${ENDPOINTS.FEEDBACK.GET_ASSIGNED_FEEDBACK}/${params.developerId}?${queryParams}`
    );

    if (error) {
      dispatch(showNotification(error.message, error.statusCode));
      return { success: false, error: error.message };
    }

    if (data.success) {
      return {
        success: true,
        data: data.data,
        pagination: {
          ...data.data.pagination,
          isLastPage: data.data.pagination.page >= data.data.pagination.pages
        }
      };
    } else {
      dispatch(showNotification("Failed to fetch assigned feedback", statusCode || 500));
      return { success: false, error: "Failed to fetch assigned feedback" };
    }

  } catch (error) {
    console.error("Error fetching assigned feedback:", error);
    dispatch(showNotification(error.message || "Failed to fetch assigned feedback", 400));
    return { success: false, error: error.message };
  } finally {
    dispatch(stopLoader(loaderId));
  }
};