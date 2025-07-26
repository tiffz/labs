import '@testing-library/jest-dom';

// Make Vitest globals available
declare global {
  var describe: typeof import('vitest').describe;
  var it: typeof import('vitest').it;
  var test: typeof import('vitest').test;
  var expect: typeof import('vitest').expect;
  var beforeEach: typeof import('vitest').beforeEach;
  var afterEach: typeof import('vitest').afterEach;
} 