import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
	clipboard: {
		readText: () => ipcRenderer.invoke("clipboard:readText") as Promise<string>,
		writeText: (text: string) =>
			ipcRenderer.invoke("clipboard:writeText", text) as Promise<void>,
	},
	db: {
		getHistory: (options?: {
			query?: string;
			limit?: number;
			favoritesOnly?: boolean;
			offset?: number;
		}) =>
			ipcRenderer.invoke("db:getHistory", options ?? {}) as Promise<
				Array<{
					id: number;
					content: string;
					type: string;
					created_at: string;
					is_favorite: number;
				}>
			>,
		addClip: (text: string) =>
			ipcRenderer.invoke("db:addClip", text) as Promise<void>,
		deleteHistoryItem: (id: number) =>
			ipcRenderer.invoke("db:deleteHistoryItem", id) as Promise<void>,
		clearAllHistory: () =>
			ipcRenderer.invoke("db:clearAllHistory") as Promise<void>,
		toggleFavorite: (id: number) =>
			ipcRenderer.invoke("db:toggleFavorite", id) as Promise<boolean>,
	},
	window: {
		center: () => ipcRenderer.invoke("window:center") as Promise<void>,
		show: () => ipcRenderer.invoke("window:show") as Promise<void>,
		hide: () => ipcRenderer.invoke("window:hide") as Promise<void>,
		isVisible: () => ipcRenderer.invoke("window:isVisible") as Promise<boolean>,
		hideAndPaste: () =>
			ipcRenderer.invoke("window:hideAndPaste") as Promise<void>,
	},
	app: {
		quit: () => ipcRenderer.invoke("app:quit") as Promise<void>,
	},
});
