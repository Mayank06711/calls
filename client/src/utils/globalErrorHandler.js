export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const handleApiError = (error) => {
  // If it's already an ApiError instance, return it
  if (error instanceof ApiError) {
    return error;
  }

  if (error.response) {
    let errorMessage;
    let errorData = error.response.data;

    // Handle 401 errors specifically
    if (error.response.status === 401) {
      try {
        const parsedBody = error.response.data?.body
          ? JSON.parse(error.response.data.body)
          : error.response.data;

        return new ApiError(
          parsedBody.message || "Unauthorized access",
          401,
          parsedBody
        );
      } catch (parseError) {
        return new ApiError("Unauthorized access", 401, error.response.data);
      }
    }

    // Handle stringified JSON in body
    if (
      error.response.data?.body &&
      typeof error.response.data.body === "string"
    ) {
      try {
        const parsedBody = JSON.parse(error.response.data.body);
        errorMessage = parsedBody.message;
        errorData = parsedBody;
      } catch (parseError) {
        console.warn("Failed to parse error body:", parseError);
      }
    }

    errorMessage =
      errorMessage ||
      error.response.data?.message ||
      error.response.data?.error ||
      "Server error occurred";

    return new ApiError(errorMessage, error.response.status, errorData);
  } else if (error.request) {
    return new ApiError("No response from server", 503, error.request);
  } else {
    return new ApiError(error.message || "Request failed", 500);
  }
};
