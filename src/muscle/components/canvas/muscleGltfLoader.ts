import { useGLTF } from '@react-three/drei';

/** Google CDN Draco decoder — fallback when legacy GLBs still use KHR_draco_mesh_compression. */
const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

export function useMuscleGltf(url: string) {
  return useGLTF(url, DRACO_DECODER_PATH);
}

export function preloadMuscleGltf(url: string) {
  useGLTF.preload(url, DRACO_DECODER_PATH);
}
