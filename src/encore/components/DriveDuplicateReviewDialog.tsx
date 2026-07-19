import CloseIcon from '@mui/icons-material/Close';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import AppTooltip from '../../shared/components/AppTooltip';
import type { DriveDuplicateGroup } from '../drive/driveDuplicateDetection';

export type DriveDuplicateReviewDialogProps = {
  open: boolean;
  groups: readonly DriveDuplicateGroup[];
  onClose: () => void;
};

function refsTooltipTitle(refs: readonly { label: string }[]): string {
  if (refs.length === 0) return 'No Encore references';
  return refs.map((r) => r.label).join('\n');
}

export function DriveDuplicateReviewDialog({
  open,
  groups,
  onClose,
}: DriveDuplicateReviewDialogProps): ReactElement {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        Duplicate uploads
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {groups.length === 0 ? (
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            No duplicate file groups were found.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {groups.map((group) => (
              <Stack key={group.key} spacing={0.75}>
                <Typography variant="subtitle2">
                  {group.members.length} copies · keeping {group.canonicalFileId.slice(0, 8)}…
                </Typography>
                {group.members.map((member) => (
                  <AppTooltip
                    key={member.mediaFileId}
                    title={refsTooltipTitle(member.allRefs)}
                    placement="right"
                  >
                    <Typography
                      variant="body2"
                      component="div"
                      sx={{
                        pl: 1,
                        borderLeft: 2,
                        borderColor: 'divider',
                        cursor: member.allRefs.length > 0 ? 'help' : 'default',
                      }}
                    >
                      <strong>{member.name}</strong>
                      {member.referenceCount > 0
                        ? ` · ${member.referenceCount} reference${member.referenceCount === 1 ? '' : 's'}`
                        : ' · not linked in Encore'}
                    </Typography>
                  </AppTooltip>
                ))}
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
