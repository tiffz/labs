import AddIcon from '@mui/icons-material/Add';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactElement } from 'react';

import type { ComicProject, PageNode, PageRevision } from '../types';
import {
  addPageRevisionFromFile,
  deletePageNode,
  loadRevisionBlobUrl,
  setActivePageRevision,
} from '../db/lyreflyProjectMutations';

export const PAGE_IMAGE_ACCEPT = 'image/*,.png,.jpg,.jpeg,.webp,.gif,.avif,.bmp,.tiff,.tif';

function useRevisionThumbUrl(revisionId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!revisionId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void loadRevisionBlobUrl(revisionId).then((loaded) => {
      if (cancelled) return;
      objectUrl = loaded;
      setUrl(loaded);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [revisionId]);
  return url;
}

type ArtPageGridTileProps = {
  project: ComicProject;
  node: PageNode;
  revisions: PageRevision[];
  viewingRevisionId?: string | null;
  strictVersionView?: boolean;
};

function ArtPageGridTile({
  project,
  node,
  revisions,
  viewingRevisionId,
  strictVersionView = false,
}: ArtPageGridTileProps): ReactElement {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const nodeRevisions = revisions
    .filter((r) => r.pageNodeId === node.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const activeRevision = strictVersionView
    ? viewingRevisionId
      ? nodeRevisions.find((r) => r.id === viewingRevisionId)
      : undefined
    : nodeRevisions.find((r) => r.id === node.activeRevisionId) ?? nodeRevisions[nodeRevisions.length - 1];
  const thumbUrl = useRevisionThumbUrl(activeRevision?.id ?? null);
  const outsideVersion = strictVersionView && !viewingRevisionId;

  const onUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setBusy(true);
      try {
        const label = `v${nodeRevisions.length + 1}`;
        await addPageRevisionFromFile(node, file, label);
      } finally {
        setBusy(false);
        event.target.value = '';
      }
    },
    [node, nodeRevisions.length],
  );

  const onDeletePage = async (): Promise<void> => {
    setMenuAnchor(null);
    await deletePageNode(project, node);
  };

  const onPickVersion = async (revisionId: string): Promise<void> => {
    setMenuAnchor(null);
    if (revisionId === node.activeRevisionId) return;
    await setActivePageRevision(node, revisionId);
  };

  return (
    <article
      className={[
        'lyrefly-art-grid__tile',
        node.isSpread ? 'lyrefly-art-grid__tile--spread' : '',
        outsideVersion ? 'lyrefly-art-grid__tile--outside-version' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={`lyrefly-art-page-${node.id}`}
    >
      <Box className="lyrefly-art-grid__thumb-wrap">
        <button
          type="button"
          className="lyrefly-art-grid__thumb"
          disabled={busy || outsideVersion}
          onClick={() => fileInputRef.current?.click()}
          aria-label={
            outsideVersion
              ? `${node.displayName ?? 'Page'} is not in this version`
              : thumbUrl
                ? `Upload new version for ${node.displayName ?? 'page'}`
                : `Upload art for ${node.displayName ?? 'page'}`
          }
        >
          {thumbUrl ? (
            <Box component="img" src={thumbUrl} alt="" className="lyrefly-art-grid__thumb-image" />
          ) : (
            <Box className="lyrefly-art-grid__thumb-empty">
              <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 28, opacity: 0.55 }} />
              <Typography variant="caption" color="text.secondary">
                {outsideVersion ? 'Not in version' : 'Upload'}
              </Typography>
            </Box>
          )}
          <Box className="lyrefly-art-grid__thumb-overlay" aria-hidden>
            <AddPhotoAlternateOutlinedIcon fontSize="small" />
            <Typography variant="caption" component="span">
              {thumbUrl ? 'New version' : 'Upload'}
            </Typography>
          </Box>
        </button>
        <input ref={fileInputRef} type="file" accept={PAGE_IMAGE_ACCEPT} hidden onChange={(e) => void onUpload(e)} />
        <IconButton
          size="small"
          className="lyrefly-art-grid__delete"
          aria-label={`Remove ${node.displayName ?? 'page'}`}
          onClick={() => void onDeletePage()}
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            bgcolor: alpha(theme.palette.background.paper, 0.92),
            boxShadow: 1,
            '&:hover': { bgcolor: theme.palette.background.paper },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box className="lyrefly-art-grid__meta">
        <Typography variant="caption" component="p" className="lyrefly-art-grid__label" title={node.displayName}>
          {node.displayName ?? 'Page'}
          {node.isSpread ? ' · Spread' : ''}
        </Typography>
        {nodeRevisions.length > 1 ? (
          <>
            <IconButton
              size="small"
              aria-label="Choose version"
              aria-haspopup="menu"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              sx={{ ml: 'auto', flexShrink: 0 }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              {nodeRevisions.map((revision) => (
                <MenuItem
                  key={revision.id}
                  selected={revision.id === activeRevision?.id}
                  onClick={() => void onPickVersion(revision.id)}
                >
                  {revision.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        ) : (
          <Typography variant="caption" color="text.secondary" className="lyrefly-art-grid__versions">
            {nodeRevisions.length === 0 ? 'No art yet' : activeRevision?.label ?? 'v1'}
          </Typography>
        )}
      </Box>
    </article>
  );
}

export type ArtPageGridProps = {
  project: ComicProject;
  pageNodes: PageNode[];
  revisions: PageRevision[];
  busy?: boolean;
  onBulkUpload?: (files: File[]) => void | Promise<void>;
  onAddBlankPage?: () => void | Promise<void>;
  viewingRevisionByPageId?: Record<string, string>;
  strictVersionView?: boolean;
};

function ArtPageGridAddTile({
  testId,
  icon,
  label,
  hint,
  disabled,
  onActivate,
  onFiles,
}: {
  testId: string;
  icon: ReactElement;
  label: string;
  hint: string;
  disabled?: boolean;
  onActivate?: () => void;
  onFiles?: (files: File[]) => void | Promise<void>;
}): ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onInput = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files ? [...event.target.files] : [];
    event.target.value = '';
    if (files.length === 0) return;
    void onFiles?.(files);
  };

  return (
    <article className="lyrefly-art-grid__tile lyrefly-art-grid__tile--action" data-testid={testId}>
      <button
        type="button"
        className="lyrefly-art-grid__thumb lyrefly-art-grid__thumb--add"
        disabled={disabled}
        onClick={() => {
          if (onFiles) fileInputRef.current?.click();
          else onActivate?.();
        }}
      >
        {icon}
        <Typography component="span" variant="body2" className="lyrefly-art-grid__thumb-add-label">
          {label}
        </Typography>
        <Typography component="span" variant="caption" className="lyrefly-art-grid__thumb-hint">
          {hint}
        </Typography>
      </button>
      {onFiles ? (
        <input
          ref={fileInputRef}
          type="file"
          accept={PAGE_IMAGE_ACCEPT}
          multiple
          hidden
          onChange={onInput}
        />
      ) : null}
    </article>
  );
}

export function ArtPageGrid({
  project,
  pageNodes,
  revisions,
  busy = false,
  onBulkUpload,
  onAddBlankPage,
  viewingRevisionByPageId,
  strictVersionView = false,
}: ArtPageGridProps): ReactElement {
  return (
    <div className="lyrefly-art-grid" data-testid="lyrefly-art-page-grid">
      {pageNodes.map((node) => (
        <ArtPageGridTile
          key={node.id}
          project={project}
          node={node}
          revisions={revisions}
          viewingRevisionId={viewingRevisionByPageId?.[node.id] ?? null}
          strictVersionView={strictVersionView}
        />
      ))}
      {onBulkUpload ? (
        <ArtPageGridAddTile
          testId="lyrefly-art-page-upload"
          icon={<UploadFileOutlinedIcon sx={{ fontSize: 28, opacity: 0.7 }} aria-hidden />}
          label="Upload pages"
          hint="Add to this comic"
          disabled={busy}
          onFiles={onBulkUpload}
        />
      ) : null}
      {onAddBlankPage ? (
        <ArtPageGridAddTile
          testId="lyrefly-art-page-add-blank"
          icon={<AddIcon sx={{ fontSize: 28, opacity: 0.7 }} aria-hidden />}
          label="Add blank page"
          hint="Empty slot"
          disabled={busy}
          onActivate={onAddBlankPage}
        />
      ) : null}
    </div>
  );
}
