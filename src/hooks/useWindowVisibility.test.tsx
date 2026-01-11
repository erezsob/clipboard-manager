import { act, renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VISIBILITY_CHECK_INTERVAL } from "../lib/constants";
import { getMockElectronAPI } from "../test/setup";
import { useWindowVisibility } from "./useWindowVisibility";

describe("useWindowVisibility", () => {
	const createMockSearchInputRef = (): RefObject<HTMLInputElement | null> => ({
		current: null,
	});

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("calls onBecomeVisible when window transitions from hidden to visible", async () => {
		const mockApi = getMockElectronAPI();
		const onBecomeVisible = vi.fn();

		// Start with window hidden
		mockApi.window.isVisible.mockResolvedValue(false);

		renderHook(() =>
			useWindowVisibility({
				searchInputRef: createMockSearchInputRef(),
				onBecomeVisible,
			}),
		);

		// Initial check runs on mount - window is hidden
		await act(async () => {
			await vi.advanceTimersByTimeAsync(0);
		});

		expect(onBecomeVisible).not.toHaveBeenCalled();

		// Window becomes visible
		mockApi.window.isVisible.mockResolvedValue(true);

		// Advance past the visibility check interval
		await act(async () => {
			await vi.advanceTimersByTimeAsync(VISIBILITY_CHECK_INTERVAL);
		});

		expect(onBecomeVisible).toHaveBeenCalledTimes(1);
	});

	it("does not call onBecomeVisible when window stays visible", async () => {
		const mockApi = getMockElectronAPI();
		const onBecomeVisible = vi.fn();

		// Start with window hidden, then become visible
		mockApi.window.isVisible.mockResolvedValue(false);

		renderHook(() =>
			useWindowVisibility({
				searchInputRef: createMockSearchInputRef(),
				onBecomeVisible,
			}),
		);

		// Initial check
		await act(async () => {
			await vi.advanceTimersByTimeAsync(0);
		});

		// Window becomes visible
		mockApi.window.isVisible.mockResolvedValue(true);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(VISIBILITY_CHECK_INTERVAL);
		});

		expect(onBecomeVisible).toHaveBeenCalledTimes(1);

		// Window stays visible - advance several more intervals
		await act(async () => {
			await vi.advanceTimersByTimeAsync(VISIBILITY_CHECK_INTERVAL * 3);
		});

		// Should still only be called once (no re-triggers)
		expect(onBecomeVisible).toHaveBeenCalledTimes(1);
	});

	it("calls onBecomeVisible again after window is hidden and shown again", async () => {
		const mockApi = getMockElectronAPI();
		const onBecomeVisible = vi.fn();

		// Start hidden
		mockApi.window.isVisible.mockResolvedValue(false);

		renderHook(() =>
			useWindowVisibility({
				searchInputRef: createMockSearchInputRef(),
				onBecomeVisible,
			}),
		);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(0);
		});

		// First show
		mockApi.window.isVisible.mockResolvedValue(true);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(VISIBILITY_CHECK_INTERVAL);
		});

		expect(onBecomeVisible).toHaveBeenCalledTimes(1);

		// Hide again
		mockApi.window.isVisible.mockResolvedValue(false);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(VISIBILITY_CHECK_INTERVAL);
		});

		// Show again
		mockApi.window.isVisible.mockResolvedValue(true);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(VISIBILITY_CHECK_INTERVAL);
		});

		expect(onBecomeVisible).toHaveBeenCalledTimes(2);
	});

	it("returns current visibility state", async () => {
		const mockApi = getMockElectronAPI();
		mockApi.window.isVisible.mockResolvedValue(false);

		const { result } = renderHook(() =>
			useWindowVisibility({
				searchInputRef: createMockSearchInputRef(),
			}),
		);

		// Initial state
		expect(result.current.isVisible).toBe(false);

		// Window becomes visible
		mockApi.window.isVisible.mockResolvedValue(true);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(VISIBILITY_CHECK_INTERVAL);
		});

		expect(result.current.isVisible).toBe(true);
	});

	it("focuses search input when window becomes visible", async () => {
		const mockApi = getMockElectronAPI();
		const mockFocus = vi.fn();
		const searchInputRef: RefObject<HTMLInputElement | null> = {
			current: { focus: mockFocus } as unknown as HTMLInputElement,
		};

		mockApi.window.isVisible.mockResolvedValue(false);

		renderHook(() =>
			useWindowVisibility({
				searchInputRef,
			}),
		);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(0);
		});

		// Window becomes visible
		mockApi.window.isVisible.mockResolvedValue(true);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(VISIBILITY_CHECK_INTERVAL);
		});

		// Need to advance past SEARCH_FOCUS_DELAY for the focus to happen
		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});

		expect(mockFocus).toHaveBeenCalled();
	});
});
