import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

type GestureStatusBannerProps = {
  variant: 'success' | 'error';
  children: string;
  onDismiss: () => void;
};

export default function GestureStatusBanner({
  variant,
  children,
  onDismiss,
}: GestureStatusBannerProps): React.ReactElement {
  return (
    <div
      className={`gesture-banner gesture-banner--${variant} gesture-banner--dismissible`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <Typography component="p" className="gesture-banner-text">
        {children}
      </Typography>
      <IconButton
        className="gesture-banner-dismiss"
        size="small"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </div>
  );
}
