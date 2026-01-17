import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { CLIPBOARD_POLL_INTERVAL } from "../../lib/constants";
import { addClipResult } from "../../lib/db";
import { historyKeys } from "../../lib/queryKeys";
import { waitForElectronAPIResult } from "../../lib/utils";
import { detectClipboardChange, normalizeClipboardText } from "./utils";

/**
 * Hook that monitors clipboard changes and adds new content to history
 * Polls clipboard at regular intervals and invalidates history queries
 * when new content is detected
 */
export function useClipboardMonitor() {
	const queryClient = useQueryClient();
	const lastClipboardTextRef = useRef<string>("");
	const intervalRef = useRef<number | null>(null);

	useEffect(() => {
		const pollClipboard = async () => {
			try {
				if (!window.electronAPI) return;

				const clipboardData = await window.electronAPI.clipboard.read();
				const currentText = normalizeClipboardText(clipboardData.text);
				const change = detectClipboardChange(
					currentText,
					lastClipboardTextRef.current,
				);

				if (change.some) {
					lastClipboardTextRef.current = change.value;
					const result = await addClipResult({
						text: change.value,
						rtf: clipboardData.rtf,
					});
					if (!result.ok) {
						console.error("Failed to add clip:", result.error.message);
					}
					// Invalidate history queries to show new item
					queryClient.invalidateQueries({ queryKey: historyKeys.all });
				}
			} catch (error) {
				console.error("Error reading clipboard:", error);
			}
		};

		const startPolling = async () => {
			try {
				const result = await waitForElectronAPIResult();
				if (!result.ok) {
					console.error(
						"Failed to wait for electron API:",
						result.error.message,
					);
					return;
				}

				// Initialize with current clipboard content
				try {
					const clipboardData = await window.electronAPI.clipboard.read();
					lastClipboardTextRef.current = normalizeClipboardText(
						clipboardData.text,
					);
				} catch (error) {
					console.error("Error reading initial clipboard:", error);
				}

				// Start polling
				pollClipboard();
				intervalRef.current = window.setInterval(
					pollClipboard,
					CLIPBOARD_POLL_INTERVAL,
				);
			} catch (error) {
				console.error("Failed to start clipboard monitoring:", error);
			}
		};

		startPolling();

		return () => {
			if (intervalRef.current !== null) {
				clearInterval(intervalRef.current);
			}
		};
	}, [queryClient]);
}
