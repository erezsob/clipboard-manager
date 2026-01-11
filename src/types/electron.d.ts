/// <reference types="vite/client" />

interface ElectronAPI {
	clipboard: {
		readText: () => Promise<string>;
		writeText: (text: string) => Promise<void>;
	};
	db: {
		getHistory: (options?: {
			query?: string;
			limit?: number;
			favoritesOnly?: boolean;
			offset?: number;
		}) => Promise<
			Array<{
				id: number;
				content: string;
				type: string;
				created_at: string;
				is_favorite: number;
			}>
		>;
		addClip: (text: string) => Promise<void>;
		deleteHistoryItem: (id: number) => Promise<void>;
		clearAllHistory: () => Promise<void>;
		toggleFavorite: (id: number) => Promise<boolean>;
	};
	window: {
		center: () => Promise<void>;
		show: () => Promise<void>;
		hide: () => Promise<void>;
		isVisible: () => Promise<boolean>;
	};
	app: {
		quit: () => Promise<void>;
	};
}

interface Window {
	electronAPI: ElectronAPI;
}
