import fs from "node:fs";
import path from "node:path";

let cache = null;

export function getKnowledgeBase() {
  if (cache) return cache;
  const file = path.join(process.cwd(), "knowledge", "espresso-lab.md");
  cache = fs.readFileSync(file, "utf8");
  return cache;
}
