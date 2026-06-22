#!/usr/bin/env node
/**
 * Presubmit wrapper — logs wall-clock duration for engineering health tracking.
 */
import { spawnSync } from 'node:child_process';

const start = Date.now();
const result = spawnSync('sh', ['scripts/presubmit.sh'], { stdio: 'inherit' });
const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\npresubmit duration: ${elapsedSec}s (target ≤480s — see docs/CI_PATH_SCOPING.md)`);
process.exit(result.status ?? 1);
