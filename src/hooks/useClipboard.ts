import { useEffect, useRef, useState } from "react";
import { INITIAL_LOAD_COUNT } from "../lib/constants";
import { addClip, getHistory, type HistoryItem } from "../lib/db";
import { waitFor } from "../utils";

/** Interval for polling clipboard (ms) */
const CLIPBOARD_POLL_INTERVAL = 1000;

/** Delay before retrying history load after failure (ms) */
const HISTORY_LOAD_RETRY_DELAY = 500;

/**
 * Hook that polls the clipboard and manages history
 * Automatically detects clipboard changes and updates history
 */
export function useClipboard() {
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const lastClipboardTextRef = useRef<string>("");
	const intervalRef = useRef<number | null>(null);

	// Initialize and load history
	useEffect(() => {
		const init = async () => {
			try {
				// Wait a bit for Electron API to be ready
				await waitFor(() => window.electronAPI !== undefined);

				// Initialize lastClipboardTextRef with current clipboard content
				try {
					const currentText = await window.electronAPI.clipboard.readText();
					lastClipboardTextRef.current = currentText || "";
				} catch (error) {
					console.error("Error reading initial clipboard:", error);
				}

				const items = await getHistory({ limit: INITIAL_LOAD_COUNT });
				setHistory(items);
			} catch (error) {
				console.error("Failed to load history:", error);
				// Retry after a delay
				setTimeout(init, HISTORY_LOAD_RETRY_DELAY);
			}
		};
		init();
	}, []);

	// Poll clipboard at regular intervals
	useEffect(() => {
		const pollClipboard = async () => {
			try {
				if (!window.electronAPI) return;

				const text = await window.electronAPI.clipboard.readText();
				const currentText = text || "";

				if (currentText && currentText !== lastClipboardTextRef.current) {
					lastClipboardTextRef.current = currentText;
					await addClip(currentText);
					// Refresh with initial load count
					const items = await getHistory({ limit: INITIAL_LOAD_COUNT });
					setHistory(items);
				}
			} catch (error) {
				console.error("Error reading clipboard:", error);
			}
		};

		// Start polling after a short delay to ensure Electron API is ready
		const startPolling = async () => {
			await waitFor(() => window.electronAPI !== undefined);
			pollClipboard();
			intervalRef.current = window.setInterval(
				pollClipboard,
				CLIPBOARD_POLL_INTERVAL,
			);
		};

		startPolling();

		return () => {
			if (intervalRef.current !== null) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	/**
	 * Manually refresh history from database
	 */
	const refreshHistory = async () => {
		const items = await getHistory({ limit: INITIAL_LOAD_COUNT });
		setHistory(items);
	};

	return {
		history,
		refreshHistory,
	};
}
