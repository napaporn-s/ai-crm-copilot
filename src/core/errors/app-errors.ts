export class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** Business-rule violation, e.g. reopening a terminal Lead stage (BA §3.1). */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

/** Malformed request body (invalid JSON) — distinct from Zod shape errors,
 * both map to 400 VALIDATION_ERROR (US-11). */
export class BadRequestError extends Error {
  constructor(message = 'Malformed request body') {
    super(message);
    this.name = 'BadRequestError';
  }
}
