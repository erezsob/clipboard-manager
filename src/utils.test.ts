import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitForCondition } from "./utils";

describe("waitForCondition", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns ok result immediately when condition is true on first check", async () => {
		const condition = vi.fn().mockReturnValue(true);

		const result = await waitForCondition({ condition });

		expect(result.ok).toBe(true);
		expect(condition).toHaveBeenCalledTimes(1);
	});

	it("waits until condition becomes true and returns ok result", async () => {
		let callCount = 0;
		const condition = vi.fn(() => {
			callCount++;
			return callCount >= 3;
		});

		const promise = waitForCondition({ condition, maxAttempts: 10, baseDelay: 10 });

		// First check - false
		await vi.advanceTimersByTimeAsync(0);
		expect(condition).toHaveBeenCalledTimes(1);

		// Wait for first retry delay (10ms * 2^0 = 10ms)
		await vi.advanceTimersByTimeAsync(10);
		expect(condition).toHaveBeenCalledTimes(2);

		// Wait for second retry delay (10ms * 2^1 = 20ms)
		await vi.advanceTimersByTimeAsync(20);
		expect(condition).toHaveBeenCalledTimes(3);

		const result = await promise;
		expect(result.ok).toBe(true);
		expect(condition).toHaveBeenCalledTimes(3);
	});

	it("returns error result after max attempts exceeded", async () => {
		const condition = vi.fn().mockReturnValue(false);

		const promise = waitForCondition({ condition, maxAttempts: 3, baseDelay: 10 });

		// Run all timers to completion
		await vi.runAllTimersAsync();
		const result = await promise;

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe("CONDITION_TIMEOUT");
			expect(result.error.message).toBe("Condition not met after 3 attempts");
			expect(result.error.attempts).toBe(3);
		}
		expect(condition).toHaveBeenCalledTimes(3);
		expect.assertions(5);
	});

	it("uses exponential backoff for delays", async () => {
		let callCount = 0;
		const condition = vi.fn(() => {
			callCount++;
			return callCount >= 4;
		});

		const promise = waitForCondition({ condition, maxAttempts: 10, baseDelay: 10 });

		// First check - immediate
		await vi.advanceTimersByTimeAsync(0);

		// First retry: 10ms * 2^0 = 10ms
		await vi.advanceTimersByTimeAsync(10);
		expect(condition).toHaveBeenCalledTimes(2);

		// Second retry: 10ms * 2^1 = 20ms
		await vi.advanceTimersByTimeAsync(20);
		expect(condition).toHaveBeenCalledTimes(3);

		// Third retry: 10ms * 2^2 = 40ms
		await vi.advanceTimersByTimeAsync(40);
		expect(condition).toHaveBeenCalledTimes(4);

		const result = await promise;
		expect(result.ok).toBe(true);
	});

	it("uses default values when not specified", async () => {
		const condition = vi.fn().mockReturnValue(true);

		const result = await waitForCondition({ condition });

		expect(result.ok).toBe(true);
		expect(condition).toHaveBeenCalledTimes(1);
	});

	it("respects custom maxAttempts", async () => {
		const condition = vi.fn().mockReturnValue(false);

		const promise = waitForCondition({ condition, maxAttempts: 2, baseDelay: 10 });

		// Run all timers to completion
		await vi.runAllTimersAsync();
		const result = await promise;

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.type).toBe("CONDITION_TIMEOUT");
			expect(result.error.message).toBe("Condition not met after 2 attempts");
			expect(result.error.attempts).toBe(2);
		}
		expect(condition).toHaveBeenCalledTimes(2);
		expect.assertions(5);
	});
});
