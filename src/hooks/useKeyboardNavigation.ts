import { useCallback, useEffect, useState } from "react";
import type { HistoryItem } from "../lib/db";

interface UseKeyboardNavigationOptions {
	/** Whether the window is currently visible */
	isVisible: boolean;
	/** The filtered history items to navigate */
	filteredHistory: HistoryItem[];
	/** Callback when Escape key is pressed */
	onEscape?: () => void;
	/** Callback when Enter key is pressed with selected item */
	onEnter?: (item: HistoryItem) => Promise<void>;
	/** Optional callback when selected index changes */
	onSelectedIndexChange?: (index: number) => void;
	/** Optional callback to scroll to a specific index */
	onScrollToIndex?: (index: number) => void;
}

/**
 * Hook that manages keyboard navigation and selected index
 * Handles Arrow keys, Enter, and Escape keyboard shortcuts
 * @returns Selected index state and setter
 */
export function useKeyboardNavigation({
	isVisible,
	filteredHistory,
	onEscape,
	onEnter,
	onSelectedIndexChange,
	onScrollToIndex,
}: UseKeyboardNavigationOptions) {
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Update selected index and notify callback
	const updateSelectedIndex = useCallback(
		(newIndex: number) => {
			setSelectedIndex(newIndex);
			onSelectedIndexChange?.(newIndex);
		},
		[onSelectedIndexChange],
	);

	// Keyboard handlers
	const handleKeyDown = useCallback(
		async (e: KeyboardEvent) => {
			if (!isVisible) return;

			// Escape: Hide window
			if (e.key === "Escape") {
				onEscape?.();
				updateSelectedIndex(0);
				return;
			}

			// Enter: Copy selected item and hide
			if (e.key === "Enter" && filteredHistory.length > 0) {
				const selectedItem = filteredHistory[selectedIndex];
				if (selectedItem && onEnter) {
					await onEnter(selectedItem);
					updateSelectedIndex(0);
				}
				return;
			}

			// Arrow Up: Navigate up
			if (e.key === "ArrowUp") {
				e.preventDefault();
				const newIndex =
					selectedIndex > 0 ? selectedIndex - 1 : filteredHistory.length - 1;
				updateSelectedIndex(newIndex);
				onScrollToIndex?.(newIndex);
				return;
			}

			// Arrow Down: Navigate down
			if (e.key === "ArrowDown") {
				e.preventDefault();
				const newIndex =
					selectedIndex < filteredHistory.length - 1 ? selectedIndex + 1 : 0;
				updateSelectedIndex(newIndex);
				onScrollToIndex?.(newIndex);
				return;
			}
		},
		[
			isVisible,
			filteredHistory,
			selectedIndex,
			onEscape,
			onEnter,
			updateSelectedIndex,
			onScrollToIndex,
		],
	);

	// Register keyboard event listener
	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleKeyDown]);

	return {
		selectedIndex,
		setSelectedIndex: updateSelectedIndex,
	};
}
