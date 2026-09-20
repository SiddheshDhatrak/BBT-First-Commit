class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
const unauthorized = (message = 'Authentication required.', details) =>
  new AppError(401, 'UNAUTHORIZED', message, details);
const forbidden = (message = 'You are not authorized to perform this action.') =>
  new AppError(403, 'FORBIDDEN', message);
const notFound = (message = 'Resource not found.') => new AppError(404, 'NOT_FOUND', message);
const conflict = (message, details) => new AppError(409, 'CONFLICT', message, details);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict };
