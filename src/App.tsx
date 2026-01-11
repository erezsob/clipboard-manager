import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorBanner, Footer, SearchBar } from "./components/common";
import { HistoryList } from "./components/history";
import { useClipboardMonitor } from "./hooks/queries";
import { useHistoryActions } from "./hooks/useHistoryActions";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
import { useWindowVisibility } from "./hooks/useWindowVisibility";
import type { HistoryItem } from "./lib/db";

/**
 * Main application component for clipboard manager
 * Handles UI composition, search, pagination, and clipboard operations
 */
export function App() {
	// Start clipboard monitoring (polls and adds new clips)
	useClipboardMonitor();

	const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const settingsMenuRef = useRef<HTMLDivElement>(null);
	const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
	const listContainerRef = useRef<HTMLDivElement>(null);

	// Ref to hold the refresh callback (set after useHistorySearch is called)
	const refreshOnVisibleRef = useRef<(() => Promise<void>) | null>(null);

	// Window visibility hook manages visibility state and focus handling
	const { isVisible, setIsVisible } = useWindowVisibility({
		searchInputRef,
		onBecomeVisible: () => {
			// Refresh history when window becomes visible
			refreshOnVisibleRef.current?.();
		},
	});

	// History search hook manages search query, favorites filter, and filtered history
	const {
		searchQuery,
		setSearchQuery,
		favoritesOnly,
		setFavoritesOnly,
		filteredHistory,
		isLoadingMore,
		hasMore,
		searchError,
		refetchHistory,
		loadMore,
	} = useHistorySearch();

	// Callback to hide window and reset search state
	const hideWindow = useCallback(async () => {
		if (window.electronAPI) {
			await window.electronAPI.window.hide();
		}
		setIsVisible(false);
		setSearchQuery("");
	}, [setIsVisible, setSearchQuery]);

	// Stable callback for copying item and hiding window (used by keyboard navigation)
	const handleEnterKey = useCallback(
		async (item: HistoryItem) => {
			if (window.electronAPI) {
				await window.electronAPI.clipboard.writeText(item.content);
			}
			await hideWindow();
		},
		[hideWindow],
	);

	// Stable callback for scrolling to item
	const handleScrollToIndex = useCallback((index: number) => {
		itemRefs.current[index]?.scrollIntoView({
			block: "nearest",
			behavior: "smooth",
		});
	}, []);

	// Keyboard navigation hook manages keyboard shortcuts and selected index
	const { selectedIndex, setSelectedIndex } = useKeyboardNavigation({
		isVisible,
		filteredHistory,
		onEscape: hideWindow,
		onEnter: handleEnterKey,
		onScrollToIndex: handleScrollToIndex,
	});

	// History actions hook manages item operations (copy, delete, favorite, clear)
	const {
		error: actionError,
		setError: setActionError,
		handleItemClick,
		handleToggleFavorite,
		handleDeleteItem,
		handleClearAll,
	} = useHistoryActions({
		filteredHistory,
		selectedIndex,
		setSelectedIndex,
		onHideWindow: hideWindow,
	});

	// Combine errors from search and actions
	// Note: searchError auto-clears on successful refetch via TanStack Query
	const error = searchError || actionError;
	const clearError = useCallback(() => {
		setActionError(null);
	}, [setActionError]);

	// Set up the refresh callback for when window becomes visible
	// This needs to be after useHistorySearch so we have access to refetchHistory
	refreshOnVisibleRef.current = useCallback(async () => {
		// Scroll the list to the top so the latest items are visible
		listContainerRef.current?.scrollTo({ top: 0 });
		await refetchHistory();
		setSelectedIndex(0);
	}, [refetchHistory, setSelectedIndex]);

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
			setActionError(null);
			await loadMore();
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setActionError(`Failed to load more items: ${message}`);
			console.error("Failed to load more items", err);
		}
	}, [setActionError, loadMore]);

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
			{error && <ErrorBanner message={error} onDismiss={clearError} />}

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
				containerRef={listContainerRef}
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
