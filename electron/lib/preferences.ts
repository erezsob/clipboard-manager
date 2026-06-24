import fs from "node:fs";
import path from "node:path";

export type AppPreferences = {
	launchAtLogin: boolean;
};

export const DEFAULT_PREFERENCES = {
	launchAtLogin: true,
} as const satisfies AppPreferences;

const PREFERENCES_FILENAME = "preferences.json";

export const getPreferencesPath = (userDataPath: string) =>
	path.join(userDataPath, PREFERENCES_FILENAME);

export const readPreferencesFromFile = (filePath: string) => {
	if (!fs.existsSync(filePath)) {
		return { ...DEFAULT_PREFERENCES };
	}

	try {
		const raw = fs.readFileSync(filePath, "utf-8");
		const parsed = JSON.parse(raw) as Partial<AppPreferences>;
		return {
			launchAtLogin:
				typeof parsed.launchAtLogin === "boolean"
					? parsed.launchAtLogin
					: DEFAULT_PREFERENCES.launchAtLogin,
		};
	} catch (error) {
		console.error("Failed to read preferences file, using defaults:", error);
		return { ...DEFAULT_PREFERENCES };
	}
};

export const writePreferencesToFile = (
	filePath: string,
	preferences: AppPreferences,
) => {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, JSON.stringify(preferences, null, 2), "utf-8");
};

export const readPreferencesWithMeta = (userDataPath: string) => {
	const filePath = getPreferencesPath(userDataPath);
	return {
		preferences: readPreferencesFromFile(filePath),
		fileExisted: fs.existsSync(filePath),
	};
};

export const createPreferencesStore = (userDataPath: string) => {
	const filePath = getPreferencesPath(userDataPath);

	return {
		readWithMeta: () => readPreferencesWithMeta(userDataPath),
		readLaunchAtLogin: () => readPreferencesFromFile(filePath).launchAtLogin,
		writeLaunchAtLogin: (enabled: boolean) => {
			const current = readPreferencesFromFile(filePath);
			writePreferencesToFile(filePath, {
				...current,
				launchAtLogin: enabled,
			});
		},
	};
};
