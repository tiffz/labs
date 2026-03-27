export function getNotationScrollContainer(
  notationScrollContainer: HTMLElement | null
): HTMLElement | null {
  // Words keeps a single scroll owner for notation playback to avoid
  // per-section nested scrolling and mismatched auto-follow targets.
  return notationScrollContainer;
}
