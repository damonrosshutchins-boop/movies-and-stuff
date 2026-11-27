import "./style.css";

const DEFAULT_CONFIG = {
	home: "https://shuttletv.pk/",
};

const frame = document.getElementById("site");

function loadConfig() {
	return new Promise((resolve) => {
		const script = document.createElement("script");
		script.src = new URL("config.js", document.baseURI).href;
		script.onload = resolve;
		script.onerror = resolve;
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

await loadConfig();

const config = { ...DEFAULT_CONFIG, ...(window.SITE_CONFIG || {}) };
const requested = new URLSearchParams(location.search).get("u");
const target = normalizeUrl(requested) || normalizeUrl(config.home);

if (target) {
	frame.src = target;
} else {
	console.error("No valid site URL: check `home` in config.js");
}
