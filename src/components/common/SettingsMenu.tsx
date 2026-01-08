import { Settings, Trash2 } from "lucide-react";
import type { RefObject } from "react";

interface SettingsMenuProps {
	/** Whether the menu is currently open */
	isOpen: boolean;
	/** Callback to toggle menu open state */
	onToggle: () => void;
	/** Callback when Clear All is clicked */
	onClearAll: () => void;
	/** Callback when Quit is clicked */
	onQuit: () => void;
	/** Ref for the menu container (for click-outside detection) */
	menuRef: RefObject<HTMLDivElement | null>;
}

/**
 * Settings dropdown menu with Clear All and Quit options
 * Positioned in the bottom right corner of the footer
 */
export function SettingsMenu({
	isOpen,
	onToggle,
	onClearAll,
	onQuit,
	menuRef,
}: SettingsMenuProps) {
	return (
		<div className="relative" ref={menuRef}>
			<button
				type="button"
				onClick={onToggle}
				className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
				title="Settings"
				aria-label="Settings"
				aria-expanded={isOpen}
				aria-haspopup="menu"
			>
				<Settings className="w-4 h-4" />
			</button>
			{isOpen && (
				<div
					className="absolute bottom-full right-0 mb-2 w-40 bg-gray-700 border border-gray-600 rounded-lg shadow-lg overflow-hidden z-50"
					role="menu"
				>
					<button
						type="button"
						onClick={onClearAll}
						className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600 transition-colors flex items-center gap-2"
						role="menuitem"
					>
						<Trash2 className="w-4 h-4" />
						Clear All
					</button>
					<button
						type="button"
						onClick={onQuit}
						className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600 transition-colors"
						role="menuitem"
					>
						Quit
					</button>
				</div>
			)}
		</div>
	);
}
