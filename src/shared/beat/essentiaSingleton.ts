/**
 * Single Essentia.js WASM instance for Find-the-Beat analysis, Stanza segment tempo,
 * Piano chroma, and other shared audio ML entry points.
 */

type EssentiaConstructor = typeof import('essentia.js/dist/essentia.js-core.es.js').default;
export type EssentiaInstance = InstanceType<EssentiaConstructor>;

let essentiaInstance: EssentiaInstance | null = null;
let essentiaInitPromise: Promise<EssentiaInstance> | null = null;
let essentiaConstructor: EssentiaConstructor | null = null;
let essentiaWasmModule: unknown | null = null;

async function loadEssentiaModules(): Promise<{
  Essentia: EssentiaConstructor;
  EssentiaWASM: unknown;
}> {
  if (essentiaConstructor && essentiaWasmModule) {
    return { Essentia: essentiaConstructor, EssentiaWASM: essentiaWasmModule };
  }

  const [{ default: Essentia }, wasmModule] = await Promise.all([
    import('essentia.js/dist/essentia.js-core.es.js'),
    import('essentia.js/dist/essentia-wasm.es.js'),
  ]);

  const EssentiaWASM =
    (wasmModule as { EssentiaWASM?: unknown; default?: unknown }).EssentiaWASM ??
    (wasmModule as { default?: unknown }).default ??
    wasmModule;

  essentiaConstructor = Essentia;
  essentiaWasmModule = EssentiaWASM;

  return { Essentia, EssentiaWASM };
}

/** Initialize Essentia.js WASM module (cached singleton). */
export async function getEssentia(): Promise<EssentiaInstance> {
  if (essentiaInstance) {
    return essentiaInstance;
  }

  if (essentiaInitPromise) {
    return essentiaInitPromise;
  }

  essentiaInitPromise = (async () => {
    try {
      const { Essentia, EssentiaWASM } = await loadEssentiaModules();
      const essentia = new Essentia(EssentiaWASM);
      essentiaInstance = essentia;
      return essentia;
    } catch (error) {
      console.error('Failed to initialize Essentia.js:', error);
      throw error;
    }
  })();

  return essentiaInitPromise;
}
