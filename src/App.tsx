import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorBanner, Footer, SearchBar } from "./components/common";
import { HistoryList } from "./components/history";
import { useClipboard } from "./hooks/useClipboard";
import { useHistoryActions } from "./hooks/useHistoryActions";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
import { useWindowVisibility } from "./hooks/useWindowVisibility";

/**
 * Main application component for clipboard manager
 * Handles UI composition, search, pagination, and clipboard operations
 */
export default function App() {
	const { history, refreshHistory } = useClipboard();
	const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const settingsMenuRef = useRef<HTMLDivElement>(null);
	const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

	// Window visibility hook manages visibility state and focus handling
	const { isVisible, setIsVisible } = useWindowVisibility(searchInputRef);

	// History search hook manages search query, favorites filter, and filtered history
	const {
		searchQuery,
		setSearchQuery,
		favoritesOnly,
		setFavoritesOnly,
		filteredHistory,
		isLoadingMore,
		hasMore,
		refreshFilteredHistory,
		loadMore,
		resetPagination,
	} = useHistorySearch({
		history,
		onSearchError: (err) => setError(err),
	});

	// Callback to hide window and reset search state
	const hideWindow = useCallback(async () => {
		if (window.electronAPI) {
			await window.electronAPI.window.hide();
		}
		setIsVisible(false);
		setSearchQuery("");
	}, [setIsVisible, setSearchQuery]);

	// Keyboard navigation hook manages keyboard shortcuts and selected index
	const { selectedIndex, setSelectedIndex } = useKeyboardNavigation({
		isVisible,
		filteredHistory,
		onEscape: hideWindow,
		onEnter: async (item) => {
			if (window.electronAPI) {
				await window.electronAPI.clipboard.writeText(item.content);
			}
			await hideWindow();
		},
		onScrollToIndex: (index) => {
			itemRefs.current[index]?.scrollIntoView({
				block: "nearest",
				behavior: "smooth",
			});
		},
	});

	// History actions hook manages item operations (copy, delete, favorite, clear)
	const {
		error,
		setError,
		handleItemClick,
		handleToggleFavorite,
		handleDeleteItem,
		handleClearAll,
	} = useHistoryActions({
		refreshHistory,
		refreshFilteredHistory,
		resetPagination,
		filteredHistory,
		selectedIndex,
		setSelectedIndex,
		onHideWindow: hideWindow,
	});

	// Reset selected index when search or filter changes
	const searchFilterKey = useMemo(
		() => `${searchQuery}-${favoritesOnly}`,
		[searchQuery, favoritesOnly],
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: searchFilterKey is intentionally used to trigger reset when search/filter changes
	useEffect(() => {
		setSelectedIndex(0);
	}, [searchFilterKey, setSelectedIndex]);

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
	 * Handles loading more items for pagination
	 */
	const handleLoadMore = useCallback(async () => {
		try {
			setError(null);
			await loadMore();
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setError(`Failed to load more items: ${message}`);
			console.error("Failed to load more items", err);
		}
	}, [setError, loadMore]);

	/**
	 * Handles clear all from settings menu (closes menu first)
	 */
	const handleSettingsClearAll = useCallback(async () => {
		setIsSettingsMenuOpen(false);
		await handleClearAll();
	}, [handleClearAll]);

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
				<ErrorBanner message={error} onDismiss={() => setError(null)} />
			)}

			{/* Search Bar */}
			<SearchBar
				inputRef={searchInputRef}
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				favoritesOnly={favoritesOnly}
				onFavoritesToggle={() => setFavoritesOnly(!favoritesOnly)}
			/>

			{/* History List */}
			<HistoryList
				items={filteredHistory}
				searchQuery={searchQuery}
				selectedIndex={selectedIndex}
				itemRefs={itemRefs}
				hasMore={hasMore}
				isLoadingMore={isLoadingMore}
				onItemClick={handleItemClick}
				onToggleFavorite={handleToggleFavorite}
				onDelete={handleDeleteItem}
				onLoadMore={handleLoadMore}
			/>

			{/* Footer with hint and settings */}
			<Footer
				isSettingsMenuOpen={isSettingsMenuOpen}
				onSettingsToggle={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
				onClearAll={handleSettingsClearAll}
				onQuit={handleQuit}
				settingsMenuRef={settingsMenuRef}
			/>
		</div>
	);
}
