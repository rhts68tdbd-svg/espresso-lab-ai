import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
async function files(root) {
  const entries = await readdir(root, { withFileTypes: true }),
    out = [];
  for (const e of entries) {
    const path = join(root, e.name);
    if (e.isDirectory()) out.push(...(await files(path)));
    else if (/\.(js|css|woff2?)$/.test(path)) out.push(path);
  }
  return out;
}
const assets = (await files(".next/static"))
  .map((p) => "/_next/" + p.replace(/^\.next\//, ""))
  .sort();
const template = await readFile("scripts/service-worker.js", "utf8"),
  hash = createHash("sha256")
    .update(template + assets.join("\n"))
    .digest("hex")
    .slice(0, 12);
await writeFile(
  "public/sw.js",
  template
    .replace("__CACHE_NAME__", `espresso-lab-${hash}`)
    .replace(
      "__ASSETS__",
      JSON.stringify([
        "/",
        "/manifest.webmanifest",
        "/icon.svg",
        "/icon-192.png",
        "/icon-512.png",
        "/icon-180.png",
        ...assets,
      ]),
    ),
);
console.log(
  `Offline shell generated: ${assets.length} immutable assets, ${hash}`,
);
