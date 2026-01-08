import { useCallback, useEffect, useRef, useState } from "react";
import {
	SEARCH_FOCUS_DELAY,
	VISIBILITY_CHECK_INTERVAL,
} from "../lib/constants";

interface UseWindowVisibilityOptions {
	/** Ref to the search input element to focus when visible */
	searchInputRef: React.RefObject<HTMLInputElement | null>;
	/** Optional callback when window becomes visible */
	onBecomeVisible?: () => void;
}

/**
 * Hook that manages window visibility state and syncs with Electron window
 * Automatically focuses search input when window becomes visible
 * @returns Window visibility state and setter
 */
export function useWindowVisibility({
	searchInputRef,
	onBecomeVisible,
}: UseWindowVisibilityOptions) {
	const [isVisible, setIsVisible] = useState(false);
	const wasVisibleRef = useRef(false);

	const onBecomeVisibleRef = useRef(onBecomeVisible);
	onBecomeVisibleRef.current = onBecomeVisible;

	// Sync window visibility state with Electron window
	// Global shortcut is handled in Electron main process
	useEffect(() => {
		const checkVisibility = async () => {
			if (!window.electronAPI) return;

			try {
				const visible = await window.electronAPI.window.isVisible();
				setIsVisible(visible);

				// Detect transition from hidden to visible
				if (visible && !wasVisibleRef.current) {
					// Focus search input when window becomes visible
					setTimeout(() => {
						searchInputRef.current?.focus();
					}, SEARCH_FOCUS_DELAY);

					// Call the onBecomeVisible callback
					onBecomeVisibleRef.current?.();
				}

				wasVisibleRef.current = visible;
			} catch (error) {
				console.error("Failed to check window visibility:", error);
			}
		};

		const interval = setInterval(checkVisibility, VISIBILITY_CHECK_INTERVAL);
		// Run immediately on mount
		checkVisibility();

		return () => clearInterval(interval);
	}, [searchInputRef]);

	// Manual setter that also updates the ref
	const setVisibleState = useCallback((visible: boolean) => {
		setIsVisible(visible);
		wasVisibleRef.current = visible;
	}, []);

	return {
		isVisible,
		setIsVisible: setVisibleState,
	};
}
