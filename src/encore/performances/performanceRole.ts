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
 * Only lead vocal. `'Instrumental'` covers playing rather than singing lead — whether solo or for
 * someone else, a distinction the owner said does not matter for her purposes — so it sits on the
 * supporting side, which is what keeps the singing archive and the public page clean.
 */
export const MAIN_PERFORMER_ROLES: readonly EncorePerformanceRole[] = ['Lead vocal'];

/** Roles where she is supporting someone else's performance. */
export const SUPPORTING_ROLES: readonly EncorePerformanceRole[] = ENCORE_PERFORMANCE_ROLES.filter(
  (role) => !MAIN_PERFORMER_ROLES.includes(role),
);

/**
 * Roles that existed before and now map onto a current one.
 *
 * `'Accompanist'` and `'Instrumental'` were separate; the owner merged them. Without this map a
 * stored `'Accompanist'` would fail the enum check, fall through to the absent-means-lead default,
 * and silently reclassify her accompaniment work as lead vocal — which would put it back in the
 * singing archive AND publish it to the guest page. A rename that quietly re-labels existing rows
 * is worse than the rename being rejected.
 */
const LEGACY_ROLE_ALIASES: Readonly<Record<string, EncorePerformanceRole>> = {
  Accompanist: 'Instrumental',
};

/** The role of a performance: legacy aliases mapped, then the absent-means-lead default. */
export function performanceRole(performance: Pick<EncorePerformance, 'role'>): EncorePerformanceRole {
  const raw = performance.role;
  if (raw == null) return 'Lead vocal';
  if ((ENCORE_PERFORMANCE_ROLES as readonly string[]).includes(raw)) return raw;
  return LEGACY_ROLE_ALIASES[raw as string] ?? 'Lead vocal';
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
  if (typeof value !== 'string') return undefined;
  if ((ENCORE_PERFORMANCE_ROLES as readonly string[]).includes(value)) {
    return value as EncorePerformanceRole;
  }
  return LEGACY_ROLE_ALIASES[value];
}

/** Narrow an unknown string to a scope, for the persisted list preference. */
export function parsePerformanceScope(value: unknown): PerformanceScope | undefined {
  return typeof value === 'string' && (PERFORMANCE_SCOPES as readonly string[]).includes(value)
    ? (value as PerformanceScope)
    : undefined;
}
