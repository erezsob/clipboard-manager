import { useEffect, useState } from "react";
import {
	SEARCH_FOCUS_DELAY,
	VISIBILITY_CHECK_INTERVAL,
} from "../lib/constants";

/**
 * Hook that manages window visibility state and syncs with Electron window
 * Automatically focuses search input when window becomes visible
 * @param searchInputRef - Ref to the search input element to focus when visible
 * @returns Window visibility state and setter
 */
export function useWindowVisibility(
	searchInputRef: React.RefObject<HTMLInputElement | null>,
) {
	const [isVisible, setIsVisible] = useState(false);

	// Sync window visibility state with Electron window
	// Global shortcut is handled in Electron main process
	useEffect(() => {
		const checkVisibility = async () => {
			if (!window.electronAPI) return;

			try {
				const visible = await window.electronAPI.window.isVisible();
				setIsVisible(visible);
				if (visible) {
					clearInterval(interval);
					// Focus search input when window becomes visible
					setTimeout(() => {
						searchInputRef.current?.focus();
					}, SEARCH_FOCUS_DELAY);
				}
			} catch (error) {
				console.error("Failed to check window visibility:", error);
			}
		};

		const interval = setInterval(checkVisibility, VISIBILITY_CHECK_INTERVAL);
		return () => clearInterval(interval);
	}, [searchInputRef]);

	return {
		isVisible,
		setIsVisible,
	};
}
