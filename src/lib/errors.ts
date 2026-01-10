// ============================================================================
// Domain-Specific Error Types
// ============================================================================

/**
 * Database operation errors
 */
export type DbError =
	| { readonly type: "DB_NOT_READY"; readonly message: string }
	| {
			readonly type: "QUERY_FAILED";
			readonly message: string;
			readonly cause?: unknown;
	  }
	| { readonly type: "TIMEOUT"; readonly message: string };

/**
 * Clipboard operation errors
 */
export type ClipboardError =
	| {
			readonly type: "READ_FAILED";
			readonly message: string;
			readonly cause?: unknown;
	  }
	| {
			readonly type: "WRITE_FAILED";
			readonly message: string;
			readonly cause?: unknown;
	  }
	| { readonly type: "API_NOT_AVAILABLE"; readonly message: string };

/**
 * Wait/timeout operation errors
 */
export type WaitError =
	| {
			readonly type: "CONDITION_TIMEOUT";
			readonly message: string;
			readonly attempts: number;
	  }
	| {
			readonly type: "MAX_RETRIES_EXCEEDED";
			readonly message: string;
			readonly attempts: number;
			readonly lastError?: unknown;
	  };

// ============================================================================
// Error Constructors
// ============================================================================

/**
 * Creates a DB_NOT_READY error
 */
export const dbNotReady = (message = "Database not initialized"): DbError => ({
	type: "DB_NOT_READY",
	message,
});

/**
 * Creates a QUERY_FAILED error
 */
export const queryFailed = (message: string, cause?: unknown): DbError => ({
	type: "QUERY_FAILED",
	message,
	cause,
});

/**
 * Creates a DB TIMEOUT error
 */
export const dbTimeout = (
	message = "Database operation timed out",
): DbError => ({
	type: "TIMEOUT",
	message,
});

/**
 * Creates a READ_FAILED clipboard error
 */
export const clipboardReadFailed = (
	message: string,
	cause?: unknown,
): ClipboardError => ({
	type: "READ_FAILED",
	message,
	cause,
});

/**
 * Creates a WRITE_FAILED clipboard error
 */
export const clipboardWriteFailed = (
	message: string,
	cause?: unknown,
): ClipboardError => ({
	type: "WRITE_FAILED",
	message,
	cause,
});

/**
 * Creates an API_NOT_AVAILABLE clipboard error
 */
export const clipboardApiNotAvailable = (
	message = "Clipboard API not available",
): ClipboardError => ({
	type: "API_NOT_AVAILABLE",
	message,
});

/**
 * Creates a CONDITION_TIMEOUT wait error
 */
export const conditionTimeout = (attempts: number): WaitError => ({
	type: "CONDITION_TIMEOUT",
	message: `Condition not met after ${attempts} attempts`,
	attempts,
});

/**
 * Creates a MAX_RETRIES_EXCEEDED error
 */
export const maxRetriesExceeded = (
	attempts: number,
	lastError?: unknown,
): WaitError => ({
	type: "MAX_RETRIES_EXCEEDED",
	message: `Operation failed after ${attempts} retry attempts`,
	attempts,
	lastError,
});

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Converts an unknown error to an Error instance
 */
export const toError = (error: unknown): Error =>
	error instanceof Error ? error : new Error(String(error));

/**
 * Extracts a user-friendly message from various error types
 */
export const getErrorMessage = (error: unknown): string => {
	if (error === null || error === undefined) {
		return "Unknown error";
	}

	// Handle our domain errors
	if (typeof error === "object" && "type" in error && "message" in error) {
		return (error as { message: string }).message;
	}

	// Handle standard Error
	if (error instanceof Error) {
		return error.message;
	}

	// Handle string errors
	if (typeof error === "string") {
		return error;
	}

	return String(error);
};

/**
 * Type guard for DbError
 */
export const isDbError = (error: unknown): error is DbError =>
	typeof error === "object" &&
	error !== null &&
	"type" in error &&
	["DB_NOT_READY", "QUERY_FAILED", "TIMEOUT"].includes(
		(error as { type: string }).type,
	);

/**
 * Type guard for ClipboardError
 */
export const isClipboardError = (error: unknown): error is ClipboardError =>
	typeof error === "object" &&
	error !== null &&
	"type" in error &&
	["READ_FAILED", "WRITE_FAILED", "API_NOT_AVAILABLE"].includes(
		(error as { type: string }).type,
	);

/**
 * Type guard for WaitError
 */
export const isWaitError = (error: unknown): error is WaitError =>
	typeof error === "object" &&
	error !== null &&
	"type" in error &&
	["CONDITION_TIMEOUT", "MAX_RETRIES_EXCEEDED"].includes(
		(error as { type: string }).type,
	);
