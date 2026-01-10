import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "./utils";

describe("waitFor", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("resolves immediately when condition is true on first check", async () => {
		const condition = vi.fn().mockReturnValue(true);

		await waitFor(condition);

		expect(condition).toHaveBeenCalledTimes(1);
	});

	it("waits until condition becomes true", async () => {
		let callCount = 0;
		const condition = vi.fn(() => {
			callCount++;
			return callCount >= 3;
		});

		const promise = waitFor(condition, 10, 10);

		// First check - false
		await vi.advanceTimersByTimeAsync(0);
		expect(condition).toHaveBeenCalledTimes(1);

		// Wait for first retry delay (10ms * 2^1 = 20ms)
		await vi.advanceTimersByTimeAsync(20);
		expect(condition).toHaveBeenCalledTimes(2);

		// Wait for second retry delay (10ms * 2^2 = 40ms)
		await vi.advanceTimersByTimeAsync(40);
		expect(condition).toHaveBeenCalledTimes(3);

		await promise;
		expect(condition).toHaveBeenCalledTimes(3);
	});

	it("throws error after max attempts exceeded", async () => {
		const condition = vi.fn().mockReturnValue(false);

		// Store the rejection to handle it properly
		let rejectionError: Error | undefined;
		const promise = waitFor(condition, 3, 10).catch((e) => {
			rejectionError = e;
		});

		// Run all timers to completion
		await vi.runAllTimersAsync();
		await promise;

		expect(rejectionError).toBeDefined();
		expect(rejectionError?.message).toBe("Condition not met after 3 attempts");
		expect(condition).toHaveBeenCalledTimes(3);
	});

	it("uses exponential backoff for delays", async () => {
		let callCount = 0;
		const condition = vi.fn(() => {
			callCount++;
			return callCount >= 4;
		});

		const promise = waitFor(condition, 10, 10);

		// First check - immediate
		await vi.advanceTimersByTimeAsync(0);

		// First retry: 10ms * 2^1 = 20ms
		await vi.advanceTimersByTimeAsync(20);
		expect(condition).toHaveBeenCalledTimes(2);

		// Second retry: 10ms * 2^2 = 40ms
		await vi.advanceTimersByTimeAsync(40);
		expect(condition).toHaveBeenCalledTimes(3);

		// Third retry: 10ms * 2^3 = 80ms
		await vi.advanceTimersByTimeAsync(80);
		expect(condition).toHaveBeenCalledTimes(4);

		await promise;
	});

	it("uses default values when not specified", async () => {
		const condition = vi.fn().mockReturnValue(true);

		await waitFor(condition);

		expect(condition).toHaveBeenCalledTimes(1);
	});

	it("respects custom maxAttempts", async () => {
		const condition = vi.fn().mockReturnValue(false);

		// Store the rejection to handle it properly
		let rejectionError: Error | undefined;
		const promise = waitFor(condition, 2, 10).catch((e) => {
			rejectionError = e;
		});

		// Run all timers to completion
		await vi.runAllTimersAsync();
		await promise;

		expect(rejectionError).toBeDefined();
		expect(rejectionError?.message).toBe("Condition not met after 2 attempts");
		expect(condition).toHaveBeenCalledTimes(2);
	});
});
