import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import SightHero from '../components/landing/SightHero';
import SkillsMasteryLink from '../components/SkillsMasteryLink';
import { shellSx, TYPE } from '../components/landing/sightLandingStyles';
import { curriculumSections } from '../curriculum/curriculumSections';
import { getLevelConfig, MAX_LEVEL } from '../levels';
import { PASSES_TO_ADVANCE } from '../session/practiceChallenge';
import type { SightProfile } from '../types';

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }} aria-hidden>
      {name}
    </span>
  );
}

interface HomePhaseProps {
  profile: SightProfile;
  onStartPractice: () => void;
  onOpenMap: () => void;
}

export default function HomePhase({
  profile,
  onStartPractice,
  onOpenMap,
}: HomePhaseProps): React.ReactElement {
  const levelCfg = getLevelConfig(profile.level);
  const currentSection =
    curriculumSections().find((s) => s.levels.some((l) => l.level === profile.level)) ??
    curriculumSections()[0]!;

  const progressLine =
    profile.level < MAX_LEVEL
      ? `${profile.passesAtLevel}/${PASSES_TO_ADVANCE} passes to level ${profile.level + 1}`
      : 'All levels unlocked';

  return (
    <Box
      className="sight-landing sight-landing--home"
      sx={{
        ...shellSx,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: 'min(100dvh, 900px)',
        justifyContent: 'center',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <SightHero onPractice={onStartPractice} hint={profile.activeFocus?.label} />

        <Box sx={{ mt: { xs: 10, md: 12 }, mb: { xs: 10, md: 12 } }}>
          <Typography sx={{ ...TYPE.title, fontSize: '1.0625rem', color: 'text.primary', mb: 1 }}>
            Level {profile.level} · {levelCfg.label}
          </Typography>
          <Typography sx={{ ...TYPE.caption, color: 'text.secondary', lineHeight: 1.6 }}>
            {currentSection.label}
            <br />
            {progressLine}
          </Typography>
        </Box>

        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'rgba(255, 255, 255, 0.06)',
            pt: { xs: 5, md: 6 },
            pb: { xs: 4, md: 5 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Button
              variant="text"
              onClick={onOpenMap}
              endIcon={<Icon name="chevron_right" />}
              sx={{
                textTransform: 'none',
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: 'text.secondary',
                letterSpacing: '0.03em',
                px: 1,
                py: 0.5,
                '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
              }}
            >
              Exercises
            </Button>
            <SkillsMasteryLink matrix={profile.skillMatrix} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
