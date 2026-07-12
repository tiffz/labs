import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import LinkIcon from '@mui/icons-material/Link';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { type ReactElement } from 'react';

import type { VisualDevAsset } from '../types';
import { conceptShelfKindCaption, conceptShelfOpenUrl } from '../utils/conceptShelfUtils';

export type LyreflyProfileReferenceListProps = {
  assets: VisualDevAsset[];
};

function ProfileReferenceItem({ asset }: { asset: VisualDevAsset }): ReactElement {
  const theme = useTheme();
  const openUrl = conceptShelfOpenUrl(asset);
  const icon =
    asset.kind === 'note' ? (
      <NotesOutlinedIcon fontSize="small" />
    ) : asset.fileName ? (
      <DescriptionOutlinedIcon fontSize="small" />
    ) : (
      <LinkIcon fontSize="small" />
    );

  const titleBody = openUrl ? (
    <a
      className="lyrefly-profile-ref__title-link"
      href={openUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={openUrl}
    >
      {asset.title}
      <OpenInNewIcon className="lyrefly-profile-ref__external" fontSize="inherit" aria-hidden />
    </a>
  ) : (
    asset.title
  );

  return (
    <Box className="lyrefly-profile-ref" component="li">
      <span
        className="lyrefly-profile-ref__icon"
        style={{
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
          color: theme.palette.primary.main,
        }}
      >
        {icon}
      </span>
      <div className="lyrefly-profile-ref__copy">
        <Typography component="h4" className="lyrefly-profile-ref__title">
          {titleBody}
        </Typography>
        <Typography variant="caption" color="text.secondary" className="lyrefly-profile-ref__kind">
          {conceptShelfKindCaption(asset.kind)}
        </Typography>
        {asset.markdown?.trim() ? (
          <Typography component="p" variant="body2" className="lyrefly-profile-ref__notes">
            {asset.markdown.trim()}
          </Typography>
        ) : null}
      </div>
    </Box>
  );
}

export function LyreflyProfileReferenceList({ assets }: LyreflyProfileReferenceListProps): ReactElement {
  if (assets.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" className="lyrefly-profile-ref__empty">
        No reference links or idea cards yet.
      </Typography>
    );
  }

  return (
    <ul className="lyrefly-profile-ref__list" aria-label="References">
      {assets.map((asset) => (
        <ProfileReferenceItem key={asset.id} asset={asset} />
      ))}
    </ul>
  );
}
