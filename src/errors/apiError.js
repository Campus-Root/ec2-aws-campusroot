/**
 * Represents an API error that can be handled.
 * @param {string} message - corresponding error message.
 * @param {number} statusCode - corresponding http status code.
 */
class APIError extends Error {
  constructor(message, statusCode, data) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.data = data || null;
  }
}

/** Generates a custom API error with the given message and status code. */
const generateAPIError = (msg, statusCode, data) => {
  return new APIError(msg, statusCode, data);
};

export { generateAPIError, APIError };
