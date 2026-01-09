import { QueryClient } from "@tanstack/react-query";

/**
 * Creates a fresh QueryClient configured for testing
 * - Disables retries to make tests deterministic
 * - Disables garbage collection to prevent cache clearing during tests
 */
export function createTestQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: Number.POSITIVE_INFINITY,
				staleTime: Number.POSITIVE_INFINITY,
			},
			mutations: {
				retry: false,
			},
		},
	});
}
