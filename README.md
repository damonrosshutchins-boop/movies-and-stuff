# Shuttle Proxy

A [Scramjet](https://github.com/MercuryWorkshop/scramjet) web proxy with ad, popunder and redirect blocking, deployed to [Surge](https://surge.sh).

**https://movies-and-stuff.surge.sh/**

Surge only serves static files. Scramjet's client runs there fine, but the actual traffic has to leave through a **Wisp** WebSocket server, which a static host cannot run. That one small server is the only piece you host elsewhere (Render, Fly, Railway, a VPS…). Everything else lives on Surge.

## Local development

```bash
npm install
npm run wisp     # terminal 1: Wisp on 127.0.0.1:3001
npm run dev      # terminal 2: http://127.0.0.1:5173
```

Vite proxies `/wisp` to the local server, so no config change is needed locally.

## Deploy

### 1. Wisp server (do this first)

The repo contains a ready server in `server/server.mjs` and a Render blueprint.

- Render: **New → Blueprint**, pick this repo, apply. You get `https://<name>.onrender.com`, so the Wisp URL is `wss://<name>.onrender.com/wisp/`.
- Any other host: `HOST=0.0.0.0 PORT=8080 node server/server.mjs` behind TLS. The WebSocket path must stay `/wisp/`.

Free Render services sleep when idle, so the first connection can take ~30–60s to wake up.

### 2. Point the client at it

Edit `public/config.js`:

```js
wispUrl: "wss://<name>.onrender.com/wisp/",
```

Commit and push.

### 3. Publish to Surge

```bash
npx surge login          # once, if not already logged in
npm run deploy:surge     # build + publish to movies-and-stuff.surge.sh
```

The script builds, writes `dist/200.html` so Surge serves the app for unknown paths, and publishes. Use `npx surge dist <other-name>.surge.sh` for a different domain.

Surge is HTTPS-only, so the tunnel must be `wss://` — a plain `ws://` URL is blocked as mixed content.

## Configuration (`public/config.js`)

| Key | Meaning |
| --- | --- |
| `wispUrl` | Wisp WebSocket URL. Required on the deployed host. Overridable per page load with `?wisp=`. |
| `home` | Page opened on load and by the **ShuttleTV** button. |
| `blockRedirects` | Block top-level navigations that leave the site (popunder redirects). Turn off if a player lives on another domain. |
| `extraBlockedDomains` | More ad hosts, e.g. `"ads.example.com"`. |
| `extraAllowedDomains` | Extra hosts the proxy may navigate to (players, CDNs). |

You can also open a URL directly with `?u=https://example.com/`.

### Testing a tunnel without rebuilding

Append `?wisp=` to override `wispUrl` for that page load only (nothing is saved):

```
https://movies-and-stuff.surge.sh/?wisp=wss://your-server.onrender.com/wisp/
```

`http(s)://` values are converted to `ws(s)://`, and a bare host gets `/wisp/` appended. Combine it with `?u=` if you also want a different start page. Since the override lives in the URL, it survives the reload the proxy does on first visit.

If the tunnel cannot be reached, the first failure shows a short "Waiting for the tunnel" page and retries once after about six seconds; a second failure tells you to wake the host and reload, instead of displaying the service worker's error text.

## What gets blocked

- **Network level** (`src/blocklist.js`): ad exchanges, popunder/push networks and trackers, including the `a.cineflix.st` / `a2.cineflix.st` scripts this site uses. Blocked requests return `204` and never leave through the tunnel.
- **Redirects**: a document navigation to a host the site does not own gets a local "Ad redirect blocked" page with a back button instead of following the chain.
- **Popunders**: `window.open` is disabled, detached `<a>` clicks to foreign hosts are dropped, and `target="_blank"` links to foreign hosts are blocked.
- **Cosmetic**: common ad containers and ad iframes are hidden with CSS.

There is no shell UI: the site fills the window and blocked requests are logged to the browser console (`[blocked:ads] …`, `[blocked:redirects] …`).

## Tested behaviour

- Home page, browsing, images, API calls and in-site navigation render through the proxy.
- The site's ad scripts (`a.cineflix.st`, `a2.cineflix.st`, `adexchangerapid.com`, `usrpubtrk.com`) are blocked before they leave the tunnel, and each block is logged to the console.
- A script-driven navigation to a foreign host gets the "Ad redirect blocked" page; the start URL (from `home` or `?u=`) is trusted.
- **Not verified:** playback. The watch page stayed on "Loading player..." in testing, which is typical of HLS/DRM players inside a JS proxy.

## Limitations

- Not affiliated with shuttletv.pk; you are responsible for what you access and for the local laws that apply.
- DRM-protected streams will not play through any JS proxy, and some players break under proxying. Set `blockRedirects: false` or add the player's domain to `extraAllowedDomains` if a specific title fails.
- Because the static host cannot set response headers, the proxy runs without cross-origin isolation. The libcurl transport used here does not need it.
- If the tunnel drops, Scramjet reconnects; a stalled page usually needs a reload.
