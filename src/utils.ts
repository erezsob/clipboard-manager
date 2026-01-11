import { conditionTimeout, type WaitError } from "./lib/errors";
import { err, ok, type Result } from "./lib/fp";

export interface WaitForOptions {
	/** Condition function to check */
	condition: () => boolean;
	/** Maximum number of attempts (default: 50) */
	maxAttempts?: number;
	/** Base delay in milliseconds for exponential backoff (default: 1) */
	baseDelay?: number;
}

/**
 * Recursively waits for a condition to be true with exponential backoff.
 * Returns a Result type for explicit error handling.
 *
 * @param options - Wait configuration options
 * @returns Promise<Result<void, WaitError>> - Success or failure with timeout details
 *
 * @example
 * const result = await waitForCondition({
 *   condition: () => window.electronAPI !== undefined,
 *   maxAttempts: 50,
 *   baseDelay: 1,
 * });
 *
 * if (!result.ok) {
 *   console.error(`Timed out after ${result.error.attempts} attempts`);
 * }
 */
export async function waitForCondition(
	options: WaitForOptions,
): Promise<Result<void, WaitError>> {
	const { condition, maxAttempts = 50, baseDelay = 1 } = options;

	const attempt = async (
		currentAttempt: number,
	): Promise<Result<void, WaitError>> => {
		// Base case: exceeded max attempts
		if (currentAttempt >= maxAttempts) {
			return err(conditionTimeout(currentAttempt));
		}

		// Check condition
		if (condition()) {
			return ok(undefined);
		}

		// Wait with exponential backoff before next attempt
		const delay = baseDelay * 2 ** currentAttempt;
		await new Promise((resolve) => setTimeout(resolve, delay));

		// Recursive call with incremented attempt
		return attempt(currentAttempt + 1);
	};

	return attempt(0);
}
