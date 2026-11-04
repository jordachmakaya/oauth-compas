#!/usr/bin/env node
/**
 * @filemeta
 * type: script
 * title: OAuth Compass CLI entry point
 * description: Runs main and sets the process exit code; this file is the executable published as the oauth-compass binary.
 * job_ref: legacy
 * functions: []
 * classes: []
 * inputs: [process.argv]
 * outputs: [process.exitCode]
 * relations:
 *   - imports: src/main.ts
 *   - calls: main
 *   - tested_by: tests/e2e/packed-install.test.ts
 *   - tested_by: tests/e2e/cli.test.ts
 * last_update: 2026-11-04
 */
import { main } from "./main.js";

process.exitCode = await main();
