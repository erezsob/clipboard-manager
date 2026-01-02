import { useEffect, useState, useRef } from "react";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { addClip, getHistory } from "../lib/db";

export interface HistoryItem {
  id: number;
  content: string;
  type: string;
  created_at: string;
}

/**
 * Hook that polls the clipboard and manages history
 */
export function useClipboard() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [lastClipboardText, setLastClipboardText] = useState<string>("");
  const intervalRef = useRef<number | null>(null);

  // Initialize database and load history
  useEffect(() => {
    const init = async () => {
      const { initDB } = await import("../lib/db");
      await initDB();
      const items = await getHistory();
      setHistory(items);
    };
    init();
  }, []);

  // Poll clipboard every 1000ms
  useEffect(() => {
    const pollClipboard = async () => {
      try {
        const text = await readText();
        if (text && text !== lastClipboardText) {
          setLastClipboardText(text);
          await addClip(text);
          // Refresh history after adding
          const items = await getHistory();
          setHistory(items);
        }
      } catch (error) {
        console.error("Error reading clipboard:", error);
      }
    };

    // Poll immediately, then every 1000ms
    pollClipboard();
    intervalRef.current = window.setInterval(pollClipboard, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [lastClipboardText]);

  // Refresh history function
  const refreshHistory = async () => {
    const items = await getHistory();
    setHistory(items);
  };

  return {
    history,
    refreshHistory,
  };
}
