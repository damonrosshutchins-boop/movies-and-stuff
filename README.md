# ShuttleTV embed

A single static page that loads [shuttletv.pk](https://shuttletv.pk/) full-screen. Nothing is proxied: the browser talks to the site directly, and there is no server, tunnel or service worker involved.

**https://movies-and-stuff.surge.sh/**

## What is blocked

The site is loaded in an iframe with a restrictive `sandbox` (see `index.html`). The sandbox omits two capabilities, which is where the blocking comes from:

| Omitted capability | Effect |
| --- | --- |
| `allow-popups` | `window.open` and `target="_blank"` links cannot create tabs. This kills the popunder ads. |
| `allow-top-navigation` | The framed site cannot navigate the page it sits in, so an ad redirect cannot replace the page with an ad site. |

Everything the site legitimately needs is granted: scripts, same-origin storage, forms, modals, downloads, fullscreen and autoplay.

## What is not blocked

Ad scripts, trackers and banners **inside** the page still load. A page cannot read, restyle or intercept another origin's document or requests — that needs request interception, which only an extension or a proxy has.

If you want those gone too, install an ad blocker (uBlock Origin) or use the proxy version, which is preserved in this repository's git history (commits before "Embed the site directly").

## Configuration

`public/config.js`:

```js
window.SITE_CONFIG = {
	home: "https://shuttletv.pk/",
};
```

Override per visit with `?u=`, e.g. `?u=https://shuttletv.pk/movies`.

## Local development

```bash
npm install
npm run dev     # http://127.0.0.1:5173
```

## Deploy

Surge hosts the built `dist/` folder:

```bash
npx surge login          # once, if not already logged in
npm run deploy:surge     # build + publish to movies-and-stuff.surge.sh
```

The script writes `dist/200.html` so Surge serves the page for unknown paths. Use `npx surge dist <other-name>.surge.sh` for a different domain.

## Limitations

- Works only while the site allows framing. It currently sends no `X-Frame-Options` and no `frame-ancestors`; if that changes, the page will come up blank and this approach stops working.
- Modern browsers partition third-party cookies, so signing in on the embedded copy may not persist. Open the site directly for an account.
- Not affiliated with shuttletv.pk; you are responsible for what you access and for the local laws that apply.
