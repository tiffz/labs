import '@testing-library/jest-dom';

// Mock DOMMatrix for test environment
global.DOMMatrix = class DOMMatrix {
  public transformString?: string;
  
  constructor(transformString?: string) {
    this.transformString = transformString;
  }

  // Mock the methods used in Cat.tsx
  translate() {
    return new DOMMatrix();
  }

  scale() {
    return new DOMMatrix();
  }

  // Mock properties
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;
} as typeof DOMMatrix; 