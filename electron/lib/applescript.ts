import { exec } from "node:child_process";

/**
 * Simulates a paste action (Cmd+V) using AppleScript.
 * Requires Accessibility permissions in macOS System Settings.
 *
 * @returns Promise that resolves when paste is simulated, rejects on error
 */
export const simulatePaste = (): Promise<void> => {
	return new Promise((resolve, reject) => {
		exec(
			'osascript -e \'tell application "System Events" to keystroke "v" using command down\'',
			(error) => {
				if (error) reject(error);
				else resolve();
			},
		);
	});
};

/**
 * Checks if the app has Accessibility permissions by attempting
 * to communicate with System Events via AppleScript.
 *
 * @returns Promise that resolves to true if permissions are granted, false otherwise
 */
export const checkAccessibilityPermission = (): Promise<boolean> => {
	return new Promise((resolve) => {
		exec(
			"osascript -e 'tell application \"System Events\" to return true'",
			(error) => resolve(!error),
		);
	});
};
