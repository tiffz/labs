import { useCallback, useState, type CSSProperties } from 'react';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import LabsDebugDock from '../../shared/components/LabsDebugDock';
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

const DEBUG_BTN: CSSProperties = {
  background: 'transparent',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: 3,
  padding: '2px 6px',
  fontSize: 10,
  cursor: 'pointer',
};

const DEBUG_BTN_DANGER: CSSProperties = {
  ...DEBUG_BTN,
  color: '#fca5a5',
  borderColor: '#7f1d1d',
};

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
    if (
      !window.confirm(
        'Clear Color Sight Trainer localStorage? This removes your level progress and cannot be undone. Other Labs apps on this site keep their data.',
      )
    ) {
      return;
    }
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
    if (
      !window.confirm(
        'Clear localStorage for every Labs app on this site? This removes unsynced progress everywhere and cannot be undone. Cloud backups may still exist, but local-only data will be lost.',
      )
    ) {
      return;
    }
    localStorage.clear();
    onProfileChange(resetProfile());
    setLevelPick(1);
    onGoHome();
  }, [onGoHome, onProfileChange]);

  const [localStorageToolsOpen, setLocalStorageToolsOpen] = useState(false);

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
          <button
            type="button"
            style={DEBUG_BTN}
            onClick={(e) => {
              e.stopPropagation();
              handleSetLevel();
            }}
          >
            Set level
          </button>
          <button
            type="button"
            style={DEBUG_BTN}
            onClick={(e) => {
              e.stopPropagation();
              handleSetLevelAndPractice();
            }}
          >
            Set + practice
          </button>
          <button
            type="button"
            style={DEBUG_BTN}
            onClick={(e) => {
              e.stopPropagation();
              handleBumpPass();
            }}
          >
            +1 pass
          </button>
          <button
            type="button"
            style={DEBUG_BTN}
            onClick={(e) => {
              e.stopPropagation();
              handleCompleteLevel();
            }}
          >
            Complete level
          </button>
          <button
            type="button"
            style={DEBUG_BTN}
            onClick={(e) => {
              e.stopPropagation();
              onOpenSandbox(profile.level);
            }}
          >
            Sandbox
          </button>
          {phase === 'practice' && (
            <span style={{ color: '#94a3b8', fontSize: 10 }}>
              Simulate (S): {simulateLabel}
            </span>
          )}
          <button
            type="button"
            style={DEBUG_BTN}
            onClick={(e) => {
              e.stopPropagation();
              refreshFromStorage();
            }}
          >
            Refresh
          </button>
        </>
      }
    >
      <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', m: 0, p: 1, color: '#e2e8f0' }}>
        {JSON.stringify(
          {
            phase,
            level: profile.level,
            label: levelCfg.label,
            module: levelCfg.module,
            passesAtLevel: `${profile.passesAtLevel}/${PASSES_TO_ADVANCE}`,
            schemaVersion: profile.schemaVersion,
            challengesCompleted: profile.challengesCompleted,
            activeFocus: profile.activeFocus?.label ?? null,
            maxLevel: MAX_LEVEL,
          },
          null,
          2,
        )}
      </Typography>
      <div
        style={{
          borderTop: '1px solid #334155',
          padding: '8px 12px',
          background: '#0f172a',
        }}
      >
        <button
          type="button"
          style={{
            ...DEBUG_BTN,
            color: '#94a3b8',
            border: 'none',
            padding: '2px 0',
          }}
          onClick={() => setLocalStorageToolsOpen((open) => !open)}
          aria-expanded={localStorageToolsOpen}
        >
          {localStorageToolsOpen ? '▼' : '▶'} Local storage
        </button>
        {localStorageToolsOpen ? (
          <div style={{ marginTop: 8 }}>
            <Typography
              component="p"
              sx={{
                m: 0,
                mb: 1,
                fontSize: 10,
                lineHeight: 1.45,
                color: '#fca5a5',
              }}
            >
              These actions delete browser-stored data. Lost progress may not be recoverable.
            </Typography>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                style={DEBUG_BTN_DANGER}
                onClick={() => void handleReset()}
              >
                Clear Sight localStorage
              </button>
              <button
                type="button"
                style={{
                  ...DEBUG_BTN,
                  color: '#94a3b8',
                  fontSize: 9,
                  borderColor: '#475569',
                }}
                onClick={() => void handleClearAllLocal()}
              >
                Clear all Labs localStorage
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </LabsDebugDock>
  );
}
