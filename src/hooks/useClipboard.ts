import { useEffect, useRef, useState } from "react";
import { addClip, getHistory, type HistoryItem } from "../lib/db";

/**
 * Hook that polls the clipboard and manages history
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
				await new Promise((resolve) => setTimeout(resolve, 100));
				const items = await getHistory();
				setHistory(items);
			} catch (error) {
				console.error("Failed to load history:", error);
				// Retry after a delay
				setTimeout(init, 500);
			}
		};
		init();
	}, []);

	// Poll clipboard every 1000ms
	useEffect(() => {
		const pollClipboard = async () => {
			try {
				if (!window.electronAPI) return;

				const text = await window.electronAPI.clipboard.readText();
				if (text && text !== lastClipboardText) {
					setLastClipboardText(text);
					await addClip(text);
					const items = await getHistory();
					setHistory(items);
				}
			} catch (error) {
				console.error("Error reading clipboard:", error);
			}
		};

		pollClipboard();
		intervalRef.current = window.setInterval(pollClipboard, 1000);

		return () => {
			if (intervalRef.current !== null) {
				clearInterval(intervalRef.current);
			}
		};
	}, [lastClipboardText]);

	// Refresh history function
	const refreshHistory = async () => {
		const items = await getHistory();
		setHistory(items);
	};

	return {
		history,
		refreshHistory,
	};
}
