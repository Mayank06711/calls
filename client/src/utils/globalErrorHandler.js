export class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  }
  
  export const handleApiError = (error) => {
    if (error.response) {
      // Server responded with error status
      return new ApiError(
        error.response.data?.message || 'Server error occurred',
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      // Request was made but no response received
      return new ApiError('No response from server', 503, error.request);
    } else {
      // Error in setting up the request
      return new ApiError(error.message || 'Request failed', 500);
    }
  };