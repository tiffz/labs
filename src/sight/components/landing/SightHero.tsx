import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { TYPE } from './sightLandingStyles';

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }} aria-hidden>
      {name}
    </span>
  );
}

interface SightHeroProps {
  onPractice: () => void;
  hint?: string;
}

export default function SightHero({ onPractice, hint }: SightHeroProps): React.ReactElement {
  return (
    <Box className="sight-landing-hero" sx={{ textAlign: 'center' }}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          mb: 3,
          borderRadius: '50%',
          bgcolor: 'rgba(167, 139, 250, 0.1)',
          color: 'primary.main',
        }}
      >
        <Icon name="palette" size={28} />
      </Box>
      <Typography component="h1" sx={{ ...TYPE.display, color: 'text.primary', mb: hint ? 2 : 3.5 }}>
        Color Sight Trainer
      </Typography>
      {hint && (
        <Typography sx={{ ...TYPE.caption, color: 'text.secondary', mb: 3.5, maxWidth: 300, mx: 'auto' }}>
          {hint}
        </Typography>
      )}
      <Button
        variant="contained"
        size="large"
        onClick={onPractice}
        disableElevation
        sx={{
          height: 52,
          px: 5,
          borderRadius: '999px',
          fontSize: '0.9375rem',
          fontWeight: 500,
          textTransform: 'none',
        }}
      >
        Practice
      </Button>
    </Box>
  );
}
