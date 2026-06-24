import {
	writePreferencesToFile,
	getPreferencesPath,
	type AppPreferences,
	type createPreferencesStore,
} from "./preferences.js";

export type LoginItemSettingsReader = () => {
	openAtLogin: boolean;
};

export type LoginItemSettingsWriter = (settings: {
	openAtLogin: boolean;
	openAsHidden: boolean;
}) => void;

export type LaunchAtLoginSync = boolean | null;

export type ReconcileLaunchAtLoginInput = {
	isPackaged: boolean;
	preferencesFileExisted: boolean;
	jsonLaunchAtLogin: boolean;
	macosOpenAtLogin: boolean;
};

export type ReconcileLaunchAtLoginResult = {
	effective: boolean;
	syncToMacOS: LaunchAtLoginSync;
	updateJson: boolean | null;
	persistInitialPreferences: boolean;
};

/**
 * Pure reconciliation logic for launch-at-login preference vs macOS state.
 */
export const reconcileLaunchAtLogin = ({
	isPackaged,
	preferencesFileExisted,
	jsonLaunchAtLogin,
	macosOpenAtLogin,
}: ReconcileLaunchAtLoginInput): ReconcileLaunchAtLoginResult => {
	if (!isPackaged) {
		return {
			effective: jsonLaunchAtLogin,
			syncToMacOS: null,
			updateJson: null,
			persistInitialPreferences: !preferencesFileExisted,
		};
	}

	if (macosOpenAtLogin === jsonLaunchAtLogin) {
		return {
			effective: jsonLaunchAtLogin,
			syncToMacOS: null,
			updateJson: null,
			persistInitialPreferences: !preferencesFileExisted,
		};
	}

	if (!macosOpenAtLogin && jsonLaunchAtLogin) {
		if (!preferencesFileExisted) {
			return {
				effective: true,
				syncToMacOS: true,
				updateJson: null,
				persistInitialPreferences: true,
			};
		}

		return {
			effective: false,
			syncToMacOS: null,
			updateJson: false,
			persistInitialPreferences: false,
		};
	}

	return {
		effective: false,
		syncToMacOS: false,
		updateJson: null,
		persistInitialPreferences: !preferencesFileExisted,
	};
};

export type LaunchAtLoginDeps = {
	isPackaged: boolean;
	getLoginItemSettings: LoginItemSettingsReader;
	setLoginItemSettings: LoginItemSettingsWriter;
	preferencesStore: ReturnType<typeof createPreferencesStore>;
	userDataPath: string;
};

export type SetLaunchAtLoginResult = {
	success: boolean;
	error?: string;
};

const applyMacOSSync = (
	deps: LaunchAtLoginDeps,
	enabled: boolean,
): SetLaunchAtLoginResult => {
	if (!deps.isPackaged) {
		return { success: true };
	}

	try {
		deps.setLoginItemSettings({
			openAtLogin: enabled,
			openAsHidden: true,
		});

		const actualState = deps.getLoginItemSettings().openAtLogin;
		if (actualState !== enabled) {
			return {
				success: false,
				error: enabled
					? "Couldn't enable launch at login"
					: "Couldn't disable launch at login",
			};
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Couldn't update launch at login",
		};
	}
};

const applyReconcileResult = (
	deps: LaunchAtLoginDeps,
	result: ReconcileLaunchAtLoginResult,
): SetLaunchAtLoginResult => {
	if (result.updateJson !== null) {
		deps.preferencesStore.writeLaunchAtLogin(result.updateJson);
	}

	if (result.persistInitialPreferences) {
		writePreferencesToFile(getPreferencesPath(deps.userDataPath), {
			launchAtLogin: result.effective,
		} satisfies AppPreferences);
	}

	if (result.syncToMacOS === null) {
		return { success: true };
	}

	return applyMacOSSync(deps, result.syncToMacOS);
};

export const createLaunchAtLoginModule = (deps: LaunchAtLoginDeps) => {
	const runReconciliation = (): SetLaunchAtLoginResult => {
		const { preferences, fileExisted } = deps.preferencesStore.readWithMeta();
		const macosOpenAtLogin = deps.isPackaged
			? deps.getLoginItemSettings().openAtLogin
			: false;

		const result = reconcileLaunchAtLogin({
			isPackaged: deps.isPackaged,
			preferencesFileExisted: fileExisted,
			jsonLaunchAtLogin: preferences.launchAtLogin,
			macosOpenAtLogin,
		});

		return applyReconcileResult(deps, result);
	};

	return {
		reconcileOnStartup: (): SetLaunchAtLoginResult => runReconciliation(),
		reconcileOnSettingsOpen: (): boolean => {
			const reconciliation = runReconciliation();
			if (!reconciliation.success) {
				console.error(
					"Failed to reconcile launch at login on settings open:",
					reconciliation.error,
				);
			}

			if (deps.isPackaged) {
				return deps.getLoginItemSettings().openAtLogin;
			}

			return deps.preferencesStore.readLaunchAtLogin();
		},
		getEffectiveLaunchAtLogin: (): boolean => {
			if (deps.isPackaged) {
				return deps.getLoginItemSettings().openAtLogin;
			}

			return deps.preferencesStore.readLaunchAtLogin();
		},
		setLaunchAtLogin: (enabled: boolean): SetLaunchAtLoginResult => {
			const previous = deps.preferencesStore.readLaunchAtLogin();
			deps.preferencesStore.writeLaunchAtLogin(enabled);

			const syncResult = applyMacOSSync(deps, enabled);
			if (!syncResult.success) {
				deps.preferencesStore.writeLaunchAtLogin(previous);
			}

			return syncResult;
		},
	};
};
