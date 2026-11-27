import { defineConfig } from "vite";

// `base: "./"` keeps the build working both at a domain root (user.github.io)
// and under a project path (user.github.io/repo/).
export default defineConfig({
	base: "./",
	server: {
		host: "127.0.0.1",
		port: 5173,
		proxy: {
			// Local development only: the Wisp server from `npm run wisp`
			// is reachable at the same origin as the page.
			"/wisp": {
				target: "http://127.0.0.1:3001",
				ws: true,
			},
		},
	},
	build: {
		target: "es2022",
	},
});
