// biome-ignore lint/correctness/noUnusedImports: Added React to avoid empty export
import React from "react";

/// <reference types="vite/client" />

interface ElectronAPI {
	clipboard: {
		readText: () => Promise<string>;
		writeText: (text: string) => Promise<void>;
	};
	db: {
		getHistory: (limit?: number) => Promise<
			Array<{
				id: number;
				content: string;
				type: string;
				created_at: string;
			}>
		>;
		addClip: (text: string) => Promise<void>;
		searchHistory: (
			query: string,
			limit?: number,
		) => Promise<
			Array<{
				id: number;
				content: string;
				type: string;
				created_at: string;
			}>
		>;
		deleteHistoryItem: (id: number) => Promise<void>;
		clearAllHistory: () => Promise<void>;
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

declare global {
	interface Window {
		electronAPI: ElectronAPI;
	}
}
