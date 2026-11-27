import { copyFile, mkdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const require = createRequire(import.meta.url);

const { scramjetPath } = require("@mercuryworkshop/scramjet/path");
const { controllerPath } = require("@mercuryworkshop/scramjet-controller/path");

const jobs = [
	{
		from: scramjetPath,
		to: resolve("public/scramjet"),
		files: ["scramjet.js", "scramjet.wasm"],
	},
	{
		from: controllerPath,
		to: resolve("public/controller"),
		files: ["controller.api.js", "controller.inject.js", "controller.sw.js"],
	},
];

for (const job of jobs) {
	await rm(job.to, { recursive: true, force: true });
	await mkdir(job.to, { recursive: true });
	for (const file of job.files) {
		await copyFile(join(job.from, file), join(job.to, file));
	}
	console.log(`copied ${job.files.length} files -> ${job.to}`);
}
