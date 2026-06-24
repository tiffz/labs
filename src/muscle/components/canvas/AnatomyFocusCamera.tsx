import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { getNodeById } from '../../curriculum';
import { useMuscleStore } from '../../store/useMuscleStore';
import {
  computeFramingPresetFromLayout,
  computeFramingPresetFromObject,
  findSceneObjectForNodeId,
} from './computeAnatomyFocusCamera';

/** Computes a camera preset when the user focuses a structure in warmup mode. */
export default function AnatomyFocusCamera() {
  const { scene, invalidate } = useThree();
  const mode = useMuscleStore((s) => s.mode);
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);
  const focusCameraNonce = useMuscleStore((s) => s.focusCameraNonce);
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);
  const setCameraFocusPreset = useMuscleStore((s) => s.setCameraFocusPreset);

  useEffect(() => {
    if (mode !== 'warmup' || !focusedNodeId) {
      setCameraFocusPreset(null);
      return;
    }

    const object = findSceneObjectForNodeId(scene, focusedNodeId);
    if (object) {
      setCameraFocusPreset(computeFramingPresetFromObject(object));
      invalidate();
      return;
    }

    const node = getNodeById(focusedNodeId);
    if (node?.layout) {
      setCameraFocusPreset(computeFramingPresetFromLayout(node.layout.position, node.layout.scale));
      invalidate();
      return;
    }

    setCameraFocusPreset(null);
  }, [
    focusCameraNonce,
    focusedNodeId,
    invalidate,
    layerPeelDepth,
    mode,
    scene,
    setCameraFocusPreset,
  ]);

  return null;
}
