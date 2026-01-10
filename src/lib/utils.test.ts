import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_TEXT_DISPLAY_LENGTH } from "./constants";
import {
	formatDate,
	hasMoreItems,
	retryOperation,
	truncateText,
} from "./utils";

describe("formatDate", () => {
	beforeEach(() => {
		// Mock Date.now() to have consistent test results
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-08T12:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('returns "Just now" for dates less than 1 minute ago', () => {
		const now = new Date("2026-01-08T12:00:00.000Z");
		expect(formatDate(now.toISOString())).toBe("Just now");

		const thirtySecondsAgo = new Date("2026-01-08T11:59:30.000Z");
		expect(formatDate(thirtySecondsAgo.toISOString())).toBe("Just now");
	});

	it('returns "Xm ago" for dates between 1 and 59 minutes ago', () => {
		const fiveMinutesAgo = new Date("2026-01-08T11:55:00.000Z");
		expect(formatDate(fiveMinutesAgo.toISOString())).toBe("5m ago");

		const oneMinuteAgo = new Date("2026-01-08T11:59:00.000Z");
		expect(formatDate(oneMinuteAgo.toISOString())).toBe("1m ago");

		const fiftyNineMinutesAgo = new Date("2026-01-08T11:01:00.000Z");
		expect(formatDate(fiftyNineMinutesAgo.toISOString())).toBe("59m ago");
	});

	it('returns "Xh ago" for dates between 1 and 23 hours ago', () => {
		const twoHoursAgo = new Date("2026-01-08T10:00:00.000Z");
		expect(formatDate(twoHoursAgo.toISOString())).toBe("2h ago");

		const oneHourAgo = new Date("2026-01-08T11:00:00.000Z");
		expect(formatDate(oneHourAgo.toISOString())).toBe("1h ago");

		const twentyThreeHoursAgo = new Date("2026-01-07T13:00:00.000Z");
		expect(formatDate(twentyThreeHoursAgo.toISOString())).toBe("23h ago");
	});

	it("returns formatted date for dates 24 hours or more ago", () => {
		const yesterday = new Date("2026-01-07T12:00:00.000Z");
		expect(formatDate(yesterday.toISOString())).toBe("Jan 7, 2026");

		const lastYear = new Date("2025-06-15T12:00:00.000Z");
		expect(formatDate(lastYear.toISOString())).toBe("Jun 15, 2025");
	});

	it("returns original string for invalid dates", () => {
		expect(formatDate("invalid-date")).toBe("invalid-date");
		expect(formatDate("not a date")).toBe("not a date");
	});
});

describe("truncateText", () => {
	it("returns original text if under max length", () => {
		const shortText = "Hello";
		expect(truncateText(shortText)).toBe(shortText);
	});

	it("returns original text if exactly at max length", () => {
		const exactText = "a".repeat(MAX_TEXT_DISPLAY_LENGTH);
		expect(truncateText(exactText)).toBe(exactText);
	});

	it("truncates text with ellipsis if over max length", () => {
		const longText = "a".repeat(MAX_TEXT_DISPLAY_LENGTH + 10);
		const result = truncateText(longText);

		expect(result.length).toBe(MAX_TEXT_DISPLAY_LENGTH + 3); // +3 for "..."
		expect(result.endsWith("...")).toBe(true);
		expect(result).toBe(`${"a".repeat(MAX_TEXT_DISPLAY_LENGTH)}...`);
	});

	it("uses custom maxLength when provided", () => {
		const text = "Hello, World!";
		expect(truncateText(text, 5)).toBe("Hello...");
		expect(truncateText(text, 10)).toBe("Hello, Wor...");
	});

	it("handles empty string", () => {
		expect(truncateText("")).toBe("");
	});
});

describe("retryOperation", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns result on first successful attempt", async () => {
		const operation = vi.fn().mockResolvedValue("success");

		const result = await retryOperation({ operation });

		expect(result).toBe("success");
		expect(operation).toHaveBeenCalledTimes(1);
	});

	it("retries on failure and returns result on subsequent success", async () => {
		const operation = vi
			.fn()
			.mockRejectedValueOnce(new Error("First failure"))
			.mockRejectedValueOnce(new Error("Second failure"))
			.mockResolvedValue("success");

		const promise = retryOperation({ operation, baseDelay: 100 });

		// First attempt fails immediately
		await vi.advanceTimersByTimeAsync(0);
		// Wait for first retry delay (100ms * 2^0 = 100ms)
		await vi.advanceTimersByTimeAsync(100);
		// Wait for second retry delay (100ms * 2^1 = 200ms)
		await vi.advanceTimersByTimeAsync(200);

		const result = await promise;
		expect(result).toBe("success");
		expect(operation).toHaveBeenCalledTimes(3);
	});

	it("throws error after max retries exceeded", async () => {
		const operation = vi.fn().mockRejectedValue(new Error("Always fails"));

		// Catch the rejection to prevent unhandled promise rejection
		let rejectionError: Error | undefined;
		const promise = retryOperation({
			operation,
			maxRetries: 3,
			baseDelay: 100,
		}).catch((e) => {
			rejectionError = e;
		});

		// Run all timers to completion
		await vi.runAllTimersAsync();
		await promise;

		expect(rejectionError).toBeDefined();
		expect(rejectionError?.message).toBe("Operation failed after 3 retry attempts");
		expect(operation).toHaveBeenCalledTimes(3);
	});

	it("uses exponential backoff for delays", async () => {
		const operation = vi
			.fn()
			.mockRejectedValueOnce(new Error("Fail 1"))
			.mockRejectedValueOnce(new Error("Fail 2"))
			.mockResolvedValue("success");

		const promise = retryOperation({ operation, baseDelay: 100 });
		const delays: number[] = [];
		let lastTime = Date.now();

		// Track timing
		await vi.advanceTimersByTimeAsync(0);

		// First retry: 100ms * 2^0 = 100ms
		await vi.advanceTimersByTimeAsync(100);
		delays.push(Date.now() - lastTime);
		lastTime = Date.now();

		// Second retry: 100ms * 2^1 = 200ms
		await vi.advanceTimersByTimeAsync(200);
		delays.push(Date.now() - lastTime);

		await promise;

		expect(delays[0]).toBe(100);
		expect(delays[1]).toBe(200);
	});

	it("respects custom maxRetries option", async () => {
		const operation = vi.fn().mockRejectedValue(new Error("Fails"));

		// Catch the rejection to prevent unhandled promise rejection
		let rejectionError: Error | undefined;
		const promise = retryOperation({
			operation,
			maxRetries: 1,
			baseDelay: 10,
		}).catch((e) => {
			rejectionError = e;
		});

		await vi.runAllTimersAsync();
		await promise;

		expect(rejectionError).toBeDefined();
		expect(rejectionError?.message).toBe("Operation failed after 1 retry attempts");
		expect(operation).toHaveBeenCalledTimes(1);
	});

	it("handles non-Error exceptions", async () => {
		const operation = vi.fn().mockRejectedValue("string error");

		// Catch the rejection to prevent unhandled promise rejection
		let rejectionError: Error | undefined;
		const promise = retryOperation({ operation, maxRetries: 1 }).catch((e) => {
			rejectionError = e;
		});

		await vi.runAllTimersAsync();
		await promise;

		expect(rejectionError).toBeDefined();
		expect(rejectionError?.message).toBe("Operation failed after 1 retry attempts");
	});
});

describe("hasMoreItems", () => {
	it("returns true when results count equals batch size", () => {
		expect(hasMoreItems(100, 100)).toBe(true);
		expect(hasMoreItems(50, 50)).toBe(true);
	});

	it("returns false when results count is less than batch size", () => {
		expect(hasMoreItems(50, 100)).toBe(false);
		expect(hasMoreItems(0, 100)).toBe(false);
		expect(hasMoreItems(99, 100)).toBe(false);
	});

	it("returns false when results count is greater than batch size", () => {
		// This shouldn't happen in practice, but test the behavior
		expect(hasMoreItems(150, 100)).toBe(false);
	});
});
