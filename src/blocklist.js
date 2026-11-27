// Hosts blocked at the network layer. A host matches when it is equal to an
// entry or is a subdomain of one (so "doubleclick.net" covers
// "ad.doubleclick.net"). Add your own with PROXY_CONFIG.extraBlockedDomains.
export const AD_DOMAINS = [
	// Ad exchanges and trackers
	"doubleclick.net",
	"googlesyndication.com",
	"googleadservices.com",
	"adservice.google.com",
	"google-analytics.com",
	"googletagmanager.com",
	"adnxs.com",
	"adsrvr.org",
	"amazon-adsystem.com",
	"casalemedia.com",
	"contextweb.com",
	"criteo.com",
	"criteo.net",
	"districtm.io",
	"emxdgt.com",
	"gmossp-sp.jp",
	"indexww.com",
	"innity.net",
	"mgid.com",
	"moatads.com",
	"nativeads.com",
	"openx.net",
	"outbrain.com",
	"pubmatic.com",
	"quantserve.com",
	"revcontent.com",
	"rubiconproject.com",
	"scorecardresearch.com",
	"sharethrough.com",
	"smartadserver.com",
	"sovrn.com",
	"spotxchange.com",
	"taboola.com",
	"teads.tv",
	"tremorhub.com",
	"triplelift.com",
	"yieldmo.com",
	"33across.com",
	"adsafeprotected.com",
	"doubleverify.com",
	"chartbeat.com",

	// Popunder / push / redirect networks
	"popads.net",
	"popcash.net",
	"popmyads.com",
	"popunder.net",
	"popunderjs.com",
	"popunderjs.net",
	"propellerads.com",
	"propellersystems.com",
	"onclickalgo.com",
	"onclickmega.com",
	"onclckds.com",
	"adsterra.com",
	"hilltopads.net",
	"exoclick.com",
	"exosrv.com",
	"juicyads.com",
	"trafficjunky.net",
	"clickadu.com",
	"clickaine.com",
	"adcash.com",
	"monetag.com",
	"profitableratecpm.com",
	"highperformanceformat.com",
	"effectivegatecpm.com",
	"displaycontentnetwork.com",
	"clckd.co",
	"adexchangerapid.com",
	"ymvhnxcaanmuy.site",
	"usrpubtrk.com",
	"adf.ly",
	"linkvertise.com",

	// Used by this site for its ad scripts (not its video CDN)
	"a.cineflix.st",
	"a2.cineflix.st",
	"profiton.io",
	"profiton.link",
	"profiton.com",
];

// URL fragments that only appear on ad requests. Applied to third-party hosts
// only, so the site's own paths are never touched.
export const AD_PATH_HINTS = [
	"popunder",
	"/pagead/",
	"/adsbygoogle/",
	"/prebid",
	"/adserver/",
	"advertise",
	"profitablecpm",
];

// Hosts the proxy may navigate to. The home URL's host is added automatically.
export const DEFAULT_ALLOWED_HOSTS = [
	"shuttletv.pk",
	"shuttletv.cr",
	"shuttletv.ga",
];

// Cosmetic filtering for ad containers that survive the network block.
export const COSMETIC_CSS = `
ins.adsbygoogle,
[data-ad-slot],
[data-ad-client],
[id^="google_ads"],
[id*="google-ad"],
[id*="popunder"],
[class*="popunder"],
[id*="profiton"],
[class*="profiton"],
iframe[src*="cineflix.st"],
iframe[src*="doubleclick.net"],
iframe[src*="googlesyndication.com"],
[id*="ad-overlay"],
[class*="ad-overlay"],
[class*="advert-"],
[class*="advertisement"],
[class*="sponsored-"],
[data-advertisement] {
	display: none !important;
}
`;
