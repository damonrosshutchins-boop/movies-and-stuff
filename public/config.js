// Runtime configuration. This file is served as-is, so you can edit it after
// building or directly on your deployed site.
window.PROXY_CONFIG = {
	// Wisp (WebSocket tunnel) server. REQUIRED when the page is hosted on
	// GitHub Pages, because Pages cannot run a server.
	// Example: "wss://shuttle-wisp.onrender.com/wisp/"
	wispUrl: "",

	// Page the proxy opens on load and from the "ShuttleTV" button.
	home: "https://shuttletv.pk/",

	// Block top-level navigations that leave the site (the usual popunder
	// redirect). Turn this off if a video player embeds another domain.
	blockRedirects: true,

	// Extra ad/tracker hosts to block, e.g. "ads.example.com".
	extraBlockedDomains: [],

	// Extra hosts the proxy is allowed to navigate to (players, CDNs).
	extraAllowedDomains: [],
};
