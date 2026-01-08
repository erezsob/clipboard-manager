import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { CLIPBOARD_POLL_INTERVAL } from "../../lib/constants";
import { addClip } from "../../lib/db";
import { historyKeys } from "../../lib/queryKeys";
import { waitFor } from "../../utils";

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

				const text = await window.electronAPI.clipboard.readText();
				const currentText = text || "";

				if (currentText && currentText !== lastClipboardTextRef.current) {
					lastClipboardTextRef.current = currentText;
					await addClip(currentText);
					// Invalidate history queries to show new item
					queryClient.invalidateQueries({ queryKey: historyKeys.all });
				}
			} catch (error) {
				console.error("Error reading clipboard:", error);
			}
		};

		const startPolling = async () => {
			try {
				await waitFor(() => window.electronAPI !== undefined);

				// Initialize with current clipboard content
				try {
					const currentText = await window.electronAPI.clipboard.readText();
					lastClipboardTextRef.current = currentText || "";
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
