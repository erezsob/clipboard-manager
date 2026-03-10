import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockHistoryItems } from "../test/mocks/history";
import { useKeyboardNavigation } from "./useKeyboardNavigation";

function pressKey(key: string) {
	window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("useKeyboardNavigation", () => {
	const mockItems = createMockHistoryItems(5);

	const defaultOptions = {
		isVisible: true,
		filteredHistory: mockItems,
		onEscape: vi.fn(),
		onEnter: vi.fn().mockResolvedValue(undefined),
		onScrollToIndex: vi.fn(),
	};

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("starts with selectedIndex 0", () => {
		const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

		expect(result.current.selectedIndex).toBe(0);
	});

	it("navigates down with ArrowDown", () => {
		const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

		act(() => pressKey("ArrowDown"));

		expect(result.current.selectedIndex).toBe(1);
		expect(defaultOptions.onScrollToIndex).toHaveBeenCalledWith(1);
	});

	it("navigates up with ArrowUp", () => {
		const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

		act(() => pressKey("ArrowDown"));
		act(() => pressKey("ArrowDown"));
		act(() => pressKey("ArrowUp"));

		expect(result.current.selectedIndex).toBe(1);
	});

	it("does not go below 0 with ArrowUp", () => {
		const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

		act(() => pressKey("ArrowUp"));

		expect(result.current.selectedIndex).toBe(0);
	});

	it("does not go past last item with ArrowDown", () => {
		const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

		for (let i = 0; i < 10; i++) {
			act(() => pressKey("ArrowDown"));
		}

		expect(result.current.selectedIndex).toBe(mockItems.length - 1);
	});

	it("calls onEscape and resets index on Escape", () => {
		const { result } = renderHook(() => useKeyboardNavigation(defaultOptions));

		act(() => pressKey("ArrowDown"));
		act(() => pressKey("Escape"));

		expect(defaultOptions.onEscape).toHaveBeenCalled();
		expect(result.current.selectedIndex).toBe(0);
	});

	it("calls onEnter with selected item on Enter", async () => {
		renderHook(() => useKeyboardNavigation(defaultOptions));

		act(() => pressKey("ArrowDown"));
		act(() => pressKey("Enter"));
		// Flush the microtask from the async onEnter → updateSelectedIndex continuation
		await act(async () => {});

		expect(defaultOptions.onEnter).toHaveBeenCalledWith(mockItems[1]);
	});

	it("ignores keys when not visible", () => {
		const { result } = renderHook(() =>
			useKeyboardNavigation({ ...defaultOptions, isVisible: false }),
		);

		act(() => pressKey("ArrowDown"));

		expect(result.current.selectedIndex).toBe(0);
		expect(defaultOptions.onScrollToIndex).not.toHaveBeenCalled();
	});
});
