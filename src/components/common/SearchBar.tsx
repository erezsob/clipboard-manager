import { Search, Star, X } from "lucide-react";
import type { RefObject } from "react";

interface SearchBarProps {
	/** Ref to the search input element for focus management */
	inputRef: RefObject<HTMLInputElement | null>;
	/** Current search query value */
	searchQuery: string;
	/** Callback when search query changes */
	onSearchChange: (query: string) => void;
	/** Whether favorites-only filter is active */
	favoritesOnly: boolean;
	/** Callback to toggle favorites filter */
	onFavoritesToggle: () => void;
}

/**
 * Search bar with input field, clear button, and favorites filter toggle
 * Provides search and filtering functionality for clipboard history
 */
export function SearchBar({
	inputRef,
	searchQuery,
	onSearchChange,
	favoritesOnly,
	onFavoritesToggle,
}: SearchBarProps) {
	return (
		<div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 p-3">
			<div className="relative flex items-center gap-2">
				<div className="relative flex-1">
					<Search className="absolute left-3 text-gray-400 w-4 h-4 top-1/2 -translate-y-1/2" />
					<input
						ref={inputRef}
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search clipboard history..."
						className="w-full pl-10 pr-10 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSearchChange("")}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
							aria-label="Clear search"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>
				{/* Favorites Filter Toggle */}
				<button
					type="button"
					onClick={onFavoritesToggle}
					aria-pressed={favoritesOnly ? "true" : "false"}
					className={`
						p-2 rounded-lg transition-colors
						${
							favoritesOnly
								? "bg-yellow-600 text-yellow-100 hover:bg-yellow-500"
								: "bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
						}
					`}
					title={favoritesOnly ? "Show all items" : "Show favorites only"}
					aria-label={favoritesOnly ? "Show all items" : "Show favorites only"}
				>
					<Star className={`w-4 h-4 ${favoritesOnly ? "fill-current" : ""}`} />
				</button>
			</div>
		</div>
	);
}
