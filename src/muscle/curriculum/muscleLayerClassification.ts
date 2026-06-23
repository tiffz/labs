/**
 * Anatomical layer depth for peel slider — aligned with standard musculoskeletal pedagogy:
 * 0 superficial (under skin), 1 intermediate, 2 deep, 3 skeleton (bones/joints).
 */
export type MuscleLayerDepth = 0 | 1 | 2 | 3;

/** Deep muscles — rotator cuff floor, hip rotators, core floor, etc. */
const DEEP_PATTERNS: readonly RegExp[] = [
  /\bsubscapular/i,
  /\bteres minor\b/i,
  /\bquadratus lumborum\b/i,
  /\bmultifid/i,
  /\btransvers/i,
  /\biliacus\b/i,
  /\bpsoas\b/i,
  /\bpiriformis\b/i,
  /\bgluteus minimus\b/i,
  /\bobturator internus\b/i,
  /\bgemell/i,
  /\bquadratus femoris\b/i,
  /\bpopliteus\b/i,
  /\bplantaris\b/i,
  /\blevator scapul/i,
  /\brhomboid minor\b/i,
  /\bintercostal/i,
  /\bdiaphragm\b/i,
  /\bconstrictor\b/i,
  /\bdeep\b/i,
];

/** Superficial muscles — directly shape the surface silhouette. */
const SUPERFICIAL_PATTERNS: readonly RegExp[] = [
  /\bplatysma\b/i,
  /\bsternocleidomastoid\b/i,
  /\btrapezius\b/i,
  /\bdeltoid\b/i,
  /\bpectoralis major\b/i,
  /\blatissimus dorsi\b/i,
  /\brectus abdominis\b/i,
  /\bexternal (?:abdominal )?oblique\b/i,
  /\bgluteus maximus\b/i,
  /\btensor fasciae latae\b/i,
  /\bsartorius\b/i,
  /\bgastrocnemius\b/i,
  /\btibialis anterior\b/i,
  /\bbiceps brachii\b/i,
  /\btriceps brachii\b/i,
  /\bbrachioradialis\b/i,
  /\bmasseter\b/i,
  /\btemporalis muscle\b/i,
  /\bfrontalis\b/i,
  /\borbicularis\b/i,
  /\bzygomaticus\b/i,
  /\bmentalis\b/i,
  /\bnasalis\b/i,
  /\bplatysma\b/i,
  /\bextensor digitorum longus\b/i,
  /\bflexor carpi radialis\b/i,
  /\bextensor carpi radialis\b/i,
  /\bhamstring/i,
  /\bvastus lateralis\b/i,
  /\brectus femoris\b/i,
];

export function classifyMuscleLayerDepth(displayName: string): 0 | 1 | 2 {
  const label = displayName.trim();
  if (DEEP_PATTERNS.some((pattern) => pattern.test(label))) return 2;
  if (SUPERFICIAL_PATTERNS.some((pattern) => pattern.test(label))) return 0;
  return 1;
}

export function layerDepthForAtlasKind(
  kind: 'bone' | 'muscle' | 'joint' | string | undefined,
  displayName: string,
): MuscleLayerDepth {
  if (kind === 'bone' || kind === 'joint') return 3;
  return classifyMuscleLayerDepth(displayName);
}
