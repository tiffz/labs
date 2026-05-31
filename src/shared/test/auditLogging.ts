/**
 * Gate verbose audit / diagnostic logging behind VITEST_VERBOSE_AUDIT=true
 * so presubmit and CI stay quiet while local debugging stays easy.
 */
export function isVerboseAudit(): boolean {
  return process.env.VITEST_VERBOSE_AUDIT === 'true';
}

export function logVerboseAudit(...args: unknown[]): void {
  if (isVerboseAudit()) {
     
    console.log(...args);
  }
}

/** Log failure details only when the audit fails (always useful in CI). */
export function logAuditFailures(title: string, lines: string[]): void {
  if (lines.length === 0) return;
   
  console.log(`\n${title}`);
  for (const line of lines) {
     
    console.log(line);
  }
}
