import type { Mock } from "vitest";
import { vi } from "vitest";

/**
 * Mock implementation of the ElectronAPI interface
 * All methods are vi.fn() mocks with sensible default return values
 */
export interface MockElectronAPI {
	clipboard: {
		readText: Mock<() => Promise<string>>;
		writeText: Mock<(text: string) => Promise<void>>;
	};
	db: {
		getHistory: Mock<
			(
				query?: string,
				limit?: number,
				favoritesOnly?: boolean,
				offset?: number,
			) => Promise<
				Array<{
					id: number;
					content: string;
					type: string;
					created_at: string;
					is_favorite: number;
				}>
			>
		>;
		addClip: Mock<(text: string) => Promise<void>>;
		deleteHistoryItem: Mock<(id: number) => Promise<void>>;
		clearAllHistory: Mock<() => Promise<void>>;
		toggleFavorite: Mock<(id: number) => Promise<boolean>>;
	};
	window: {
		center: Mock<() => Promise<void>>;
		show: Mock<() => Promise<void>>;
		hide: Mock<() => Promise<void>>;
		isVisible: Mock<() => Promise<boolean>>;
	};
	app: {
		quit: Mock<() => Promise<void>>;
	};
}

/**
 * Creates a fresh mock ElectronAPI object with sensible defaults
 * @returns A fully mocked ElectronAPI matching the interface from electron/preload.ts
 */
export function createMockElectronAPI(): MockElectronAPI {
	return {
		clipboard: {
			readText: vi.fn().mockResolvedValue(""),
			writeText: vi.fn().mockResolvedValue(undefined),
		},
		db: {
			getHistory: vi.fn().mockResolvedValue([]),
			addClip: vi.fn().mockResolvedValue(undefined),
			deleteHistoryItem: vi.fn().mockResolvedValue(undefined),
			clearAllHistory: vi.fn().mockResolvedValue(undefined),
			toggleFavorite: vi.fn().mockResolvedValue(true),
		},
		window: {
			center: vi.fn().mockResolvedValue(undefined),
			show: vi.fn().mockResolvedValue(undefined),
			hide: vi.fn().mockResolvedValue(undefined),
			isVisible: vi.fn().mockResolvedValue(false),
		},
		app: {
			quit: vi.fn().mockResolvedValue(undefined),
		},
	};
}
