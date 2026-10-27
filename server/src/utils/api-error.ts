export interface ErrorDetail {
  field?: string;
  message: string;
}

class ApiError extends Error {
  readonly statusCode: number;
  readonly success = false;
  readonly code: string;
  readonly errors: ErrorDetail[] | undefined;

  constructor(
    statusCode: number,
    message: string,
    code: string,
    errors?: ErrorDetail[],
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    Error.captureStackTrace(this, new.target);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string, code = "BAD_REQUEST", errors?: ErrorDetail[]) {
    super(400, message, code, errors);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string, code = "UNAUTHORIZED") {
    super(401, message, code);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string, code = "FORBIDDEN") {
    super(403, message, code);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string, code = "NOT_FOUND") {
    super(404, message, code);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, code = "CONFLICT") {
    super(409, message, code);
  }
}

export class PayloadTooLargeError extends ApiError {
  constructor(message: string, code = "PAYLOAD_TOO_LARGE") {
    super(413, message, code);
  }
}

export class ValidationError extends ApiError {
  constructor(
    message: string,
    errors?: ErrorDetail[],
    code = "VALIDATION_ERROR",
  ) {
    super(422, message, code, errors);
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message: string, code = "TOO_MANY_REQUESTS") {
    super(429, message, code);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = "Internal Server Error", code = "INTERNAL_SERVER_ERROR") {
    super(500, message, code);
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message: string, code = "SERVICE_UNAVAILABLE") {
    super(503, message, code);
  }
}

export default ApiError;
