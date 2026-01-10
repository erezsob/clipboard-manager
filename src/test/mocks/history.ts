/**
 * Creates a mock history item for testing
 * @param overrides - Properties to override on the default item
 * @returns A history item object
 */
export function createMockHistoryItem(
	overrides: Partial<{
		id: number;
		content: string;
		type: string;
		created_at: string;
		is_favorite: number;
	}> = {},
) {
	return {
		id: 1,
		content: "Test clipboard content",
		type: "text",
		created_at: new Date().toISOString(),
		is_favorite: 0,
		...overrides,
	};
}

/**
 * Creates multiple mock history items for testing
 * @param count - Number of items to create
 * @param baseOverrides - Properties to apply to all items
 * @returns Array of history items
 */
export function createMockHistoryItems(
	count: number,
	baseOverrides: Partial<{
		type: string;
		is_favorite: number;
	}> = {},
) {
	return Array.from({ length: count }, (_, index) =>
		createMockHistoryItem({
			id: index + 1,
			content: `Test content ${index + 1}`,
			created_at: new Date(Date.now() - index * 60000).toISOString(),
			...baseOverrides,
		}),
	);
}
