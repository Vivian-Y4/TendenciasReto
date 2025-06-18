/**
 * Custom error class for API service errors.
 */
export class AppError extends Error {
  constructor(message, statusCode, errorDetails = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorDetails = errorDetails;
    // Maintains proper stack trace (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Handles API errors, extracting a user-friendly message.
 * @param {Error} error - The error object.
 * @param {string} defaultMessage - A default message if a specific one cannot be extracted.
 * @returns {string} - The error message to display.
 */
export const handleApiError = (error, defaultMessage = "An unexpected error occurred.") => {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message; // For Axios errors
  }
  if (error.message) {
    return error.message;
  }
  return defaultMessage;
};
