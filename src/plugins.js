import { AD_DOMAINS, AD_PATH_HINTS, COSMETIC_CSS, DEFAULT_ALLOWED_HOSTS } from "./blocklist.js";

function normalizeList(list) {
	return (list || [])
		.map((entry) => String(entry).trim().toLowerCase())
		.filter(Boolean);
}

function hostIn(host, list) {
	return list.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function escapeHtml(value) {
	return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

// Proxied links look like /<base>/~/sj/<controller>/<frame>/<encoded url>.
function decodeProxiedLink(href) {
	try {
		const url = new URL(href);
		const marker = "/~/sj/";
		const index = url.pathname.indexOf(marker);
		if (index === -1) return null;
		const parts = url.pathname.slice(index + marker.length).split("/");
		if (parts.length < 3) return null;
		return new URL(decodeURIComponent(parts.slice(2).join("/")));
	} catch {
		return null;
	}
}

function tunnelPageHtml({ retrying, wispUrl }) {
	const target = escapeHtml(wispUrl);
	const detail = retrying
		? "Retrying in a few seconds…"
		: "Still unreachable. Open the tunnel URL once in a new tab so it can wake up, then reload this page.";
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Waiting for tunnel</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d12;color:#e7e9ee;font:15px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}
.card{max-width:460px;padding:30px;border:1px solid #232838;border-radius:16px;background:#11141b;text-align:center}
h1{font-size:18px;margin:0 0 10px}
p{color:#98a1b2;margin:0 0 10px}
code{display:block;margin:14px 0;padding:10px;border-radius:9px;background:#0b0d12;color:#f3a34d;font-size:12px;word-break:break-all}
</style></head>
<body><div class="card">
<h1>Waiting for the tunnel</h1>
<p>The proxy could not reach its Wisp server. Free hosts sleep, and the first connection can take a while.</p>
<code>${target}</code>
<p>${detail}</p>
</div></body></html>`;
}

function blockedPageHtml(url) {
	const target = escapeHtml(url.href);
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Redirect blocked</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d12;color:#e7e9ee;font:15px/1.6 system-ui,-apple-system,Segoe UI,sans-serif}
.card{max-width:440px;padding:30px;border:1px solid #232838;border-radius:16px;background:#11141b;text-align:center}
h1{font-size:18px;margin:0 0 10px}
p{color:#98a1b2;margin:0 0 8px}
code{display:block;margin:14px 0 18px;padding:10px;border-radius:9px;background:#0b0d12;color:#f3a34d;font-size:12px;word-break:break-all}
button{cursor:pointer;border:0;border-radius:9px;padding:10px 18px;background:#f3a34d;color:#191410;font-weight:600}
</style></head>
<body><div class="card">
<h1>Ad redirect blocked</h1>
<p>Shuttle Proxy stopped this navigation:</p>
<code>${target}</code>
<p>Streaming sites open these automatically when you click the player.</p>
<p style="font-size:12px">If this was your video player, add <b>${escapeHtml(url.hostname)}</b> to <code style="display:inline;padding:1px 4px">extraAllowedDomains</code>.</p>
<button onclick="history.back()">Back to the site</button>
</div></body></html>`;
}

/**
 * Builds the per-frame plugin list. Called after the Scramjet bundles have
 * loaded, because ManagedPlugin is read from the runtime global.
 */
export function makePlugins({ state, config, onUrl, wispUrl }) {
	const ManagedPlugin = globalThis.$scramjetController?.ManagedPlugin;
	if (typeof ManagedPlugin !== "function") {
		throw new Error("Scramjet controller is not loaded");
	}

	const blockedDomains = [...AD_DOMAINS, ...normalizeList(config.extraBlockedDomains)];
	const allowedDomains = [...DEFAULT_ALLOWED_HOSTS, ...normalizeList(config.extraAllowedDomains)];
	try {
		allowedDomains.push(new URL(config.home).hostname.toLowerCase());
	} catch {
		// ignore a malformed home URL
	}

	// Hosts the user opened from the address bar this session. Manual
	// navigation is always allowed; only automatic redirects are blocked.
	const approvedHosts = new Set();
	const allowHost = (href) => {
		try {
			approvedHosts.add(new URL(href).hostname.toLowerCase());
		} catch {
			// ignore malformed input
		}
	};

	const isBlockedHost = (host) => hostIn(host, blockedDomains);
	const isAllowedHost = (host) => hostIn(host, allowedDomains) || approvedHosts.has(host);
	const isAdPath = (url) => {
		const target = `${url.pathname}${url.search}`.toLowerCase();
		return AD_PATH_HINTS.some((hint) => target.includes(hint));
	};
	const blockRedirects = config.blockRedirects !== false;

	class ShuttleBlocker extends ManagedPlugin {
		constructor() {
			super("shuttle-blocker", []);
		}

		install(frame) {
			super.install(frame);

			this.tap(frame.hooks.fetch.request, (context, props) => {
				if (props.earlyResponse) return;

				let url;
				try {
					url = context?.parsed?.url ?? props.url;
					if (!(url instanceof URL)) url = new URL(String(url));
				} catch {
					return;
				}
				if (url.protocol !== "http:" && url.protocol !== "https:") return;

				const host = url.hostname.toLowerCase();
				const thirdParty = !isAllowedHost(host);

				// 1. Known ad/tracker host, or an obvious ad path on a third party.
				if (isBlockedHost(host) || (thirdParty && isAdPath(url))) {
					// Empty script bodies are fine, but a site that parses an ad
					// endpoint as JSON throws on "" and can stall its own init.
					const destination = context?.parsed?.destination;
					const wantsJson = destination === "" || destination === "empty";
					props.earlyResponse = new Response(wantsJson ? "{}" : "", {
						status: 200,
						statusText: "OK",
						headers: wantsJson ? { "content-type": "application/json" } : undefined,
					});
					state.bump("ads", url.href);
					return;
				}

				// 2. Navigation to somewhere the site does not own: the popunder
				//    redirect. The proxied site itself runs in an iframe, so a
				//    top-level navigation there arrives as destination "iframe".
				const destination = context?.parsed?.destination;
				const isNavigation = destination === "document" || destination === "iframe";
				if (blockRedirects && isNavigation && thirdParty) {
					props.earlyResponse = new Response(blockedPageHtml(url), {
						status: 200,
						headers: { "content-type": "text/html; charset=utf-8" },
					});
					state.bump("redirects", url.href);
				}
			});
		}
	}

	class ShuttlePageGuard extends ManagedPlugin {
		constructor() {
			super("shuttle-page-guard", []);
		}

		install(frame) {
			super.install(frame);

			this.tap(frame.hooks.init.post, (context) => {
				const win = context.window;
				const doc = win.document;

				// Popunders: no new windows, ever.
				try {
					Object.defineProperty(win, "open", {
						configurable: false,
						writable: false,
						value: () => {
							state.bump("popups", "window.open()");
							return null;
						},
					});
				} catch {
					// some engines make window.open non-configurable
				}

				// Ad scripts also click anchors they never attached to the DOM.
				try {
					const anchorProto = win.HTMLAnchorElement?.prototype;
					const originalClick = anchorProto?.click;
					if (anchorProto && typeof originalClick === "function") {
						anchorProto.click = function () {
							const real = decodeProxiedLink(this.href);
							if (real && !this.isConnected && !isAllowedHost(real.hostname)) {
								state.bump("popups", real.href);
								return;
							}
							return originalClick.call(this);
						};
					}
				} catch {
					// ignore
				}

				try {
					const style = doc.createElement("style");
					style.setAttribute("data-shuttle-blocker", "");
					style.textContent = COSMETIC_CSS;
					(doc.head || doc.documentElement).appendChild(style);
				} catch {
					// ignore
				}

				if (!context.isTopLevel) return;

				// target="_blank" links to somewhere the site does not own are
				// popunder bait. Open allowed links inside the proxy instead.
				const onClick = (event) => {
					const anchor = event.target?.closest?.("a[href]");
					if (!anchor) return;
					const target = (anchor.getAttribute("target") || "").toLowerCase();
					if (target !== "_blank" && target !== "_new") return;
					const real = decodeProxiedLink(anchor.href);
					if (!real) return;
					event.preventDefault();
					event.stopImmediatePropagation();
					if (isAllowedHost(real.hostname)) frame.go(real.href);
					else state.bump("popups", real.href);
				};
				doc.addEventListener("click", onClick, true);
				doc.addEventListener("auxclick", onClick, true);

								try {
					onUrl(String(context.client?.url?.href ?? context.client?.url ?? ""));
					// A navigation the user asked for (a real click) is allowed even
					// when it leaves the site; script-driven redirects are not.
					this.tap(context.client.hooks.lifecycle.navigate, (navContext, props) => {
						if (typeof props?.url !== "string") return;
						if (win.navigator?.userActivation?.isActive) allowHost(props.url);
						onUrl(props.url);
					});
				} catch {
					// URL reporting is cosmetic; never break the page over it.
				}
			});
		}
	}

	// Turns a failed first navigation (no tunnel yet) into a readable page and
	// one automatic retry, instead of the service worker's error text.
	class ShuttleTunnelGuard extends ManagedPlugin {
		constructor() {
			super("shuttle-tunnel", []);
		}

		install(frame) {
			super.install(frame);
			let documentLoaded = false;
			let retried = false;

			this.tap(frame.hooks.init.post, (context) => {
				if (context.isTopLevel) documentLoaded = true;
			});

			this.tap(frame.hooks.error.request, (context, props) => {
				if (documentLoaded) return;
				if (context.error?.name === "AbortError") return;

				const destination = context.rawrequest?.destination;
				if (destination !== "document" && destination !== "iframe") return;

				props.suppressError = true;
				props.setResponse = {
					body: tunnelPageHtml({ retrying: !retried, wispUrl }),
					status: 200,
					statusText: "OK",
					headers: [["content-type", "text/html; charset=utf-8"]],
				};

				if (retried) return;
				retried = true;
				setTimeout(() => {
					const target = frame.element.src;
					if (!target) return;
					// Clear first: assigning an identical src back would be a no-op.
					frame.element.removeAttribute("src");
					frame.element.src = target;
				}, 6000);
			});
		}
	}

	return {
		plugins: [new ShuttleBlocker(), new ShuttlePageGuard(), new ShuttleTunnelGuard()],
		allowHost,
	};
}
