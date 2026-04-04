/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'essentia.js/dist/essentia.js-core.es.js' {
  const Essentia: new (wasmModule: unknown) => any;
  export default Essentia;
}

declare module 'essentia.js/dist/essentia-wasm.es.js' {
  export const EssentiaWASM: any;
  const wasmDefault: any;
  export default wasmDefault;
}

declare module 'file-saver' {
  export function saveAs(data: Blob | File | string, filename?: string, options?: unknown): void;
}

declare module 'jest-axe' {
  export interface AxeResults {
    violations: Array<unknown>;
  }

  export function axe(node: Element | DocumentFragment, options?: unknown): Promise<AxeResults>;
  export function toHaveNoViolations(results: AxeResults): { pass: boolean; message: () => string };
}

declare module '@fontsource/material-icons';
declare module '@fontsource/noto-music';
declare module 'material-symbols/outlined.css';
