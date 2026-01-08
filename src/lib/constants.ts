/**
 * Application-wide constants
 */

/** Number of items to load per batch when paginating */
export const PAGINATION_BATCH_SIZE = 100;

/** Initial number of items to load */
export const INITIAL_LOAD_COUNT = 100;

/** Interval for checking window visibility (ms) */
export const VISIBILITY_CHECK_INTERVAL = 100;

/** Delay before focusing search input after window shows (ms) */
export const SEARCH_FOCUS_DELAY = 100;

/** Maximum text length before truncation */
export const MAX_TEXT_DISPLAY_LENGTH = 100;

// TanStack Query configuration constants

/** Interval for polling clipboard changes (ms) */
export const CLIPBOARD_POLL_INTERVAL = 1000;

/** Time before data is considered stale and eligible for background refetch (ms) */
export const QUERY_STALE_TIME = 30_000;

/** Time before inactive query data is garbage collected (ms) */
export const QUERY_GC_TIME = 300_000;
