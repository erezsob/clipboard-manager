import "@testing-library/jest-dom";
import { afterEach, beforeEach, vi } from "vitest";
import { createMockElectronAPI } from "./mocks/electronAPI";

/**
 * Global test setup for the clipboard manager application
 * - Configures jest-dom matchers
 * - Sets up window.electronAPI mock before each test
 * - Cleans up mocks after each test
 */

// Store the mock so tests can access and modify it
let mockElectronAPI = createMockElectronAPI();

/**
 * Get the current mock electronAPI instance
 * Use this in tests to configure mock responses or verify calls
 */
export function getMockElectronAPI() {
	return mockElectronAPI;
}

beforeEach(() => {
	// Create a fresh mock for each test
	mockElectronAPI = createMockElectronAPI();

	// Set up window.electronAPI global
	Object.defineProperty(window, "electronAPI", {
		value: mockElectronAPI,
		writable: true,
		configurable: true,
	});
});

afterEach(() => {
	// Clear all mocks after each test
	vi.clearAllMocks();

	// Clean up timers if any were used
	vi.useRealTimers();
});
