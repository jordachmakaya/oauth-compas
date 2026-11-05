/**
 * @filemeta
 * type: script
 * title: Provider check runner
 * description: Runs the provider drift checks over the network, writes a markdown report and tells the workflow if an issue is needed.
 * job_ref: untracked
 * functions: [fetchPage]
 * classes: []
 * inputs: [docs/*.md, REPORT_PATH, SIMULATE_FAILURE, GITHUB_OUTPUT]
 * outputs: [markdown report, broken workflow output]
 * relations:
 *   - imports: scripts/provider-checks.ts
 *   - imports: src/providers/index.ts
 *   - reads: docs/google.md
 *   - calls: runChecks
 *   - calls: renderReport
 *   - configures: .github/workflows/provider-check.yml
 * last_update: 2026-11-04
 */
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { providerIds } from "../src/providers/index.js";
import { renderReport, runChecks, type FetchResult, type Report } from "./provider-checks.js";

async function fetchPage(url: string): Promise<FetchResult> {
  try {
    const response = await fetch(url, { headers: { "user-agent": "oauth-compass-provider-check" }, signal: AbortSignal.timeout(20000) });
    return { status: response.status, text: await response.text() };
  } catch { return { status: 0, text: "" }; }
}

const guides = Object.fromEntries(await Promise.all(providerIds.map(async (id) => [id, await readFile(`docs/${id}.md`, "utf8")] as const)));
const checked = await runChecks(fetchPage, guides);
const simulated = { provider: "test", check: "simulation", detail: "Simulated failure to test issue creation. Close this issue." };
const report: Report = process.env.SIMULATE_FAILURE === "true" ? { ...checked, broken: [...checked.broken, simulated] } : checked;

process.stdout.write(`passed=${report.passed} broken=${report.broken.length} unverified=${report.unverified.length}\n`);
for (const item of [...report.broken, ...report.unverified]) process.stdout.write(`${item.provider} ${item.check}: ${item.detail}\n`);
// A check that verified nothing must not look like a healthy result.
if (report.passed === 0) throw new Error("No provider check could be verified");
if (report.broken.length > 0) await writeFile(process.env.REPORT_PATH ?? "provider-report.md", renderReport(report));
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `broken=${report.broken.length > 0}\n`);
