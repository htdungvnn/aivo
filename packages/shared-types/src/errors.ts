// ============================================
// STRUCTURED ERROR CLASSES
// ============================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(
    message: string,
    public resource?: string,
    public id?: string
  ) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(
    message: string = "Unauthorized",
    public reason?: string
  ) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(
    message: string = "Forbidden",
    public requiredRole?: string
  ) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string = "Rate limit exceeded",
    public retryAfter: number = 60
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class ConflictError extends Error {
  constructor(
    message: string,
    public conflictingField?: string
  ) {
    super(message);
    this.name = "ConflictError";
  }
}

export class BadRequestError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "BadRequestError";
  }
}

export class ServiceUnavailableError extends Error {
  constructor(
    message: string = "Service temporarily unavailable",
    public retryIn?: number
  ) {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}
