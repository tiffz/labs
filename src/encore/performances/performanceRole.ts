import { ENCORE_PERFORMANCE_ROLES, type EncorePerformance, type EncorePerformanceRole } from '../types';

/**
 * Her part at a show, and what follows from it.
 *
 * Two rules live here and nowhere else, for the same reason `performanceSubject.ts` owns
 * `subjectKind`: a default and a derivation duplicated across call sites drift apart, and the
 * drift is silent.
 *
 * 1. **Absent means `'Lead vocal'`.** Every performance logged before roles existed was her singing
 *    lead, so the field is optional and its absence carries that meaning. No migration, and old
 *    rows stay byte-identical on the wire.
 * 2. **"Main performer" is derived, never stored.** A stored `isMain` flag beside the role is a
 *    second source of truth for one fact; change the role without the flag and the archive quietly
 *    disagrees with itself. This matters more than usual because the derivation gates what the
 *    public snapshot publishes.
 *
 * Nothing outside this module should read `p.role` directly.
 */

/**
 * Roles where she is the performer the audience came for.
 *
 * `'Instrumental'` counts: a solo piano piece is her performance, not support for someone else's.
 * The line is *featured vs supporting*, not *voice vs instrument* — which is why one role field
 * answers the question and a separate instrument field is not needed to.
 */
export const MAIN_PERFORMER_ROLES: readonly EncorePerformanceRole[] = ['Lead vocal', 'Instrumental'];

/** Roles where she is supporting someone else's performance. */
export const SUPPORTING_ROLES: readonly EncorePerformanceRole[] = ENCORE_PERFORMANCE_ROLES.filter(
  (role) => !MAIN_PERFORMER_ROLES.includes(role),
);

/** The role of a performance, resolving the absent-means-lead default. */
export function performanceRole(performance: Pick<EncorePerformance, 'role'>): EncorePerformanceRole {
  return performance.role ?? 'Lead vocal';
}

/** Whether a role makes her the featured performer. */
export function isMainPerformerRole(role: EncorePerformanceRole): boolean {
  return MAIN_PERFORMER_ROLES.includes(role);
}

/** Whether she was the featured performer at this show. Drives the default list scope and the public snapshot. */
export function isMainPerformance(performance: Pick<EncorePerformance, 'role'>): boolean {
  return isMainPerformerRole(performanceRole(performance));
}

/**
 * Which slice of the log is in view.
 *
 * One concept shared by the Activity list, Insights, and the Library role filter, so "main" means
 * the same thing in all three. `'main'` is the default everywhere.
 */
export type PerformanceScope = 'main' | 'supporting' | 'all';

export const PERFORMANCE_SCOPES: readonly PerformanceScope[] = ['main', 'supporting', 'all'];

/** Whether a performance belongs in the given scope. */
export function performanceMatchesScope(
  performance: Pick<EncorePerformance, 'role'>,
  scope: PerformanceScope,
): boolean {
  if (scope === 'all') return true;
  const main = isMainPerformance(performance);
  return scope === 'main' ? main : !main;
}

/** Filter a list to one scope. The single place callers should narrow by role. */
export function filterPerformancesByScope<T extends Pick<EncorePerformance, 'role'>>(
  performances: readonly T[],
  scope: PerformanceScope,
): T[] {
  if (scope === 'all') return [...performances];
  return performances.filter((p) => performanceMatchesScope(p, scope));
}

/** Narrow an unknown string to a role, for persisted prefs and wire data that may predate a rename. */
export function parsePerformanceRole(value: unknown): EncorePerformanceRole | undefined {
  return typeof value === 'string' && (ENCORE_PERFORMANCE_ROLES as readonly string[]).includes(value)
    ? (value as EncorePerformanceRole)
    : undefined;
}

/** Narrow an unknown string to a scope, for the persisted list preference. */
export function parsePerformanceScope(value: unknown): PerformanceScope | undefined {
  return typeof value === 'string' && (PERFORMANCE_SCOPES as readonly string[]).includes(value)
    ? (value as PerformanceScope)
    : undefined;
}
