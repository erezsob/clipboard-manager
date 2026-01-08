import type { RefObject } from "react";
import { SettingsMenu } from "./SettingsMenu";

interface FooterProps {
	/** Whether the settings menu is open */
	isSettingsMenuOpen: boolean;
	/** Callback to toggle settings menu */
	onSettingsToggle: () => void;
	/** Callback when Clear All is clicked */
	onClearAll: () => void;
	/** Callback when Quit is clicked */
	onQuit: () => void;
	/** Ref for the settings menu container */
	settingsMenuRef: RefObject<HTMLDivElement | null>;
}

/**
 * Footer bar with keyboard hints and settings menu
 * Displays navigation hints and provides access to settings
 */
export function Footer({
	isSettingsMenuOpen,
	onSettingsToggle,
	onClearAll,
	onQuit,
	settingsMenuRef,
}: FooterProps) {
	return (
		<div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-3 py-2">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-xs text-gray-400">
					<span>↑↓ Navigate • Enter Copy • Esc Close</span>
					<span className="hidden sm:inline">Cmd+Shift+V Toggle</span>
				</div>
				<SettingsMenu
					isOpen={isSettingsMenuOpen}
					onToggle={onSettingsToggle}
					onClearAll={onClearAll}
					onQuit={onQuit}
					menuRef={settingsMenuRef}
				/>
			</div>
		</div>
	);
}
