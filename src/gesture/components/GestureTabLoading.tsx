import CircularProgress from '@mui/material/CircularProgress';

type GestureTabLoadingProps = {
  label?: string;
};

export default function GestureTabLoading({
  label = 'Loading collections…',
}: GestureTabLoadingProps): React.ReactElement {
  return (
    <div className="gesture-loading-state" aria-busy="true" aria-label={label}>
      <CircularProgress size={28} aria-hidden />
    </div>
  );
}
