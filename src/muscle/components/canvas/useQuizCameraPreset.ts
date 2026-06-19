import { useMemo } from 'react';
import { getNodeById } from '../../curriculum';
import { getModuleById } from '../../curriculum/modules';
import type { CameraPreset } from '../../types/node';
import { useMuscleStore } from '../../store/useMuscleStore';

export function useQuizCameraPreset(): CameraPreset | null {
  const moduleId = useMuscleStore((s) => s.activeModuleId);
  const mode = useMuscleStore((s) => s.mode);
  const targetId = useMuscleStore((s) => s.quiz.targetNodeId);
  const selectedId = useMuscleStore((s) => s.selectedNodeId);

  return useMemo(() => {
    if (mode !== 'active' || !targetId) return null;
    const mod = getModuleById(moduleId);
    const node = getNodeById(targetId) ?? (selectedId ? getNodeById(selectedId) : undefined);
    const key = node?.cameraPresetKey ?? 'chest';
    return mod.cameraPresets[key] ?? mod.cameraPresets.chest ?? null;
  }, [moduleId, mode, targetId, selectedId]);
}
