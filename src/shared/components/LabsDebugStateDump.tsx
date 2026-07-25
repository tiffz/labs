import Typography from '@mui/material/Typography';

/**
 * The pretty-printed JSON state block every `LabsDebugDock` body was hand-rolling
 * (`<Typography component="pre">{JSON.stringify(obj, null, 2)}</Typography>`). One home for
 * the styling so read-only debug readouts stay consistent across apps.
 */
export default function LabsDebugStateDump({
  data,
}: {
  data: Record<string, unknown>;
}): React.ReactElement {
  return (
    <Typography
      variant="caption"
      component="pre"
      sx={{ whiteSpace: 'pre-wrap', m: 0, p: 1, color: '#e2e8f0' }}
    >
      {JSON.stringify(data, null, 2)}
    </Typography>
  );
}
