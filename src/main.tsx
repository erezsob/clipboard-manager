import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { QUERY_GC_TIME, QUERY_STALE_TIME } from "./lib/constants";

/**
 * TanStack Query client with optimized settings for clipboard manager
 */
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: QUERY_STALE_TIME,
			gcTime: QUERY_GC_TIME,
			refetchOnWindowFocus: true,
			retry: 2,
		},
	},
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	</React.StrictMode>,
);
