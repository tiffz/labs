import type { ComponentType } from 'react';

/**
 * Create a synchronous stand-in for a `React.lazy`-loaded component. Use this
 * to neutralize the dynamic-import tax in unit tests where the lazy-load
 * behavior is not under test.
 *
 * ```ts
 * import { synchronousLazyStub } from '../../shared/test/mocks/lazy';
 *
 * vi.mock('./BeatChart', () => ({
 *   default: synchronousLazyStub<{}>('BeatChart'),
 * }));
 * ```
 *
 * The returned component renders a minimal DOM node so presence assertions
 * still work. Pass a custom renderer when the surrounding test needs to
 * observe specific markup from the lazy subtree.
 *
 * This helper is intentionally tiny; it exists to make the pattern
 * discoverable and uniform across apps. Long-form migration for
 * story/App.test.tsx, piano/ImportModal.test.tsx, drums/App.test.tsx, and
 * zines/App.test.tsx is tracked in Phase 1 of the codebase-health plan.
 */
export function synchronousLazyStub<Props extends object>(
  displayName: string,
  render?: (props: Props) => string,
): ComponentType<Props> {
  const Stub: ComponentType<Props> = (props) => {
    const text = render ? render(props) : displayName;
    return {
      type: 'div',
      props: { 'data-lazy-stub': displayName, children: text },
      key: null,
    } as unknown as React.ReactElement;
  };
  Stub.displayName = `LazyStub(${displayName})`;
  return Stub;
}
