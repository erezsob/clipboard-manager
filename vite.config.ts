import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	base: "./", // Important for Electron
	server: {
		port: 5173,
		strictPort: true,
	},
	build: {
		outDir: "dist",
	},
});
