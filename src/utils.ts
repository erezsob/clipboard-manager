import {
	conditionTimeout,
	maxRetriesExceeded,
	type WaitError,
} from "./lib/errors";
import { err, ok, type Result } from "./lib/fp";

export interface WaitForOptions {
	/** Condition function to check */
	condition: () => boolean;
	/** Maximum number of attempts (default: 10) */
	maxAttempts?: number;
	/** Base delay in milliseconds for exponential backoff (default: 100) */
	baseDelay?: number;
	/** Maximum delay cap in milliseconds (default: 2000) */
	maxDelay?: number;
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
 *   maxAttempts: 10,
 *   baseDelay: 100,
 * });
 *
 * if (!result.ok) {
 *   console.error(`Timed out after ${result.error.attempts} attempts`);
 * }
 */
export async function waitForCondition(
	options: WaitForOptions,
): Promise<Result<void, WaitError>> {
	const {
		condition,
		maxAttempts = 10,
		baseDelay = 100,
		maxDelay = 2000,
	} = options;

	const attempt = async (
		currentAttempt: number,
	): Promise<Result<void, WaitError>> => {
		// Base case: exceeded max attempts
		if (currentAttempt >= maxAttempts) {
			return err(conditionTimeout(currentAttempt));
		}

		// Check condition, capturing any thrown errors
		try {
			if (condition()) {
				return ok(undefined);
			}
		} catch (error) {
			return err(maxRetriesExceeded(currentAttempt + 1, error));
		}

		// Wait with exponential backoff before next attempt, clamped to maxDelay
		// Delay formula: baseDelay * 2^(attempt-1) where attempt is 1-indexed
		const uncappedDelay = baseDelay * 2 ** currentAttempt;
		const delay = Math.min(uncappedDelay, maxDelay);
		await new Promise((resolve) => setTimeout(resolve, delay));

		// Recursive call with incremented attempt
		return attempt(currentAttempt + 1);
	};

	return attempt(0);
}
