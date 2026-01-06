import { Copy, Search, Settings, Star, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useClipboard } from "./hooks/useClipboard";
import { usePagination } from "./hooks/usePagination";
import { SEARCH_FOCUS_DELAY, VISIBILITY_CHECK_INTERVAL } from "./lib/constants";
import {
	clearAllHistory,
	deleteHistoryItem,
	type HistoryItem,
	toggleFavorite,
} from "./lib/db";
import { formatDate, retryOperation, truncateText } from "./lib/utils";

/**
 * Main application component for clipboard manager
 * Handles UI, search, pagination, and clipboard operations
 */
function App() {
	const { history, refreshHistory } = useClipboard();
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isVisible, setIsVisible] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
	const [favoritesOnly, setFavoritesOnly] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const settingsMenuRef = useRef<HTMLDivElement>(null);

	// Pagination hook manages filtered history and pagination state
	const {
		filteredHistory,
		isLoadingMore,
		hasMore,
		refreshFilteredHistory,
		loadMore,
		resetPagination,
	} = usePagination({
		searchQuery,
		favoritesOnly,
		history,
	});

	// Initialize window visibility state
	useEffect(() => {
		setIsVisible(false);
	}, []);

	// Sync window visibility state with Electron window
	// Global shortcut is handled in Electron main process
	useEffect(() => {
		const checkVisibility = async () => {
			if (!window.electronAPI) return;

			try {
				const visible = await window.electronAPI.window.isVisible();
				setIsVisible(visible);
				if (visible) {
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
	}, []);

	// Reset pagination and refresh filtered history when search or filter changes
	useEffect(() => {
		const performSearch = async () => {
			try {
				resetPagination();
				await refreshFilteredHistory();
				setSelectedIndex(0);
			} catch (error) {
				console.error("Failed to perform search:", error);
				setError("Failed to search history. Please try again.");
			}
		};

		performSearch();
		// refreshFilteredHistory already depends on searchQuery and favoritesOnly via loadFilteredHistory
		// so it will change when those values change, triggering this effect
	}, [resetPagination, refreshFilteredHistory]);

	// Refresh filtered history when underlying history changes (preserves pagination)
	useEffect(() => {
		const updateHistory = async () => {
			try {
				await refreshFilteredHistory();
			} catch (error) {
				console.error("Failed to update filtered history:", error);
			}
		};

		updateHistory();
		// refreshFilteredHistory already depends on history via loadFilteredHistory
		// so it will change when history changes, triggering this effect
	}, [refreshFilteredHistory]);

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

	/**
	 * Handles errors consistently across the application
	 */
	const handleError = useCallback((error: unknown, defaultMessage: string) => {
		const message = error instanceof Error ? error.message : String(error);
		setError(`${defaultMessage}: ${message}`);
		console.error(defaultMessage, error);
	}, []);

	/**
	 * Handles clicking on a history item to copy it to clipboard
	 */
	const handleItemClick = useCallback(
		async (item: HistoryItem) => {
			if (!window.electronAPI) return;

			try {
				setError(null);
				await retryOperation({
					operation: async () => {
						await window.electronAPI.clipboard.writeText(item.content);
					},
				});
				await window.electronAPI.window.hide();
				setIsVisible(false);
				setSearchQuery("");
				setSelectedIndex(0);
			} catch (error) {
				handleError(error, "Failed to copy to clipboard");
			}
		},
		[handleError],
	);

	/**
	 * Handles toggling favorite status of a history item
	 */
	const handleToggleFavorite = useCallback(
		async (e: React.MouseEvent, itemId: number) => {
			e.stopPropagation();
			try {
				setError(null);
				await toggleFavorite(itemId);
				await refreshHistory();
				await refreshFilteredHistory();
			} catch (error) {
				handleError(error, "Failed to toggle favorite");
			}
		},
		[handleError, refreshHistory, refreshFilteredHistory],
	);

	/**
	 * Handles deleting a history item
	 */
	const handleDeleteItem = useCallback(
		async (e: React.MouseEvent, itemId: number) => {
			e.stopPropagation();
			try {
				setError(null);
				await deleteHistoryItem(itemId);
				await refreshHistory();
				await refreshFilteredHistory();
				// Adjust selected index if deleted item was at the end
				if (selectedIndex >= filteredHistory.length - 1) {
					setSelectedIndex(Math.max(0, filteredHistory.length - 2));
				}
			} catch (error) {
				handleError(error, "Failed to delete item");
			}
		},
		[
			handleError,
			refreshHistory,
			refreshFilteredHistory,
			selectedIndex,
			filteredHistory.length,
		],
	);

	/**
	 * Handles clearing all clipboard history with confirmation
	 */
	const handleClearAll = useCallback(async () => {
		setIsSettingsMenuOpen(false);
		const confirmed = window.confirm(
			"Are you sure you want to clear all clipboard history? This action cannot be undone.",
		);
		if (!confirmed) return;

		try {
			setError(null);
			await clearAllHistory();
			await refreshHistory();
			resetPagination();
			setSelectedIndex(0);
		} catch (error) {
			handleError(error, "Failed to clear history");
		}
	}, [handleError, refreshHistory, resetPagination]);

	/**
	 * Handles loading more items for pagination
	 */
	const handleLoadMore = useCallback(async () => {
		try {
			setError(null);
			await loadMore();
		} catch (error) {
			handleError(error, "Failed to load more items");
		}
	}, [handleError, loadMore]);

	/**
	 * Handles quitting the application
	 */
	const handleQuit = useCallback(async () => {
		setIsSettingsMenuOpen(false);
		if (window.electronAPI) {
			await window.electronAPI.app.quit();
		}
	}, []);

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
