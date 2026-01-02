import { useState, useEffect, useRef, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useClipboard, type HistoryItem } from "./hooks/useClipboard";
import { searchHistory } from "./lib/db";
import { Search, X } from "lucide-react";
import { format } from "date-fns";

function App() {
  const { history } = useClipboard();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize window visibility
  useEffect(() => {
    // Window starts hidden (visible: false in config)
    setIsVisible(false);
  }, []);

  // Register global shortcut Cmd+Shift+V
  useEffect(() => {
    const registerShortcut = async () => {
      try {
        await register("CommandOrControl+Shift+V", async () => {
          const appWindow = getCurrentWindow();
          const visible = await appWindow.isVisible();
          if (visible) {
            await appWindow.hide();
            setIsVisible(false);
          } else {
            await appWindow.show();
            await appWindow.setFocus();
            setIsVisible(true);
            // Focus search input when showing
            setTimeout(() => {
              searchInputRef.current?.focus();
            }, 100);
          }
        });
      } catch (error) {
        console.error("Failed to register global shortcut:", error);
      }
    };

    registerShortcut();

    return () => {
      unregisterAll();
    };
  }, []);

  // Search functionality
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim() === "") {
        setFilteredHistory(history);
        setSelectedIndex(0);
        return;
      }

      const results = await searchHistory(searchQuery);
      setFilteredHistory(results);
      setSelectedIndex(0);
    };

    performSearch();
  }, [searchQuery, history]);

  // Update filtered history when history changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredHistory(history);
    }
  }, [history, searchQuery]);

  // Keyboard handlers
  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      if (!isVisible) return;

      const appWindow = getCurrentWindow();

      // Escape: Hide window
      if (e.key === "Escape") {
        await appWindow.hide();
        setIsVisible(false);
        setSearchQuery("");
        setSelectedIndex(0);
        return;
      }

      // Enter: Copy selected item and hide
      if (e.key === "Enter" && filteredHistory.length > 0) {
        const selectedItem = filteredHistory[selectedIndex];
        if (selectedItem) {
          await writeText(selectedItem.content);
          await appWindow.hide();
          setIsVisible(false);
          setSearchQuery("");
          setSelectedIndex(0);
        }
        return;
      }

      // Arrow Up: Navigate up
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex = prev > 0 ? prev - 1 : filteredHistory.length - 1;
          // Scroll into view
          setTimeout(() => {
            const element = document.getElementById(`history-item-${newIndex}`);
            element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }, 0);
          return newIndex;
        });
        return;
      }

      // Arrow Down: Navigate down
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const newIndex = prev < filteredHistory.length - 1 ? prev + 1 : 0;
          // Scroll into view
          setTimeout(() => {
            const element = document.getElementById(`history-item-${newIndex}`);
            element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }, 0);
          return newIndex;
        });
        return;
      }
    },
    [isVisible, filteredHistory, selectedIndex]
  );

  // Register keyboard event listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
      return format(date, "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  // Handle item click
  const handleItemClick = async (item: HistoryItem) => {
    await writeText(item.content);
    const appWindow = getCurrentWindow();
    await appWindow.hide();
    setIsVisible(false);
    setSearchQuery("");
    setSelectedIndex(0);
  };

  // Truncate text for display
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 p-3">
        <div className="relative flex items-center">
          <Search className="absolute left-3 text-gray-400 w-4 h-4" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clipboard history..."
            className="w-full pl-10 pr-10 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {filteredHistory.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>No clipboard history found</p>
            {searchQuery && (
              <p className="text-sm mt-2">Try a different search term</p>
            )}
          </div>
        ) : (
          filteredHistory.map((item, index) => (
            <div
              key={item.id}
              id={`history-item-${index}`}
              onClick={() => handleItemClick(item)}
              className={`
                p-3 rounded-lg cursor-pointer transition-all duration-150
                ${
                  index === selectedIndex
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-100"
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm flex-1 break-words">
                  {truncateText(item.content)}
                </p>
                <span
                  className={`
                    text-xs whitespace-nowrap ml-2
                    ${
                      index === selectedIndex
                        ? "text-blue-100"
                        : "text-gray-400"
                    }
                  `}
                >
                  {formatDate(item.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-3 py-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>↑↓ Navigate • Enter Copy • Esc Close</span>
          <span>Cmd+Shift+V Toggle</span>
        </div>
      </div>
    </div>
  );
}

export default App;
