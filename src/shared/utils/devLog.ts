/**
 * Dev-only diagnostic console logger.
 *
 * Verbose traces (beat grid alignment, drift correction, gap filtering,
 * etc.) are valuable while developing but should not ship to production
 * consoles or telemetry. `devLog` writes to `console.log` in dev builds
 * and no-ops in production — no runtime branching at each call site.
 *
 * Prefer this over `console.log` anywhere the `no-console` ESLint rule
 * fires for intentional debug output. For user-visible warnings keep
 * `console.warn` / `console.error`, which the rule already allows.
 */

const IS_DEV: boolean =
  typeof import.meta !== 'undefined' &&
  Boolean((import.meta as ImportMeta).env?.DEV);

// eslint-disable-next-line no-console
const rawConsoleLog = console.log.bind(console);

export const devLog: (...args: unknown[]) => void = IS_DEV
  ? rawConsoleLog
  : () => {};
