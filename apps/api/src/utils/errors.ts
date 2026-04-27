/**
 * Standardized Error Handling for AIVO API
 * Provides consistent error responses and logging
 */

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "APIError";
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// Validation Errors
export class ValidationError extends APIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, "VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
  }
}

// Authentication Errors
export class AuthError extends APIError {
  constructor(message: string = "Authentication failed", details?: Record<string, unknown>) {
    super(401, "AUTH_ERROR", message, details);
    this.name = "AuthError";
  }
}

export class InvalidTokenError extends APIError {
  constructor(message: string = "Invalid or expired token") {
    super(401, "INVALID_TOKEN", message);
    this.name = "InvalidTokenError";
  }
}

// Authorization Errors
export class ForbiddenError extends APIError {
  constructor(message: string = "Insufficient permissions") {
    super(403, "FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

// Resource Errors
export class NotFoundError extends APIError {
  constructor(resource: string = "Resource") {
    super(404, "NOT_FOUND", `${resource} not found`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends APIError {
  constructor(message: string = "Resource conflict") {
    super(409, "CONFLICT", message);
    this.name = "ConflictError";
  }
}

// Rate Limiting
export class RateLimitError extends APIError {
  constructor(retryAfter: number) {
    super(429, "RATE_LIMIT_EXCEEDED", "Too many requests", { retryAfter });
    this.name = "RateLimitError";
  }
}

// External Service Errors
export class ServiceUnavailableError extends APIError {
  constructor(service: string = "Service") {
    super(503, "SERVICE_UNAVAILABLE", `${service} is temporarily unavailable`);
    this.name = "ServiceUnavailableError";
  }
}

export class ExternalAPIError extends APIError {
  constructor(
    service: string,
    message: string = `Error calling ${service}`,
    statusCode: number = 502
  ) {
    super(statusCode, "EXTERNAL_API_ERROR", message, { service });
    this.name = "ExternalAPIError";
  }
}

// Database Errors
export class DatabaseError extends APIError {
  constructor(message: string = "Database error", details?: Record<string, unknown>) {
    super(500, "DATABASE_ERROR", message, details);
    this.name = "DatabaseError";
  }
}

// Helper function to format Zod errors into ValidationError
export function formatZodError(error: unknown): ValidationError {
  if (error instanceof Error && "issues" in error) {
    const issues = error.issues as Array<{ message: string; path: (string | number)[] }>;
    const firstIssue = issues[0];
    if (firstIssue) {
      return new ValidationError(
        firstIssue.message || "Validation failed",
        {
          field: firstIssue.path?.join("."),
          issues: issues.slice(0, 5), // Send first 5 issues only
        }
      );
    }
  }

  return new ValidationError(
    error instanceof Error ? error.message : "Invalid request data"
  );
}
