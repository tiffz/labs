/**
 * Barrel for reusable test mocks. Migrate ad-hoc `global.fetch = vi.fn()` and
 * hand-rolled AudioContext fakes to these helpers over time; new tests should
 * import from here.
 */
export * from './fetch';
export * from './audio';
export * from './lazy';
