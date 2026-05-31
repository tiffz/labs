export function isEditableKeyboardTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    Boolean(target.isContentEditable)
  );
}

export function shouldHandleGlobalPlaybackSpacebar(event: Pick<KeyboardEvent, 'code' | 'repeat' | 'target'>): boolean {
  if (event.repeat || event.code !== 'Space') return false;
  const target = event.target as HTMLElement | null;
  if (!target) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') {
    return false;
  }
  return !target.isContentEditable;
}
