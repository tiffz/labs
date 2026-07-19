import {
  createLabsDebouncedChangeBus,
  type LabsLocalChangeListener,
} from '../../shared/drive/labsDebouncedChangeBus';

const bus = createLabsDebouncedChangeBus();

export function subscribeGestureLocalChanges(onChange: LabsLocalChangeListener): () => void {
  return bus.subscribe(onChange);
}

/** Coalesce rapid Dexie writes (e.g. per-file uploads) into one UI refresh. */
export function notifyGestureLocalChange(options?: { debounceMs?: number; immediate?: boolean }): void {
  bus.notify(options);
}

export function isGestureLocalChangePending(): boolean {
  return bus.isPending();
}
