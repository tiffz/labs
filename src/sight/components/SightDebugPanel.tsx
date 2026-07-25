import { useCallback, useState } from 'react';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import LabsDebugDock from '../../shared/components/LabsDebugDock';
import LabsDebugButton from '../../shared/components/LabsDebugButton';
import LabsDebugStateDump from '../../shared/components/LabsDebugStateDump';
import LabsDebugDangerZone from '../../shared/components/LabsDebugDangerZone';
import { getLevelConfig, LEVEL_TABLE, MAX_LEVEL } from '../levels';
import { PASSES_TO_ADVANCE } from '../session/practiceChallenge';
import {
  bumpPassesAtLevel,
  completeCurrentLevel,
  readProfile,
  resetProfile,
  setProfileLevel,
} from '../storage';
import type { SightProfile } from '../types';

const ACCENT = '#7c3aed';

type AppPhase = 'home' | 'map' | 'practice' | 'sandbox';

interface SightDebugPanelProps {
  profile: SightProfile;
  phase: AppPhase;
  simulatePass: boolean | null;
  onProfileChange: (profile: SightProfile) => void;
  onOpenSandbox: (level?: number) => void;
  onStartPractice: (level?: number) => void;
  onGoHome: () => void;
}

export default function SightDebugPanel({
  profile,
  phase,
  simulatePass,
  onProfileChange,
  onOpenSandbox,
  onStartPractice,
  onGoHome,
}: SightDebugPanelProps): React.ReactElement {
  const [levelPick, setLevelPick] = useState(profile.level);

  const refreshFromStorage = useCallback(() => {
    onProfileChange(readProfile());
  }, [onProfileChange]);

  const handleReset = useCallback(() => {
    onProfileChange(resetProfile());
    setLevelPick(1);
    onGoHome();
  }, [onGoHome, onProfileChange]);

  const handleSetLevel = useCallback(() => {
    const next = setProfileLevel(levelPick);
    onProfileChange(next);
  }, [levelPick, onProfileChange]);

  const handleSetLevelAndPractice = useCallback(() => {
    const next = setProfileLevel(levelPick);
    onProfileChange(next);
    onStartPractice(levelPick);
  }, [levelPick, onProfileChange, onStartPractice]);

  const handleBumpPass = useCallback(() => {
    onProfileChange(bumpPassesAtLevel(1));
  }, [onProfileChange]);

  const handleCompleteLevel = useCallback(() => {
    onProfileChange(completeCurrentLevel());
  }, [onProfileChange]);

  const handleClearAllLocal = useCallback(() => {
    localStorage.clear();
    onProfileChange(resetProfile());
    setLevelPick(1);
    onGoHome();
  }, [onGoHome, onProfileChange]);

  const levelCfg = getLevelConfig(profile.level);
  const simulateLabel =
    simulatePass === true ? 'pass' : simulatePass === false ? 'fail' : 'off';

  return (
    <LabsDebugDock
      appId="sight"
      title="Sight debug"
      accentColor={ACCENT}
      defaultCollapsed
      layout="log-first"
      toolbar={
        <>
          <Select
            size="small"
            value={levelPick}
            onChange={(e) => setLevelPick(Number(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            aria-label="Set level"
            sx={{
              minWidth: 160,
              height: 24,
              fontSize: 10,
              color: '#e2e8f0',
              '.MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
              '.MuiSvgIcon-root': { color: '#94a3b8' },
            }}
          >
            {LEVEL_TABLE.map((row) => (
              <MenuItem key={row.level} value={row.level} sx={{ fontSize: 12 }}>
                L{row.level} · {row.label}
              </MenuItem>
            ))}
          </Select>
          <LabsDebugButton onClick={handleSetLevel}>Set level</LabsDebugButton>
          <LabsDebugButton onClick={handleSetLevelAndPractice}>Set + practice</LabsDebugButton>
          <LabsDebugButton onClick={handleBumpPass}>+1 pass</LabsDebugButton>
          <LabsDebugButton onClick={handleCompleteLevel}>Complete level</LabsDebugButton>
          <LabsDebugButton onClick={() => onOpenSandbox(profile.level)}>Sandbox</LabsDebugButton>
          {phase === 'practice' && (
            <span style={{ color: '#94a3b8', fontSize: 10 }}>Simulate (S): {simulateLabel}</span>
          )}
          <LabsDebugButton onClick={refreshFromStorage}>Refresh</LabsDebugButton>
        </>
      }
    >
      <LabsDebugStateDump
        data={{
          phase,
          level: profile.level,
          label: levelCfg.label,
          module: levelCfg.module,
          passesAtLevel: `${profile.passesAtLevel}/${PASSES_TO_ADVANCE}`,
          schemaVersion: profile.schemaVersion,
          challengesCompleted: profile.challengesCompleted,
          activeFocus: profile.activeFocus?.label ?? null,
          maxLevel: MAX_LEVEL,
        }}
      />
      <LabsDebugDangerZone
        actions={[
          {
            label: 'Clear Sight localStorage',
            confirmMessage:
              'Clear Color Sight Trainer localStorage? This removes your level progress and cannot be undone. Other Labs apps on this site keep their data.',
            onConfirm: handleReset,
          },
          {
            label: 'Clear all Labs localStorage',
            confirmMessage:
              'Clear localStorage for every Labs app on this site? This removes unsynced progress everywhere and cannot be undone. Cloud backups may still exist, but local-only data will be lost.',
            onConfirm: handleClearAllLocal,
            // Quieter than the Sight-only clear: it is the nuke, so de-emphasize it.
            emphasis: 'muted',
          },
        ]}
      />
    </LabsDebugDock>
  );
}
