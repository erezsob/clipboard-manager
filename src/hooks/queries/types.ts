import type { HistoryItem } from "../../lib/db";

/**
 * Represents a single page of history items from infinite query
 */
export interface HistoryPage {
	/** History items in this page */
	items: HistoryItem[];
	/** Next page offset, or undefined if no more pages */
	nextOffset: number | undefined;
}

/**
 * Shape of infinite query data for history
 */
export interface InfiniteHistoryData {
	/** Array of loaded pages */
	pages: HistoryPage[];
	/** Page parameters used for each page */
	pageParams: number[];
}
