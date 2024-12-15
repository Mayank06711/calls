const successResponse = (
  data: Record<string, any>,
  message: string = "Success"
) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: message,
      data: data,
    }),
  };
};
const errorResponse = (statusCode: number, message: string = "Something Went Wrong") => {
  return {
    statusCode,
    body: JSON.stringify({
      success: false,
      message,
    }),
  };
};

export { errorResponse, successResponse };
