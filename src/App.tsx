import { format } from "date-fns";
import { Copy, Search, Settings, Star, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClipboard } from "./hooks/useClipboard";
import {
	clearAllHistory,
	deleteHistoryItem,
	getHistory,
	type HistoryItem,
	searchHistory,
	toggleFavorite,
} from "./lib/db";

function App() {
	const { history, refreshHistory } = useClipboard();
	const [searchQuery, setSearchQuery] = useState("");
	const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isVisible, setIsVisible] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
	const [favoritesOnly, setFavoritesOnly] = useState(false);
	const [loadedCount, setLoadedCount] = useState(100); // Track how many items we've loaded
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true); // Track if there are more items to load
	const searchInputRef = useRef<HTMLInputElement>(null);
	const settingsMenuRef = useRef<HTMLDivElement>(null);

	// Initialize window visibility
	useEffect(() => {
		// Window starts hidden (visible: false in config)
		setIsVisible(false);
	}, []);

	// Global shortcut is handled in Electron main process
	// Listen for window visibility changes to sync state
	useEffect(() => {
		const checkVisibility = async () => {
			if (window.electronAPI) {
				const visible = await window.electronAPI.window.isVisible();
				setIsVisible(visible);
				if (visible) {
					// Focus search input when showing
					setTimeout(() => {
						searchInputRef.current?.focus();
					}, 100);
				}
			}
		};

		// Check visibility periodically
		const interval = setInterval(checkVisibility, 100);

		return () => {
			clearInterval(interval);
		};
	}, []);

	// Search functionality with pagination
	useEffect(() => {
		const performSearch = async () => {
			// Reset loaded count when search or filter changes
			setLoadedCount(100);
			
			if (searchQuery.trim() === "") {
				// If no search query, filter history based on favoritesOnly
				if (favoritesOnly) {
					const results = await searchHistory("", 100, true, 0);
					setFilteredHistory(results);
					setHasMore(results.length === 100); // More items if we got exactly 100
				} else {
					// Use first 100 items from history
					const items = history.slice(0, 100);
					setFilteredHistory(items);
					setHasMore(history.length > 100); // More items if history has more than 100
				}
				setSelectedIndex(0);
				return;
			}

			const results = await searchHistory(searchQuery, 100, favoritesOnly, 0);
			setFilteredHistory(results);
			setHasMore(results.length === 100); // More items if we got exactly 100
			setSelectedIndex(0);
		};

		performSearch();
	}, [searchQuery, history, favoritesOnly]);

	// Update filtered history when history changes (but don't reset pagination)
	useEffect(() => {
		if (searchQuery.trim() === "") {
			if (favoritesOnly) {
				// Need to fetch favorites with current loaded count
				searchHistory("", loadedCount, true, 0).then(setFilteredHistory);
			} else {
				// Use loaded count items from history
				setFilteredHistory(history.slice(0, loadedCount));
			}
		}
	}, [history, searchQuery, favoritesOnly, loadedCount]);

	// Keyboard handlers
	const handleKeyDown = useCallback(
		async (e: KeyboardEvent) => {
			if (!isVisible) return;

			// Escape: Hide window
			if (e.key === "Escape") {
				if (window.electronAPI) {
					await window.electronAPI.window.hide();
				}
				setIsVisible(false);
				setSearchQuery("");
				setSelectedIndex(0);
				return;
			}

			// Enter: Copy selected item and hide
			if (e.key === "Enter" && filteredHistory.length > 0) {
				const selectedItem = filteredHistory[selectedIndex];
				if (selectedItem && window.electronAPI) {
					await window.electronAPI.clipboard.writeText(selectedItem.content);
					await window.electronAPI.window.hide();
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

	// Close settings menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				settingsMenuRef.current &&
				!settingsMenuRef.current.contains(event.target as Node)
			) {
				setIsSettingsMenuOpen(false);
			}
		};

		if (isSettingsMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isSettingsMenuOpen]);

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
			if (window.electronAPI) {
				await retryOperation(async () => {
					await window.electronAPI.clipboard.writeText(item.content);
				});
				await window.electronAPI.window.hide();
				setIsVisible(false);
				setSearchQuery("");
				setSelectedIndex(0);
			}
		} catch (error) {
			setError(
				`Failed to copy to clipboard: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	};

	// Handle toggle favorite
	const handleToggleFavorite = async (e: React.MouseEvent, itemId: number) => {
		e.stopPropagation(); // Prevent item click
		try {
			setError(null);
			await toggleFavorite(itemId);
			await refreshHistory();
			// Update filtered history with current loaded count
			if (searchQuery.trim() === "") {
				if (favoritesOnly) {
					const items = await searchHistory("", loadedCount, true, 0);
					setFilteredHistory(items);
				} else {
					const items = await searchHistory("", loadedCount, false, 0);
					setFilteredHistory(items);
				}
			} else {
				const items = await searchHistory(searchQuery, loadedCount, favoritesOnly, 0);
				setFilteredHistory(items);
			}
		} catch (error) {
			setError(
				`Failed to toggle favorite: ${
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
			// Update filtered history with current loaded count
			if (searchQuery.trim() === "") {
				if (favoritesOnly) {
					const items = await searchHistory("", loadedCount, true, 0);
					setFilteredHistory(items);
				} else {
					const items = await searchHistory("", loadedCount, false, 0);
					setFilteredHistory(items);
				}
			} else {
				const items = await searchHistory(searchQuery, loadedCount, favoritesOnly, 0);
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
		setIsSettingsMenuOpen(false);
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
				setLoadedCount(100); // Reset loaded count
				setHasMore(true); // Reset hasMore flag
			} catch (error) {
				setError(
					`Failed to clear history: ${
						error instanceof Error ? error.message : String(error)
					}`,
				);
			}
		}
	};

	// Handle load more
	const handleLoadMore = async () => {
		if (isLoadingMore || !hasMore) return;
		
		setIsLoadingMore(true);
		try {
			setError(null);
			const nextBatch = 100;
			const newOffset = loadedCount;
			
			if (searchQuery.trim() === "") {
				if (favoritesOnly) {
					const items = await searchHistory("", nextBatch, true, newOffset);
					setFilteredHistory((prev) => [...prev, ...items]);
					setHasMore(items.length === nextBatch); // More if we got exactly the batch size
				} else {
					const items = await getHistory(nextBatch, false, newOffset);
					setFilteredHistory((prev) => [...prev, ...items]);
					setHasMore(items.length === nextBatch); // More if we got exactly the batch size
				}
			} else {
				const items = await searchHistory(searchQuery, nextBatch, favoritesOnly, newOffset);
				setFilteredHistory((prev) => [...prev, ...items]);
				setHasMore(items.length === nextBatch); // More if we got exactly the batch size
			}
			
			setLoadedCount((prev) => prev + nextBatch);
		} catch (error) {
			setError(
				`Failed to load more items: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		} finally {
			setIsLoadingMore(false);
		}
	};

	// Handle quit
	const handleQuit = async () => {
		setIsSettingsMenuOpen(false);
		if (window.electronAPI) {
			await window.electronAPI.app.quit();
		}
	};

	// Truncate text for display
	const truncateText = (text: string, maxLength: number = 100) => {
		if (text.length <= maxLength) return text;
		return `${text.substring(0, maxLength)}...`;
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
					{/* Favorites Filter Toggle */}
					<button
						type="button"
						onClick={() => setFavoritesOnly(!favoritesOnly)}
						className={`
              p-2 rounded-lg transition-colors
              ${
								favoritesOnly
									? "bg-yellow-600 text-yellow-100 hover:bg-yellow-500"
									: "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
							}
            `}
						title={favoritesOnly ? "Show all items" : "Show favorites only"}
						aria-label={
							favoritesOnly ? "Show all items" : "Show favorites only"
						}
					>
						<Star
							className={`w-4 h-4 ${favoritesOnly ? "fill-current" : ""}`}
						/>
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
					<>
						{filteredHistory.map((item, index) => (
						// biome-ignore lint/a11y/useSemanticElements: Need div with role="button" to allow nested buttons (Copy/Delete)
						<div
							key={item.id}
							id={`history-item-${index}`}
							onClick={() => handleItemClick(item)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									handleItemClick(item);
								}
							}}
							role="button"
							tabIndex={0}
							className={`
                group relative p-3 rounded-lg cursor-pointer transition-all duration-150
                ${
									index === selectedIndex
										? "bg-blue-600 text-white shadow-lg"
										: "bg-gray-800 hover:bg-gray-700 text-gray-100"
								}
              `}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex-1 min-w-0">
									<p className="text-sm break-words">
										{truncateText(item.content)}
									</p>
									<span
										className={`
                      text-xs whitespace-nowrap block mt-1
                      ${
												index === selectedIndex
													? "text-blue-100"
													: "text-gray-400"
											}
                    `}
									>
										{formatDate(item.created_at)}
									</span>
								</div>

								{/* Hover-reveal action buttons */}
								<div
									className={`flex items-center gap-1 transition-opacity duration-150 ml-2 ${
										index === selectedIndex
											? "opacity-100"
											: "opacity-0 group-hover:opacity-100"
									}`}
								>
									<button
										type="button"
										onClick={(e) => handleToggleFavorite(e, item.id)}
										className={`
                      p-1.5 rounded transition-colors
                      ${
												index === selectedIndex
													? item.is_favorite
														? "hover:bg-blue-500 text-yellow-300"
														: "hover:bg-blue-500 text-white"
													: item.is_favorite
														? "hover:bg-gray-600 text-yellow-400 hover:text-yellow-300"
														: "hover:bg-gray-600 text-gray-400 hover:text-white"
											}
                    `}
										title={
											item.is_favorite
												? "Remove from favorites"
												: "Add to favorites"
										}
										aria-label={
											item.is_favorite
												? "Remove from favorites"
												: "Add to favorites"
										}
									>
										<Star
											className={`w-4 h-4 ${
												item.is_favorite ? "fill-current" : ""
											}`}
										/>
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											handleItemClick(item);
										}}
										className={`
                      p-1.5 rounded transition-colors
                      ${
												index === selectedIndex
													? "hover:bg-blue-500 text-white"
													: "hover:bg-gray-600 text-gray-400 hover:text-white"
											}
                    `}
										title="Copy to clipboard"
										aria-label="Copy to clipboard"
									>
										<Copy className="w-4 h-4" />
									</button>
									<button
										type="button"
										onClick={(e) => handleDeleteItem(e, item.id)}
										className={`
                      p-1.5 rounded transition-colors
                      ${
												index === selectedIndex
													? "hover:bg-blue-500 text-white"
													: "hover:bg-red-600 text-gray-400 hover:text-white"
											}
                    `}
										title="Delete item"
										aria-label="Delete this clipboard item"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							</div>
						</div>
						))}
						{/* Load More Button */}
						{filteredHistory.length > 0 && hasMore && (
							<div className="flex justify-center py-4">
								<button
									type="button"
									onClick={handleLoadMore}
									disabled={isLoadingMore}
									className={`
										px-4 py-2 rounded-lg transition-colors text-sm font-medium
										${
											isLoadingMore
												? "bg-gray-700 text-gray-500 cursor-not-allowed"
												: "bg-gray-700 text-white hover:bg-gray-600"
										}
									`}
								>
									{isLoadingMore ? "Loading..." : "Load More"}
								</button>
							</div>
						)}
					</>
				)}
			</div>

			{/* Footer with hint and settings */}
			<div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-3 py-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-xs text-gray-400">
						<span>↑↓ Navigate • Enter Copy • Esc Close</span>
						<span className="hidden sm:inline">Cmd+Shift+V Toggle</span>
					</div>
					{/* Settings Menu */}
					<div className="relative" ref={settingsMenuRef}>
						<button
							type="button"
							onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
							className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
							title="Settings"
							aria-label="Settings"
						>
							<Settings className="w-4 h-4" />
						</button>
						{isSettingsMenuOpen && (
							<div className="absolute bottom-full right-0 mb-2 w-40 bg-gray-700 border border-gray-600 rounded-lg shadow-lg overflow-hidden z-50">
								<button
									type="button"
									onClick={handleClearAll}
									className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600 transition-colors flex items-center gap-2"
								>
									<Trash2 className="w-4 h-4" />
									Clear All
								</button>
								<button
									type="button"
									onClick={handleQuit}
									className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600 transition-colors"
								>
									Quit
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
