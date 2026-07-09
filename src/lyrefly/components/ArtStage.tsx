import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CheckIcon from '@mui/icons-material/Check';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';

import type { ComicProject, PageNode, PageRevision } from '../types';
import {
  addPageRevisionFromFile,
  createPageNode,
  loadRevisionBlobUrl,
  setActivePageRevision,
  setPageRevisionStage,
} from '../db/lyreflyProjectMutations';

export type ArtStageProps = {
  project: ComicProject;
  pageNodes: PageNode[];
  revisions: PageRevision[];
};

function RevisionThumb({ revisionId }: { revisionId: string }): ReactElement {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
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

  if (!url) {
    return (
      <Box sx={{ width: 72, height: 96, borderRadius: 1, bgcolor: alpha('#fff', 0.06) }} aria-hidden />
    );
  }
  return (
    <Box
      component="img"
      src={url}
      alt=""
      sx={{ width: 72, height: 96, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider' }}
    />
  );
}

function PageArtCard({
  node,
  revisions,
}: {
  node: PageNode;
  revisions: PageRevision[];
}): ReactElement {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const nodeRevisions = revisions.filter((r) => r.pageNodeId === node.id);

  const onUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setBusy(true);
      try {
        const label = `v${nodeRevisions.length + 1}`;
        await addPageRevisionFromFile(node, file, label, nodeRevisions.length === 0 ? 'pencil' : 'inks');
      } finally {
        setBusy(false);
        event.target.value = '';
      }
    },
    [node, nodeRevisions.length],
  );

  return (
    <Box
      className="lyrefly-art-page-card"
      sx={{
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: alpha(theme.palette.primary.main, 0.14),
        bgcolor: alpha(theme.palette.background.paper, 0.72),
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {node.displayName ?? 'Page'}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddPhotoAlternateOutlinedIcon />}
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload version
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e) => void onUpload(e)} />
      </Stack>

      {nodeRevisions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Upload roughs, pencils, or finals — keep every version until you mark one final.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {nodeRevisions.map((revision) => {
            const isActive = node.activeRevisionId === revision.id;
            const isFinal = revision.stage === 'final';
            return (
              <Stack
                key={revision.id}
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: isActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                }}
              >
                <RevisionThumb revisionId={revision.id} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {revision.label}
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">
                    <Chip size="small" label={revision.stage} variant="outlined" />
                    {isFinal ? <Chip size="small" color="primary" icon={<CheckIcon />} label="Final" /> : null}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  {!isActive ? (
                    <Button size="small" onClick={() => void setActivePageRevision(node, revision.id)}>
                      Set active
                    </Button>
                  ) : null}
                  {!isFinal ? (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => void setPageRevisionStage(revision, 'final')}
                    >
                      Mark final
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

export function ArtStage({ project, pageNodes, revisions }: ArtStageProps): ReactElement {
  const [adding, setAdding] = useState(false);

  const handleAddPage = async (): Promise<void> => {
    setAdding(true);
    try {
      await createPageNode(project);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Box className="lyrefly-art-stage" data-testid="lyrefly-art-stage" sx={{ p: { xs: 2, sm: 3 }, flex: 1, overflow: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '36rem' }}>
          Build pages one at a time. Upload new versions freely — mark a revision final when it is ready for publishing.
        </Typography>
        <Button variant="outlined" disabled={adding} onClick={() => void handleAddPage()}>
          Add page
        </Button>
      </Stack>

      {pageNodes.length === 0 ? (
        <Stack spacing={2} alignItems="flex-start">
          <Typography variant="body1" color="text.secondary">
            No pages yet. Add your first page to start uploading art.
          </Typography>
          <Button variant="contained" disabled={adding} onClick={() => void handleAddPage()}>
            Add first page
          </Button>
        </Stack>
      ) : (
        <Stack spacing={2}>
          {pageNodes.map((node) => (
            <PageArtCard key={node.id} node={node} revisions={revisions} />
          ))}
        </Stack>
      )}
    </Box>
  );
}
