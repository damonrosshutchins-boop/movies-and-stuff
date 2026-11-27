import { defineConfig } from "vite";

// `base: "./"` keeps the build working from any static host or subpath.
export default defineConfig({
	base: "./",
	server: {
		host: "127.0.0.1",
		port: 5173,
	},
	build: {
		target: "es2022",
	},
});
