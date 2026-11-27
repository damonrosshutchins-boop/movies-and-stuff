import "./style.css";
import LibcurlClient from "@mercuryworkshop/libcurl-transport";
import { makePlugins } from "./plugins.js";

// "/" on a root domain, "/repo/" on a GitHub Pages project site.
const BASE = new URL("./", document.baseURI).pathname;

const DEFAULT_CONFIG = {
	wispUrl: "",
	home: "https://shuttletv.pk/",
	blockRedirects: true,
	extraBlockedDomains: [],
	extraAllowedDomains: [],
};

const config = { ...DEFAULT_CONFIG };
const frameElement = document.getElementById("frame");

// Blocked-request counters live in the console only; there is no UI.
const state = {
	ads: 0,
	redirects: 0,
	popups: 0,
	bump(kind, url) {
		if (typeof this[kind] === "number") this[kind] += 1;
		console.info(`[blocked:${kind}] ${url}`);
	},
};

function loadScript(src) {
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = src;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error(`Could not load ${src}`));
		document.head.appendChild(script);
	});
}

function normalizeUrl(raw) {
	const value = String(raw || "").trim();
	if (!value) return null;
	try {
		const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
		const url = new URL(withScheme);
		if (url.protocol !== "http:" && url.protocol !== "https:") return null;
		return url.href;
	} catch {
		return null;
	}
}

function resolveWispUrl() {
	const explicit = String(config.wispUrl || "").trim();
	if (explicit) return explicit;
	const scheme = location.protocol === "https:" ? "wss:" : "ws:";
	return `${scheme}//${location.host}${BASE}wisp/`;
}

async function ensureServiceWorker() {
	if (!("serviceWorker" in navigator)) {
		throw new Error("This browser does not support service workers.");
	}

	await navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE });
	await navigator.serviceWorker.ready;

	if (navigator.serviceWorker.controller) return true;

	// First visit: the worker is installed but not yet controlling this page.
	// Reload once so proxied frame requests get intercepted.
	const key = "shuttle:sw-reload";
	if (!sessionStorage.getItem(key)) {
		sessionStorage.setItem(key, "1");
		location.reload();
		return false;
	}

	throw new Error("The service worker is not controlling this page. Hard-reload with Ctrl+Shift+R.");
}

// Only shown when the proxy cannot work at all (no tunnel URL).
function showTunnelNotice() {
	document.body.textContent = "";
	const notice = document.createElement("p");
	notice.style.cssText =
		"margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;" +
		"padding:24px;background:#000;color:#f3a34d;text-align:center;" +
		"font:14px/1.7 system-ui,-apple-system,Segoe UI,sans-serif";
	notice.textContent =
		"No tunnel configured. Set wispUrl in config.js to your Wisp server, " +
		"for example wss://your-server.onrender.com/wisp/.";
	document.body.appendChild(notice);
}

async function boot() {
	await loadScript(`${BASE}config.js`).catch(() => {
		console.warn("config.js missing, using defaults");
	});
	Object.assign(config, window.PROXY_CONFIG || DEFAULT_CONFIG);

	const isLocalHost = /^(localhost|127(?:\.\d+){3}|\[::1\])$/i.test(location.hostname);
	if (!String(config.wispUrl || "").trim() && !isLocalHost) {
		console.error(
			"Wisp server not configured. Set wispUrl in config.js to your deployed Wisp server (see README).",
		);
		showTunnelNotice();
		return;
	}

	const controlled = await ensureServiceWorker();
	if (!controlled) return;

	await loadScript(`${BASE}scramjet/scramjet.js`);
	await loadScript(`${BASE}controller/controller.api.js`);

	const { Controller } = globalThis.$scramjetController;
	const controller = new Controller({
		serviceworker: navigator.serviceWorker.controller,
		transport: new LibcurlClient({ wisp: resolveWispUrl() }),
		config: {
			// A subpath-aware prefix: the worker is registered at BASE, so it
			// must cover every proxied URL.
			prefix: `${BASE}~/sj/`,
			scramjetPath: `${BASE}scramjet/scramjet.js`,
			wasmPath: `${BASE}scramjet/scramjet.wasm`,
			injectPath: `${BASE}controller/controller.inject.js`,
		},
	});

	await controller.wait();

	const { plugins, allowHost } = makePlugins({ state, config, onUrl: () => {} });
	const frame = controller.createFrame(frameElement, { plugins });

	const start = new URLSearchParams(location.search).get("u") || config.home;
	const url = normalizeUrl(start) || normalizeUrl(config.home);
	if (!url) throw new Error("No valid start URL: check `home` in config.js");
	allowHost(url);
	frame.go(url);
}

boot().catch((error) => {
	console.error(error);
});
