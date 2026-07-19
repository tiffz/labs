import { createLabsDebouncedChangeBus } from '../../shared/drive/labsDebouncedChangeBus';
import type { LabsLocalChangeListener } from '../../shared/drive/labsDebouncedChangeBus';

const bus = createLabsDebouncedChangeBus();

export function subscribeLyreflyLocalChanges(onChange: LabsLocalChangeListener): () => void {
  return bus.subscribe(onChange);
}

/** Coalesce rapid Dexie writes into one debounced Drive auto-push. */
export function notifyLyreflyLocalChange(options?: { debounceMs?: number; immediate?: boolean }): void {
  bus.notify(options);
}
