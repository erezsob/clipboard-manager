import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { useEffect, useRef, useState } from "react";
import { addClip, getHistory } from "../lib/db";

export interface HistoryItem {
	id: number;
	content: string;
	type: string;
	created_at: string;
}

/**
 * Hook that polls the clipboard and manages history
 */
export function useClipboard() {
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [lastClipboardText, setLastClipboardText] = useState<string>("");
	const intervalRef = useRef<number | null>(null);

	// Initialize database and load history
	useEffect(() => {
		const init = async () => {
			// Wait for Tauri to be available before initializing database
			const waitForTauri = (): Promise<void> => {
				return new Promise((resolve) => {
					if (typeof window !== "undefined" && window.__TAURI__) {
						resolve();
					} else {
						setTimeout(() => waitForTauri().then(resolve), 100);
					}
				});
			};

			try {
				await waitForTauri();
				const { initDB } = await import("../lib/db");
				await initDB();
				const items = await getHistory();
				console.log("TCL: ~ init ~ items:", items);
				setHistory(items);
			} catch (error) {
				console.error("Failed to initialize database:", error);
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
				// Check if Tauri is available before calling the API
				if (typeof window === "undefined" || !window.__TAURI__) {
					return;
				}

				const text = await readText();
				console.log("TCL: ~ pollClipboard ~ text:", text);
				if (text && text !== lastClipboardText) {
					setLastClipboardText(text);
					await addClip(text);
					// Refresh history after adding
					const items = await getHistory();
					setHistory(items);
				}
			} catch (error) {
				// Only log errors that aren't about Tauri not being available
				if (error instanceof Error && error.message.includes("invoke")) {
					// Tauri API not ready yet, silently skip this poll
					return;
				}
				console.error("Error reading clipboard:", error);
			}
		};

		// Wait a bit for Tauri to initialize, then start polling
		const startPolling = () => {
			if (typeof window !== "undefined" && window.__TAURI__) {
				pollClipboard();
				intervalRef.current = window.setInterval(pollClipboard, 1000);
			} else {
				// Retry after a short delay if Tauri isn't ready yet
				setTimeout(startPolling, 100);
			}
		};

		startPolling();

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
