export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const ErrorCodes = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  VALIDATION: "VALIDATION",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  USER_PENDING: "USER_PENDING",
  USER_DISABLED: "USER_DISABLED",
  CUTOFF: "CUTOFF",
  CAPACITY_FULL: "CAPACITY_FULL",
  HOLIDAY: "HOLIDAY",
  MEAL_INACTIVE: "MEAL_INACTIVE",
  ALREADY_SERVED: "ALREADY_SERVED",
  INVALID_TICKET: "INVALID_TICKET",
  WRONG_WINDOW: "WRONG_WINDOW",
  WRONG_BRANCH: "WRONG_BRANCH",
  CANCELLED: "CANCELLED",
  RATE_LIMITED: "RATE_LIMITED",
} as const;
