import type { RefObject } from "react";
import type { HistoryItem as HistoryItemType } from "../../lib/db";
import { HistoryItem } from "./HistoryItem";

interface HistoryListProps {
	/** Array of history items to display */
	items: HistoryItemType[];
	/** Current search query for empty state messaging */
	searchQuery: string;
	/** Index of the currently selected item */
	selectedIndex: number;
	/** Ref array for scrolling to items */
	itemRefs: RefObject<(HTMLDivElement | null)[]>;
	/** Whether there are more items to load */
	hasMore: boolean;
	/** Whether more items are currently being loaded */
	isLoadingMore: boolean;
	/** Callback when an item is clicked (to copy) */
	onItemClick: (item: HistoryItemType) => void;
	/** Callback to toggle favorite status */
	onToggleFavorite: (e: React.MouseEvent, itemId: number) => void;
	/** Callback to delete an item */
	onDelete: (e: React.MouseEvent, itemId: number) => void;
	/** Callback to load more items */
	onLoadMore: () => void;
}

/**
 * Container component for the list of history items
 * Includes empty state, item list, and load more button
 */
export function HistoryList({
	items,
	searchQuery,
	selectedIndex,
	itemRefs,
	hasMore,
	isLoadingMore,
	onItemClick,
	onToggleFavorite,
	onDelete,
	onLoadMore,
}: HistoryListProps) {
	if (items.length === 0) {
		return (
			<div className="flex-1 overflow-y-auto px-3 py-2">
				<div className="text-center text-gray-400 py-8">
					<p>No clipboard history found</p>
					{searchQuery && (
						<p className="text-sm mt-2">Try a different search term</p>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
			{items.map((item, index) => (
				<div
					key={item.id}
					ref={(el) => {
						itemRefs.current[index] = el;
					}}
				>
					<HistoryItem
						item={item}
						isSelected={index === selectedIndex}
						onItemClick={onItemClick}
						onToggleFavorite={onToggleFavorite}
						onDelete={onDelete}
					/>
				</div>
			))}
			{/* Load More Button */}
			{items.length > 0 && hasMore && (
				<div className="flex justify-center py-4">
					<button
						type="button"
						onClick={onLoadMore}
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
		</div>
	);
}
