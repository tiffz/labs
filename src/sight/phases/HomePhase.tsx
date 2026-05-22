import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import { PHASE_LABELS } from '../curriculum/phases';
import { getLevelConfig, LEVEL_TABLE, MAX_LEVEL } from '../levels';
import { PASSES_TO_ADVANCE } from '../session/practiceChallenge';
import type { SightProfile } from '../types';

interface HomePhaseProps {
  profile: SightProfile;
  onStartPractice: (practiceLevel: number) => void;
}

export default function HomePhase({ profile, onStartPractice }: HomePhaseProps): React.ReactElement {
  const [selectedLevel, setSelectedLevel] = useState(profile.level);

  useEffect(() => {
    setSelectedLevel((prev) => Math.min(prev, profile.level));
  }, [profile.level]);

  const levelCfg = getLevelConfig(profile.level);
  const canPickLevel = profile.level > 1;
  const practiceLevel = canPickLevel ? selectedLevel : profile.level;
  const practiceCfg = getLevelConfig(practiceLevel);
  const isReview = practiceLevel < profile.level;

  return (
    <div className="sight-home">
      <Typography variant="h2" component="h2" sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
        Color Sight Trainer
      </Typography>
      <div className="sight-stats">
        <div>
          Level {profile.level}
          {levelCfg.phase ? ` · ${PHASE_LABELS[levelCfg.phase]}` : ''} · {levelCfg.label}
        </div>
        <div>Challenges practiced: {profile.challengesCompleted}</div>
        {profile.level < MAX_LEVEL && (
          <div>
            Progress: {profile.passesAtLevel}/{PASSES_TO_ADVANCE} passes toward level{' '}
            {profile.level + 1}
          </div>
        )}
      </div>
      {canPickLevel && (
        <FormControl size="small" className="sight-home-level-picker" sx={{ minWidth: 280 }}>
          <InputLabel id="sight-practice-level-label">Practice level</InputLabel>
          <Select
            labelId="sight-practice-level-label"
            label="Practice level"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(Number(e.target.value))}
          >
            {LEVEL_TABLE.filter((row) => row.level <= profile.level).map((row) => (
              <MenuItem key={row.level} value={row.level}>
                Level {row.level} · {row.label}
                {row.level < profile.level ? ' (review)' : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      {isReview && (
        <Typography variant="body2" color="text.secondary" className="sight-home-review-hint">
          Review mode. Passes here do not change your level progress.
        </Typography>
      )}
      <Button variant="contained" size="large" onClick={() => onStartPractice(practiceLevel)}>
        {isReview ? `Practice level ${practiceLevel}` : 'Practice'}
      </Button>
      {canPickLevel && !isReview && practiceLevel === profile.level && (
        <Typography variant="caption" color="text.secondary">
          Practicing {practiceCfg.label}
        </Typography>
      )}
    </div>
  );
}
