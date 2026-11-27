import http from "node:http";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const port = Number.parseInt(process.env.PORT ?? "", 10) || 3001;
const host = process.env.HOST || "127.0.0.1";

// Safe defaults for a public tunnel. Do not relax these: private and loopback
// addresses would let proxy users reach services on this machine.
wisp.options.allow_private_ips = false;
wisp.options.allow_loopback_ips = false;
wisp.options.allow_udp_streams = false;
wisp.options.stream_limit_per_host = 64;
wisp.options.dns_servers = ["1.1.1.1", "1.0.0.1"];

const server = http.createServer((req, res) => {
	res.setHeader("access-control-allow-origin", "*");

	if (req.url === "/" || req.url === "/health" || req.url === "/wisp/") {
		res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
		res.end("wisp server is running\n");
		return;
	}

	res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
	res.end("not found\n");
});

server.on("upgrade", (req, socket, head) => {
	if (!req.url || !req.url.startsWith("/wisp/")) {
		socket.destroy();
		return;
	}
	wisp.routeRequest(req, socket, head);
});

server.listen(port, host, () => {
	console.log(`wisp server listening on http://${host}:${port}/wisp/`);
});
