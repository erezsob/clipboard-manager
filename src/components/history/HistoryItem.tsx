import { Copy, Star, Trash2 } from "lucide-react";
import type { HistoryItem as HistoryItemType } from "../../lib/db";
import { formatDate, truncateText } from "../../lib/utils";

interface HistoryItemProps {
	/** The history item to display */
	item: HistoryItemType;
	/** Whether this item is currently selected */
	isSelected: boolean;
	/** Callback when the item is clicked (to copy) */
	onItemClick: (item: HistoryItemType) => void;
	/** Callback to toggle favorite status */
	onToggleFavorite: (e: React.MouseEvent, itemId: number) => void;
	/** Callback to delete the item */
	onDelete: (e: React.MouseEvent, itemId: number) => void;
}

/**
 * A single history item with content preview, date, and action buttons
 * Displays clipboard content with copy, favorite, and delete actions
 */
export function HistoryItem({
	item,
	isSelected,
	onItemClick,
	onToggleFavorite,
	onDelete,
}: HistoryItemProps) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: Need div with role="button" to allow nested buttons (Copy/Delete)
		<div
			onClick={() => onItemClick(item)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onItemClick(item);
				}
			}}
			role="button"
			tabIndex={0}
			className={`
				group relative p-3 rounded-lg cursor-pointer transition-all duration-150
				${
					isSelected
						? "bg-blue-600 text-white shadow-lg"
						: "bg-gray-800 hover:bg-gray-700 text-gray-100"
				}
			`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex-1 min-w-0">
					<p className="text-sm break-words">{truncateText(item.content)}</p>
					<span
						className={`
							text-xs whitespace-nowrap block mt-1
							${isSelected ? "text-blue-100" : "text-gray-400"}
						`}
					>
						{formatDate(item.created_at)}
					</span>
				</div>

				{/* Hover-reveal action buttons */}
				<div
					className={`flex items-center gap-1 transition-opacity duration-150 ml-2 ${
						isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
					}`}
				>
					<button
						type="button"
						onClick={(e) => onToggleFavorite(e, item.id)}
						className={`
							p-1.5 rounded transition-colors
							${
								isSelected
									? item.is_favorite
										? "hover:bg-blue-500 text-yellow-300"
										: "hover:bg-blue-500 text-white"
									: item.is_favorite
										? "hover:bg-gray-600 text-yellow-400 hover:text-yellow-300"
										: "hover:bg-gray-600 text-gray-400 hover:text-white"
							}
						`}
						title={
							item.is_favorite ? "Remove from favorites" : "Add to favorites"
						}
						aria-label={
							item.is_favorite ? "Remove from favorites" : "Add to favorites"
						}
					>
						<Star
							className={`w-4 h-4 ${item.is_favorite ? "fill-current" : ""}`}
						/>
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onItemClick(item);
						}}
						className={`
							p-1.5 rounded transition-colors
							${
								isSelected
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
						onClick={(e) => onDelete(e, item.id)}
						className={`
							p-1.5 rounded transition-colors
							${
								isSelected
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
	);
}
