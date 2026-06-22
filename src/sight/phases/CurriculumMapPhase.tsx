import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { shellSx, TYPE } from '../components/landing/sightLandingStyles';
import { curriculumSections, levelStatus, type LevelStatus } from '../curriculum/curriculumSections';
import { MAX_LEVEL, profilePeakLevel } from '../levels';
import { PASSES_TO_ADVANCE } from '../session/practiceChallenge';
import type { SightProfile } from '../types';

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }} aria-hidden>
      {name}
    </span>
  );
}

interface CurriculumMapPhaseProps {
  profile: SightProfile;
  onBack: () => void;
  onPracticeLevel: (level: number) => void;
}

export default function CurriculumMapPhase({
  profile,
  onBack,
  onPracticeLevel,
}: CurriculumMapPhaseProps): React.ReactElement {
  const sections = curriculumSections();
  const peak = profilePeakLevel(profile);

  return (
    <Box className="sight-landing sight-landing--map" sx={{ ...shellSx, maxWidth: 480 }}>
      <Button
        variant="text"
        startIcon={<Icon name="arrow_back" size={20} />}
        onClick={onBack}
        sx={{
          textTransform: 'none',
          fontSize: '0.8125rem',
          color: 'text.secondary',
          px: 0,
          mb: { xs: 6, md: 8 },
          '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
        }}
      >
        Home
      </Button>

      <Typography component="h1" sx={{ ...TYPE.display, fontSize: '1.5rem', mb: 1.5 }}>
        Exercises
      </Typography>
      <Typography sx={{ ...TYPE.caption, color: 'text.secondary', mb: { xs: 8, md: 10 }, lineHeight: 1.6 }}>
        Level {profile.level} of {MAX_LEVEL}
        {peak > profile.level && (
          <>
            <br />
            Peak level {peak}
          </>
        )}
        {profile.level < MAX_LEVEL && (
          <>
            <br />
            {profile.passesAtLevel}/{PASSES_TO_ADVANCE} passes to advance
          </>
        )}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {sections.map((section, sectionIdx) => {
          const done = section.levels.filter(
            (l) => levelStatus(profile.level, l.level, peak) === 'complete',
          ).length;

          return (
            <Box
              key={section.phase}
              sx={{
                pt: sectionIdx > 0 ? { xs: 6, md: 7 } : 0,
                mt: sectionIdx > 0 ? { xs: 6, md: 7 } : 0,
                borderTop: sectionIdx > 0 ? '1px solid' : 'none',
                borderColor: 'rgba(255, 255, 255, 0.06)',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  mb: 3,
                  gap: 2,
                }}
              >
                <Typography sx={{ ...TYPE.caption, color: 'text.secondary', fontWeight: 500 }}>
                  {section.label}
                </Typography>
                <Typography
                  sx={{
                    ...TYPE.caption,
                    color: 'text.secondary',
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                  }}
                >
                  {done}/{section.levels.length}
                </Typography>
              </Box>

              <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {section.levels.map((row, rowIdx) => {
                  const status = levelStatus(profile.level, row.level, peak);
                  const unlocked = status !== 'locked';
                  const isCurrent = status === 'current';

                  return (
                    <Box component="li" key={row.level}>
                      <ButtonBase
                        onClick={() => unlocked && onPracticeLevel(row.level)}
                        disabled={!unlocked}
                        focusRipple={unlocked}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                          width: '100%',
                          textAlign: 'left',
                          py: 2,
                          borderBottom:
                            rowIdx < section.levels.length - 1
                              ? '1px solid rgba(255, 255, 255, 0.04)'
                              : 'none',
                          opacity: unlocked ? 1 : 0.38,
                          cursor: unlocked ? 'pointer' : 'default',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.9375rem',
                            fontWeight: isCurrent ? 500 : 400,
                            color: isCurrent ? 'primary.main' : 'text.primary',
                            lineHeight: 1.4,
                          }}
                        >
                          {row.label}
                        </Typography>
                        <RowStatus status={status} level={row.level} />
                      </ButtonBase>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function RowStatus({ status, level }: { status: LevelStatus; level: number }) {
  if (status === 'complete') {
    return <Icon name="check" size={18} />;
  }
  if (status === 'current') {
    return (
      <Typography sx={{ fontSize: '0.75rem', color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
        {level}
      </Typography>
    );
  }
  return <Icon name="lock" size={16} />;
}
