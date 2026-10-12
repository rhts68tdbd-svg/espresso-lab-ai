import { registerHooks } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { transformSync, loadBindings } from "next/dist/build/swc/index.js";
await loadBindings();
const root = new URL("../", import.meta.url).href;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && context.parentURL?.startsWith(root)) {
      const url = new URL(specifier, context.parentURL);
      if (!/\.(mjs|js|jsx)$/.test(url.pathname))
        for (const ext of [".jsx", ".js", ".mjs"]) {
          const candidate = new URL(url.href + ext);
          if (existsSync(fileURLToPath(candidate)))
            return next(candidate.href, context);
        }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (
      url.startsWith(root) &&
      !url.includes("/node_modules/") &&
      /\.(jsx|js)$/.test(url)
    )
      return {
        format: "module",
        shortCircuit: true,
        source: transformSync(readFileSync(fileURLToPath(url), "utf8"), {
          filename: fileURLToPath(url),
          jsc: {
            parser: { syntax: "ecmascript", jsx: true },
            transform: { react: { runtime: "automatic" } },
            target: "es2022",
          },
          module: { type: "es6" },
        }).code,
      };
    return next(url, context);
  },
});
