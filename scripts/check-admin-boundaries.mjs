import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "public", "admin", "config.yml");
const pagePath = path.join(root, "src", "pages", "opportunities.astro");
const updaterPath = path.join(root, "scripts", "update-opportunities.mjs");
const config = await readFile(configPath, "utf8");
const page = await readFile(pagePath, "utf8");
const updater = await readFile(updaterPath, "utf8");

const safeStart = config.indexOf('  - name: "opportunity_intro"');
const archiveStart = config.indexOf('  - name: "archive"');

function requireBoundary(condition, message) {
  if (!condition) {
    throw new Error(`Admin boundary check failed: ${message}`);
  }
}

requireBoundary(safeStart >= 0, "the safe Opportunity Radar introduction collection is missing");
requireBoundary(archiveStart > safeStart, "the admin collection order is malformed");

const safeBlock = config.slice(safeStart, archiveStart);
const protectedFiles = [
  "src/data/opportunities.json",
  "src/data/opportunities.generated.json",
  "src/data/opportunities-ui.json",
  "src/data/opportunity-sources.json",
  "scripts/update-opportunities.mjs"
];

requireBoundary(safeBlock.includes('file: "src/data/opportunities-page.json"'), "the routine editor must use the standalone introduction file");
requireBoundary(safeBlock.includes('file: "src/data/opportunity-source-suggestions.json"'), "the routine editor source suggestion queue is missing");

for (const protectedFile of protectedFiles) {
  requireBoundary(!config.includes(`file: "${protectedFile}"`), `${protectedFile} is exposed through Decap CMS`);
}

requireBoundary(page.includes('import opportunityPage from "../data/opportunities-page.json";'), "the Radar page must import the standalone introduction");
requireBoundary(!page.includes("opportunities.summary"), "the Radar page still reads editable copy from the automation-owned feed");
requireBoundary(!updater.includes("opportunities-page.json"), "the automated refresh must not write the routine editor's introduction file");

console.log("Opportunity Radar admin boundaries are intact.");
