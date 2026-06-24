import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	DEFAULT_PREFERENCES,
	getPreferencesPath,
	readPreferencesFromFile,
	readPreferencesWithMeta,
	writePreferencesToFile,
} from "./preferences.js";

describe("preferences", () => {
	const tempDirs: string[] = [];

	const createTempUserDataPath = (): string => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "clipboard-prefs-"));
		tempDirs.push(dir);
		return dir;
	};

	afterEach(() => {
		for (const dir of tempDirs.splice(0)) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});

	it("returns defaults when preferences file is missing", () => {
		const userDataPath = createTempUserDataPath();
		const filePath = getPreferencesPath(userDataPath);

		expect(readPreferencesFromFile(filePath)).toEqual(DEFAULT_PREFERENCES);
	});

	it("reads and writes launchAtLogin preference", () => {
		const userDataPath = createTempUserDataPath();
		const filePath = getPreferencesPath(userDataPath);

		writePreferencesToFile(filePath, { launchAtLogin: false });
		expect(readPreferencesFromFile(filePath)).toEqual({ launchAtLogin: false });

		writePreferencesToFile(filePath, { launchAtLogin: true });
		expect(readPreferencesFromFile(filePath)).toEqual({ launchAtLogin: true });
	});

	it("reports whether the preferences file existed before read", () => {
		const userDataPath = createTempUserDataPath();

		const missing = readPreferencesWithMeta(userDataPath);
		expect(missing.fileExisted).toBe(false);
		expect(missing.preferences).toEqual(DEFAULT_PREFERENCES);

		writePreferencesToFile(getPreferencesPath(userDataPath), {
			launchAtLogin: false,
		});

		const existing = readPreferencesWithMeta(userDataPath);
		expect(existing.fileExisted).toBe(true);
		expect(existing.preferences).toEqual({ launchAtLogin: false });
	});

	it("falls back to defaults when preferences file is invalid JSON", () => {
		const userDataPath = createTempUserDataPath();
		const filePath = getPreferencesPath(userDataPath);
		fs.writeFileSync(filePath, "{not-json", "utf-8");

		expect(readPreferencesFromFile(filePath)).toEqual(DEFAULT_PREFERENCES);
	});
});
