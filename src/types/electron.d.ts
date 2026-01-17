/// <reference types="vite/client" />

interface ClipboardData {
	text: string;
	rtf?: string;
}

interface ElectronAPI {
	clipboard: {
		read: () => Promise<ClipboardData>;
		write: (data: ClipboardData) => Promise<void>;
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
				rtf: string | null;
			}>
		>;
		addClip: (data: ClipboardData) => Promise<void>;
		deleteHistoryItem: (id: number) => Promise<void>;
		clearAllHistory: () => Promise<void>;
		toggleFavorite: (id: number) => Promise<boolean>;
	};
	window: {
		center: () => Promise<void>;
		show: () => Promise<void>;
		hide: () => Promise<void>;
		isVisible: () => Promise<boolean>;
		hideAndPaste: () => Promise<void>;
	};
	app: {
		quit: () => Promise<void>;
	};
}

interface Window {
	electronAPI: ElectronAPI;
}
