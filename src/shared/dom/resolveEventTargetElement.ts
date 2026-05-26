/**
 * Resolve a pointer/focus event target to an Element for DOM traversal (`closest`, `matches`).
 * Clicks on text inside buttons often set `event.target` to a Text node, which has no `closest`.
 */
export function resolveEventTargetElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target;
  if (target instanceof Text) return target.parentElement;
  return null;
}

/** True when the event target lies inside an element matching `selector` (or inside `root`). */
export function isPointerInsideSelector(
  event: Pick<PointerEvent, 'target'>,
  selector: string,
  root: ParentNode = document,
): boolean {
  const el = resolveEventTargetElement(event.target);
  if (!el) return false;
  if (!root.contains(el)) return false;
  return el.closest(selector) !== null;
}
