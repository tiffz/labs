/**
 * Types for `labs-dev-port.mjs`.
 *
 * The module stays plain JavaScript because `.husky/pre-push` runs it directly
 * with node, and a hook is the wrong place for a TypeScript toolchain. But
 * `vite.config.ts` is inside `tsconfig.json`'s `include`, so importing it from
 * there needs declarations — `playwright.config.ts` makes the same import and
 * never needed them only because it is not in the program.
 */

/** The port the main checkout keeps: 5173. */
export const DEFAULT_DEV_PORT: number;

/** True when `dir` is a linked git worktree rather than the main checkout. */
export function isLinkedWorktree(dir: string): boolean;

/**
 * The dev-server port `dir` owns.
 *
 * `LABS_E2E_PORT` wins if set; otherwise the main checkout gets
 * {@link DEFAULT_DEV_PORT} and every linked worktree a deterministic port
 * derived from its path.
 */
export function resolveDevServerPort(
  dir: string,
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>,
): number;
