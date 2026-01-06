import { useEffect, useRef, useState } from "react";
import { INITIAL_LOAD_COUNT } from "../lib/constants";
import { addClip, getHistory, type HistoryItem } from "../lib/db";

/** Interval for polling clipboard (ms) */
const CLIPBOARD_POLL_INTERVAL = 1000;

/** Delay before retrying history load after failure (ms) */
const HISTORY_LOAD_RETRY_DELAY = 500;

/** Delay before initializing to allow Electron API to be ready (ms) */
const INITIALIZATION_DELAY = 100;

/**
 * Hook that polls the clipboard and manages history
 * Automatically detects clipboard changes and updates history
 */
export function useClipboard() {
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [lastClipboardText, setLastClipboardText] = useState<string>("");
	const intervalRef = useRef<number | null>(null);

	// Initialize and load history
	useEffect(() => {
		const init = async () => {
			try {
				// Wait a bit for Electron API to be ready
				await new Promise((resolve) =>
					setTimeout(resolve, INITIALIZATION_DELAY),
				);
				const items = await getHistory(INITIAL_LOAD_COUNT);
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
				if (text && text !== lastClipboardText) {
					setLastClipboardText(text);
					await addClip(text);
					// Refresh with initial load count
					const items = await getHistory(INITIAL_LOAD_COUNT);
					setHistory(items);
				}
			} catch (error) {
				console.error("Error reading clipboard:", error);
			}
		};

		pollClipboard();
		intervalRef.current = window.setInterval(
			pollClipboard,
			CLIPBOARD_POLL_INTERVAL,
		);

		return () => {
			if (intervalRef.current !== null) {
				clearInterval(intervalRef.current);
			}
		};
	}, [lastClipboardText]);

	/**
	 * Manually refresh history from database
	 */
	const refreshHistory = async () => {
		const items = await getHistory(INITIAL_LOAD_COUNT);
		setHistory(items);
	};

	return {
		history,
		refreshHistory,
	};
}
