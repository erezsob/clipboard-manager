import { app, dialog, shell } from "electron";
import { checkAccessibilityPermission } from "./applescript.js";

let accessibilityPromptShown = false;
let skipAccessibilityOnStartup = false;

export const initAccessibilitySession = (): void => {
	if (process.platform !== "darwin") {
		return;
	}

	skipAccessibilityOnStartup =
		app.isPackaged && app.getLoginItemSettings().wasOpenedAtLogin === true;
};

export const shouldSkipAccessibilityOnStartup = (): boolean =>
	skipAccessibilityOnStartup;

export const promptAccessibilityIfNeeded = async (): Promise<void> => {
	if (process.platform !== "darwin" || accessibilityPromptShown) {
		return;
	}

	const hasPermission = await checkAccessibilityPermission();
	if (hasPermission) {
		accessibilityPromptShown = true;
		return;
	}

	accessibilityPromptShown = true;

	const response = await dialog.showMessageBox({
		type: "warning",
		title: "Accessibility Permission Required",
		message: "Clipboard Manager needs Accessibility permission to auto-paste.",
		detail:
			"To enable auto-paste after selecting an item, please grant Accessibility permission in System Settings > Privacy & Security > Accessibility.\n\nWithout this permission, items will still be copied to clipboard, but you'll need to paste manually.",
		buttons: ["Open System Settings", "Later"],
		defaultId: 0,
		cancelId: 1,
	});

	if (response.response === 0) {
		await shell.openExternal(
			"x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
		);
	}
};
