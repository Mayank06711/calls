class ApiError extends Error {
  statusCode: number;
  data: any;
  errors: any[];
  success: boolean;

  constructor(
    statusCode: number, // HTTP status code for the error
    message: string = "Something went wrong", // Error message (default value provided)
    errors: any[] = [], // Array of error details or validation errors (default value provided)
    stack: string = "" // Stack trace for the error (default value provided)
  ) {
    super(message); // Call the constructor of the Error class with the provided message
    this.statusCode = statusCode; // Assign the provided statusCode to the statusCode property of the instance
    this.data = null; // Initialize data property to null (can be used to attach additional data)
    this.errors = errors; // Assign the provided errors to the errors property of the instance
    this.success = false; // Indicate that the operation resulting in the error was not successful
    if (stack) {
      this.stack = stack; // If a stack trace is provided, assign it to the stack property
    } else {
      Error.captureStackTrace(this, this.constructor); // Otherwise, capture the stack trace
    }
  }
}

export { ApiError };
