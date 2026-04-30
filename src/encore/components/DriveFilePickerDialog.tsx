import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { driveListFiles, type DriveFileListRow } from '../drive/driveFetch';
import { driveFolderWebUrl } from '../drive/driveWebUrls';
import { openEncoreGoogleDrivePicker } from '../drive/googlePicker';

function qFilesInFolder(folderId: string, nameContains: string): string {
  const esc = nameContains.replace(/'/g, "\\'");
  const nameClause = nameContains.trim() ? ` and name contains '${esc}'` : '';
  return `'${folderId}' in parents and trashed=false${nameClause}`;
}

export function DriveFilePickerDialog(props: {
  open: boolean;
  title: string;
  folderId: string | null;
  googleAccessToken: string | null;
  /** Optional MIME filter for the in-app Google Picker shortcut. */
  pickerMimeTypes?: string;
  onClose: () => void;
  onPick: (fileId: string, fileName: string) => void;
}): ReactElement {
  const { open, title, folderId, googleAccessToken, pickerMimeTypes, onClose, onPick } = props;
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);
  queryRef.current = query;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFileListRow[]>([]);
  const [nextPage, setNextPage] = useState<string | undefined>();

  const fetchPage = useCallback(
    async (pageToken?: string, append?: boolean) => {
      if (!googleAccessToken || !folderId) {
        setFiles([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const q = qFilesInFolder(folderId, queryRef.current.trim());
        const res = await driveListFiles(
          googleAccessToken,
          q,
          'nextPageToken,files(id,name,mimeType,modifiedTime)',
          40,
          pageToken,
        );
        const list = (res.files ?? []).filter((f) => f.mimeType !== 'application/vnd.google-apps.folder');
        setFiles((prev) => (append ? [...prev, ...list] : list));
        setNextPage(res.nextPageToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setFiles([]);
        setNextPage(undefined);
      } finally {
        setLoading(false);
      }
    },
    [folderId, googleAccessToken],
  );

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setFiles([]);
    setNextPage(undefined);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open || !folderId || !googleAccessToken) return;
    void fetchPage();
  }, [open, folderId, googleAccessToken, fetchPage]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="drive-picker-title"
      disableEnforceFocus
    >
      <DialogTitle id="drive-picker-title" sx={{ display: 'flex', alignItems: 'center', pr: 1, gap: 1, flexWrap: 'wrap' }}>
        <Typography component="span" variant="h6" sx={{ flex: '1 1 auto', minWidth: 0 }}>
          {title}
        </Typography>
        {folderId && googleAccessToken ? (
          <Button
            size="small"
            variant="outlined"
            onClick={() =>
              void openEncoreGoogleDrivePicker({
                accessToken: googleAccessToken,
                title,
                parentFolderId: folderId,
                mimeTypes: pickerMimeTypes,
                onPicked: (files) => {
                  const f = files[0];
                  if (f?.id) onPick(f.id, f.name);
                },
                onError: (m) => setError(m),
              })
            }
            sx={{ flexShrink: 0 }}
          >
            Google Picker
          </Button>
        ) : null}
        {folderId ? (
          <Button
            size="small"
            variant="outlined"
            component="a"
            href={driveFolderWebUrl(folderId)}
            target="_blank"
            rel="noreferrer"
            startIcon={<OpenInNewIcon />}
            sx={{ flexShrink: 0 }}
          >
            Open folder in Drive
          </Button>
        ) : null}
        <IconButton aria-label="Close" onClick={onClose} sx={{ ml: 'auto' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {!googleAccessToken || !folderId ? (
          <Typography color="text.secondary">Sign in to Google and sync Drive first.</Typography>
        ) : (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                label="Filter by name"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setFiles([]);
                    setNextPage(undefined);
                    void fetchPage();
                  }
                }}
              />
              <Button
                variant="outlined"
                onClick={() => {
                  setFiles([]);
                  setNextPage(undefined);
                  void fetchPage();
                }}
                startIcon={<SearchIcon />}
                disabled={loading}
              >
                Search
              </Button>
            </Box>
            {error ? (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            ) : null}
            {loading && !files.length ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <List dense sx={{ maxHeight: 360, overflow: 'auto' }}>
                {files.map((f) => (
                  <ListItemButton
                    key={f.id}
                    onClick={() => {
                      if (f.id && f.name) onPick(f.id, f.name);
                    }}
                  >
                    <ListItemText primary={f.name ?? f.id} secondary={f.mimeType} />
                  </ListItemButton>
                ))}
              </List>
            )}
            {nextPage ? (
              <Button size="small" onClick={() => void fetchPage(nextPage, true)} disabled={loading} sx={{ mt: 1 }}>
                Load more
              </Button>
            ) : null}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
