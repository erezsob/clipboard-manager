import { describe, expect, it, vi } from "vitest";
import {
	createLaunchAtLoginModule,
	reconcileLaunchAtLogin,
	type LoginItemSettingsReader,
} from "./launch-at-login.js";
import type { AppPreferences } from "./preferences.js";

const createLoginItemSettings = (
	openAtLogin: boolean,
): ReturnType<LoginItemSettingsReader> => ({
	openAtLogin,
});

const createMockPreferencesStore = (options?: {
	launchAtLogin?: boolean;
	fileExisted?: boolean;
}) => {
	let launchAtLogin = options?.launchAtLogin ?? true;
	const fileExisted = options?.fileExisted ?? true;

	return {
		readWithMeta: vi.fn(() => ({
			preferences: { launchAtLogin } satisfies AppPreferences,
			fileExisted,
		})),
		readLaunchAtLogin: vi.fn(() => launchAtLogin),
		writeLaunchAtLogin: vi.fn((enabled: boolean) => {
			launchAtLogin = enabled;
		}),
	};
};

describe("reconcileLaunchAtLogin", () => {
	it("returns JSON preference in development builds", () => {
		expect(
			reconcileLaunchAtLogin({
				isPackaged: false,
				preferencesFileExisted: false,
				jsonLaunchAtLogin: true,
				macosOpenAtLogin: false,
			}),
		).toEqual({
			effective: true,
			syncToMacOS: null,
			updateJson: null,
			persistInitialPreferences: true,
		});
	});

	it("enables login item on first packaged launch when default is ON", () => {
		expect(
			reconcileLaunchAtLogin({
				isPackaged: true,
				preferencesFileExisted: false,
				jsonLaunchAtLogin: true,
				macosOpenAtLogin: false,
			}),
		).toEqual({
			effective: true,
			syncToMacOS: true,
			updateJson: null,
			persistInitialPreferences: true,
		});
	});

	it("downgrades JSON when macOS login item was disabled externally", () => {
		expect(
			reconcileLaunchAtLogin({
				isPackaged: true,
				preferencesFileExisted: true,
				jsonLaunchAtLogin: true,
				macosOpenAtLogin: false,
			}),
		).toEqual({
			effective: false,
			syncToMacOS: null,
			updateJson: false,
			persistInitialPreferences: false,
		});
	});

	it("disables macOS login item when JSON preference is OFF", () => {
		expect(
			reconcileLaunchAtLogin({
				isPackaged: true,
				preferencesFileExisted: true,
				jsonLaunchAtLogin: false,
				macosOpenAtLogin: true,
			}),
		).toEqual({
			effective: false,
			syncToMacOS: false,
			updateJson: null,
			persistInitialPreferences: false,
		});
	});
});

describe("createLaunchAtLoginModule", () => {
	it("writes JSON only in development when toggling launch at login", () => {
		const preferencesStore = createMockPreferencesStore({
			launchAtLogin: true,
			fileExisted: true,
		});
		const setLoginItemSettings = vi.fn();

		const module = createLaunchAtLoginModule({
			isPackaged: false,
			getLoginItemSettings: vi.fn(() => createLoginItemSettings(false)),
			setLoginItemSettings,
			preferencesStore,
			userDataPath: "/tmp/clipboard-manager",
		});

		const result = module.setLaunchAtLogin(false);

		expect(result).toEqual({ success: true });
		expect(preferencesStore.writeLaunchAtLogin).toHaveBeenCalledWith(false);
		expect(setLoginItemSettings).not.toHaveBeenCalled();
	});

	it("reverts JSON when macOS registration fails in packaged builds", () => {
		const preferencesStore = createMockPreferencesStore({
			launchAtLogin: false,
			fileExisted: true,
		});
		const setLoginItemSettings = vi.fn();
		const getLoginItemSettings = vi
			.fn<LoginItemSettingsReader>()
			.mockReturnValueOnce(createLoginItemSettings(false))
			.mockReturnValueOnce(createLoginItemSettings(false));

		const module = createLaunchAtLoginModule({
			isPackaged: true,
			getLoginItemSettings,
			setLoginItemSettings,
			preferencesStore,
			userDataPath: "/tmp/clipboard-manager",
		});

		const result = module.setLaunchAtLogin(true);

		expect(result.success).toBe(false);
		expect(preferencesStore.writeLaunchAtLogin).toHaveBeenLastCalledWith(false);
	});
});
