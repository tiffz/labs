type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeGestureLocalChanges(onChange: Listener): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function notifyGestureLocalChange(): void {
  for (const fn of listeners) fn();
}
