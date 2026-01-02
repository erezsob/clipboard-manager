import { getCurrentWindow } from "@tauri-apps/api/window";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { format } from "date-fns";
import { Search, Trash, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type HistoryItem, useClipboard } from "./hooks/useClipboard";
import { clearAllHistory, deleteHistoryItem, searchHistory } from "./lib/db";

function App() {
	const { history, refreshHistory } = useClipboard();
	const [searchQuery, setSearchQuery] = useState("");
	const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isVisible, setIsVisible] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Initialize window visibility
	useEffect(() => {
		// Window starts hidden (visible: false in config)
		setIsVisible(false);
	}, []);

	// Function to position window at cursor
	// Note: True cursor positioning requires native macOS APIs
	// For now, we center the window which works well for most use cases
	const positionWindowAtCursor = useCallback(async () => {
		try {
			const appWindow = getCurrentWindow();
			// Center the window on the current monitor
			await appWindow.center();
		} catch (error) {
			console.error("Failed to position window:", error);
		}
	}, []);

	// Register global shortcut Cmd+Shift+V
	useEffect(() => {
		const registerShortcut = async () => {
			// Wait for Tauri to be available
			if (typeof window === "undefined" || !window.__TAURI__) {
				// Retry after a short delay if Tauri isn't ready yet
				setTimeout(registerShortcut, 100);
				return;
			}

			try {
				await register("CommandOrControl+Shift+V", async () => {
					const appWindow = getCurrentWindow();
					const visible = await appWindow.isVisible();
					if (visible) {
						await appWindow.hide();
						setIsVisible(false);
					} else {
						await positionWindowAtCursor();
						await appWindow.show();
						await appWindow.setFocus();
						setIsVisible(true);
						// Focus search input when showing
						setTimeout(() => {
							searchInputRef.current?.focus();
						}, 100);
					}
				});
			} catch (error) {
				// Only log errors that aren't about Tauri not being available
				if (
					error instanceof Error &&
					error.message.includes("transformCallback")
				) {
					// Tauri API not ready yet, retry
					setTimeout(registerShortcut, 100);
					return;
				}
				console.error("Failed to register global shortcut:", error);
				setError("Failed to register keyboard shortcut");
			}
		};

		registerShortcut();

		return () => {
			// Only unregister if Tauri is available
			if (typeof window !== "undefined" && window.__TAURI__) {
				try {
					unregisterAll();
				} catch (error) {
					// Ignore errors during cleanup
				}
			}
		};
	}, [positionWindowAtCursor]);

	// Search functionality
	useEffect(() => {
		const performSearch = async () => {
			if (searchQuery.trim() === "") {
				setFilteredHistory(history);
				setSelectedIndex(0);
				return;
			}

			const results = await searchHistory(searchQuery);
			setFilteredHistory(results);
			setSelectedIndex(0);
		};

		performSearch();
	}, [searchQuery, history]);

	// Update filtered history when history changes
	useEffect(() => {
		if (searchQuery.trim() === "") {
			setFilteredHistory(history);
		}
	}, [history, searchQuery]);

	// Keyboard handlers
	const handleKeyDown = useCallback(
		async (e: KeyboardEvent) => {
			if (!isVisible) return;

			const appWindow = getCurrentWindow();

			// Escape: Hide window
			if (e.key === "Escape") {
				await appWindow.hide();
				setIsVisible(false);
				setSearchQuery("");
				setSelectedIndex(0);
				return;
			}

			// Enter: Copy selected item and hide
			if (e.key === "Enter" && filteredHistory.length > 0) {
				const selectedItem = filteredHistory[selectedIndex];
				if (selectedItem) {
					await writeText(selectedItem.content);
					await appWindow.hide();
					setIsVisible(false);
					setSearchQuery("");
					setSelectedIndex(0);
				}
				return;
			}

			// Arrow Up: Navigate up
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex((prev) => {
					const newIndex = prev > 0 ? prev - 1 : filteredHistory.length - 1;
					// Scroll into view
					setTimeout(() => {
						const element = document.getElementById(`history-item-${newIndex}`);
						element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
					}, 0);
					return newIndex;
				});
				return;
			}

			// Arrow Down: Navigate down
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((prev) => {
					const newIndex = prev < filteredHistory.length - 1 ? prev + 1 : 0;
					// Scroll into view
					setTimeout(() => {
						const element = document.getElementById(`history-item-${newIndex}`);
						element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
					}, 0);
					return newIndex;
				});
				return;
			}
		},
		[isVisible, filteredHistory, selectedIndex],
	);

	// Register keyboard event listener
	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleKeyDown]);

	// Format date for display
	const formatDate = (dateString: string) => {
		try {
			const date = new Date(dateString);
			const now = new Date();
			const diffMs = now.getTime() - date.getTime();
			const diffMins = Math.floor(diffMs / 60000);

			if (diffMins < 1) return "Just now";
			if (diffMins < 60) return `${diffMins}m ago`;
			if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
			return format(date, "MMM d, yyyy");
		} catch {
			return dateString;
		}
	};

	// Retry logic for clipboard operations
	const retryOperation = async <T,>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
		baseDelay: number = 1000,
	): Promise<T> => {
		let lastError: Error | null = null;
		for (let attempt = 0; attempt < maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				if (attempt < maxRetries - 1) {
					const delay = baseDelay * 2 ** attempt;
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}
		throw lastError || new Error("Operation failed after retries");
	};

	// Handle item click
	const handleItemClick = async (item: HistoryItem) => {
		try {
			setError(null);
			await retryOperation(async () => {
				await writeText(item.content);
			});
			const appWindow = getCurrentWindow();
			await appWindow.hide();
			setIsVisible(false);
			setSearchQuery("");
			setSelectedIndex(0);
		} catch (error) {
			setError(
				`Failed to copy to clipboard: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	};

	// Handle delete item
	const handleDeleteItem = async (e: React.MouseEvent, itemId: number) => {
		e.stopPropagation(); // Prevent item click
		try {
			setError(null);
			await deleteHistoryItem(itemId);
			await refreshHistory();
			// Update filtered history if needed
			if (searchQuery.trim() === "") {
				const items = await searchHistory("");
				setFilteredHistory(items);
			} else {
				const items = await searchHistory(searchQuery);
				setFilteredHistory(items);
			}
			// Adjust selected index if needed
			if (selectedIndex >= filteredHistory.length - 1) {
				setSelectedIndex(Math.max(0, filteredHistory.length - 2));
			}
		} catch (error) {
			setError(
				`Failed to delete item: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	};

	// Handle clear all history
	const handleClearAll = async () => {
		if (
			window.confirm(
				"Are you sure you want to clear all clipboard history? This action cannot be undone.",
			)
		) {
			try {
				setError(null);
				await clearAllHistory();
				await refreshHistory();
				setFilteredHistory([]);
				setSelectedIndex(0);
			} catch (error) {
				setError(
					`Failed to clear history: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		}
	};

	// Truncate text for display
	const truncateText = (text: string, maxLength: number = 100) => {
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength) + "...";
	};

	return (
		<div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
			{/* Error Message */}
			{error && (
				<div className="sticky top-0 z-20 bg-red-600 text-white px-3 py-2 text-sm flex items-center justify-between">
					<span>{error}</span>
					<button
						type="button" // Add explicit type prop for button element
						onClick={() => setError(null)}
						className="hover:bg-red-700 rounded p-1"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Search Bar */}
			<div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 p-3">
				<div className="relative flex items-center gap-2">
					<div className="relative flex-1">
						<Search className="absolute left-3 text-gray-400 w-4 h-4 top-1/2 -translate-y-1/2" />
						<input
							ref={searchInputRef}
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search clipboard history..."
							className="w-full pl-10 pr-10 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						{searchQuery && (
							<button
								type="button" // Add explicit type prop for button element
								onClick={() => setSearchQuery("")}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>
					<button
						type="button" // Add explicit type prop for button element
						onClick={handleClearAll}
						className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-1 transition-colors"
						title="Clear all history"
					>
						<Trash className="w-4 h-4" />
						<span>Clear All</span>
					</button>
				</div>
			</div>

			{/* History List */}
			<div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
				{filteredHistory.length === 0 ? (
					<div className="text-center text-gray-400 py-8">
						<p>No clipboard history found</p>
						{searchQuery && (
							<p className="text-sm mt-2">Try a different search term</p>
						)}
					</div>
				) : (
					filteredHistory.map((item, index) => (
						<div
							key={item.id}
							id={`history-item-${index}`}
							className={`
                group p-3 rounded-lg cursor-pointer transition-all duration-150
                ${
									index === selectedIndex
										? "bg-blue-600 text-white shadow-lg"
										: "bg-gray-800 hover:bg-gray-700 text-gray-100"
								}
              `}
						>
							<div className="flex items-start justify-between gap-2">
								<p className="text-sm flex-1 break-words">
									{truncateText(item.content)}
								</p>
								<div className="flex items-center gap-2">
									<span
										className={`
                      text-xs whitespace-nowrap
                      ${
												index === selectedIndex
													? "text-blue-100"
													: "text-gray-400"
											}
                    `}
									>
										{formatDate(item.created_at)}
									</span>
									<button
										type="button" // Add explicit type prop for button element
										onClick={(e) => handleDeleteItem(e, item.id)}
										className={`
                      p-1 rounded hover:bg-opacity-20 transition-colors
                      ${
												index === selectedIndex
													? "hover:bg-white text-white opacity-80 hover:opacity-100"
													: "text-gray-400 hover:text-red-400 hover:bg-red-500"
											}
                    `}
										title="Delete item"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
					))
				)}
			</div>

			{/* Footer hint */}
			<div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-3 py-2">
				<div className="flex items-center justify-between text-xs text-gray-400">
					<span>↑↓ Navigate • Enter Copy • Esc Close</span>
					<span>Cmd+Shift+V Toggle</span>
				</div>
			</div>
		</div>
	);
}

export default App;
