import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
	clipboard: {
		readText: () => ipcRenderer.invoke("clipboard:readText"),
		writeText: (text) => ipcRenderer.invoke("clipboard:writeText", text),
	},
	db: {
		getHistory: (limit) => ipcRenderer.invoke("db:getHistory", limit),
		addClip: (text) => ipcRenderer.invoke("db:addClip", text),
		searchHistory: (query, limit) =>
			ipcRenderer.invoke("db:searchHistory", query, limit),
		deleteHistoryItem: (id) => ipcRenderer.invoke("db:deleteHistoryItem", id),
		clearAllHistory: () => ipcRenderer.invoke("db:clearAllHistory"),
	},
	window: {
		center: () => ipcRenderer.invoke("window:center"),
		show: () => ipcRenderer.invoke("window:show"),
		hide: () => ipcRenderer.invoke("window:hide"),
		isVisible: () => ipcRenderer.invoke("window:isVisible"),
	},
});
