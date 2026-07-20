import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useLabsConfirm } from '../../shared/components/useLabsConfirm';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from 'react';

import {
  addSketchbookAttachment,
  deleteSketchbookSeed,
  loadSketchbookBlob,
  removeSketchbookAttachment,
  updateSketchbookSeed,
} from '../db/sketchbookMutations';
import type { SketchbookAttachment, SketchbookSeed } from '../types';
import {
  isSketchbookAttachableFile,
  isSketchbookImageFile,
} from '../utils/sketchbookCaptureUtils';
import { promoteSketchbookSeed } from '../utils/promoteSketchbookSeed';

const AUTOSAVE_MS = 450;

export type SketchbookSeedEditorProps = {
  seed: SketchbookSeed;
  busy: boolean;
  onCollapse: () => void;
  onChanged: (seed: SketchbookSeed | null) => void;
  onPromoted: (projectId: string) => void;
  setBusy: (busy: boolean) => void;
};

function AttachmentThumb({ attachment }: { attachment: SketchbookAttachment }): ReactElement {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (attachment.kind !== 'image' && attachment.kind !== 'file') return;
    let cancelled = false;
    let objectUrl: string | null = null;
    void loadSketchbookBlob(attachment.id).then((blob) => {
      if (cancelled || !blob) return;
      if (attachment.kind === 'image' || blob.type.startsWith('image/')) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, attachment.kind]);

  if (attachment.kind === 'link' && attachment.url) {
    return (
      <a
        className="lyrefly-sketchbook-editor__link"
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <LinkOutlinedIcon fontSize="inherit" aria-hidden />
        {attachment.title || attachment.url}
      </a>
    );
  }

  if (url) {
    return <img src={url} alt="" className="lyrefly-sketchbook-editor__thumb" loading="lazy" />;
  }

  return (
    <span className="lyrefly-sketchbook-editor__file">
      {attachment.kind === 'image' ? (
        <ImageOutlinedIcon fontSize="inherit" aria-hidden />
      ) : (
        <AttachFileOutlinedIcon fontSize="inherit" aria-hidden />
      )}
      {attachment.fileName || attachment.title || 'Attachment'}
    </span>
  );
}

/** Inline expanded card body (Trello-style) — no modal. */
export function SketchbookSeedEditor({
  seed,
  busy,
  onCollapse,
  onChanged,
  onPromoted,
  setBusy,
}: SketchbookSeedEditorProps): ReactElement {
  const [title, setTitle] = useState(seed.title ?? '');
  const [notes, setNotes] = useState(seed.bodyHtml ?? '');
  const [linkDraft, setLinkDraft] = useState('');
  const [localSeed, setLocalSeed] = useState(seed);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const latestRef = useRef({ title, notes, localSeed });

  useEffect(() => {
    setTitle(seed.title ?? '');
    setNotes(seed.bodyHtml ?? '');
    setLinkDraft('');
    setLocalSeed(seed);
  }, [seed.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only when switching cards

  useEffect(() => {
    latestRef.current = { title, notes, localSeed };
  }, [title, notes, localSeed]);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, [seed.id]);

  const persistFields = async (): Promise<SketchbookSeed> => {
    const { title: nextTitle, notes: nextNotes, localSeed: base } = latestRef.current;
    const next = await updateSketchbookSeed({
      ...base,
      title: nextTitle.trim() || base.title,
      bodyHtml: nextNotes,
      logline: nextNotes.split('\n')[0] || base.logline,
    });
    setLocalSeed(next);
    latestRef.current.localSeed = next;
    onChanged(next);
    return next;
  };

  const scheduleAutosave = (): void => {
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void persistFields();
    }, AUTOSAVE_MS);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        void persistFields();
      }
    };
    // Flush pending edits when leaving the expanded card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      void (async () => {
        if (saveTimerRef.current != null) {
          window.clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        await persistFields();
        onCollapse();
      })();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        void (async () => {
          if (saveTimerRef.current != null) {
            window.clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
          }
          await persistFields();
          onCollapse();
        })();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCollapse]);

  const { confirm: confirmDelete, dialog: deleteDialog } = useLabsConfirm();

  const onDelete = async (): Promise<void> => {
    if (!(await confirmDelete({ title: 'Delete this entry?', message: 'This cannot be undone.' }))) return;
    setBusy(true);
    try {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      await deleteSketchbookSeed(localSeed);
      onChanged(null);
      onCollapse();
    } finally {
      setBusy(false);
    }
  };

  const onPromote = async (): Promise<void> => {
    setBusy(true);
    try {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const latest = await persistFields();
      const project = await promoteSketchbookSeed(latest);
      onChanged(null);
      onCollapse();
      onPromoted(project.id);
    } finally {
      setBusy(false);
    }
  };

  const onAddLink = async (): Promise<void> => {
    const url = linkDraft.trim();
    if (!url) return;
    setBusy(true);
    try {
      const base = await persistFields();
      const attachment: SketchbookAttachment = {
        id: crypto.randomUUID(),
        kind: 'link',
        url,
        title: url.replace(/^https?:\/\//, '').slice(0, 48),
        createdAt: new Date().toISOString(),
      };
      const next = await addSketchbookAttachment(base, attachment);
      setLocalSeed(next);
      onChanged(next);
      setLinkDraft('');
    } finally {
      setBusy(false);
    }
  };

  const onAddFiles = async (files: File[]): Promise<void> => {
    const usable = files.filter(isSketchbookAttachableFile);
    if (usable.length === 0) return;
    setBusy(true);
    try {
      let current = await persistFields();
      for (const file of usable) {
        const attachment: SketchbookAttachment = {
          id: crypto.randomUUID(),
          kind: isSketchbookImageFile(file) ? 'image' : 'file',
          title: file.name.replace(/\.[^.]+$/, '') || 'Attachment',
          fileName: file.name,
          mimeType: file.type || undefined,
          createdAt: new Date().toISOString(),
        };
        current = await addSketchbookAttachment(current, attachment, file);
      }
      setLocalSeed(current);
      onChanged(current);
    } finally {
      setBusy(false);
    }
  };

  const onRemoveAttachment = async (attachmentId: string): Promise<void> => {
    setBusy(true);
    try {
      const next = await removeSketchbookAttachment(localSeed, attachmentId);
      setLocalSeed(next);
      onChanged(next);
    } finally {
      setBusy(false);
    }
  };

  const onFileInput = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files ? [...event.target.files] : [];
    event.target.value = '';
    void onAddFiles(files);
  };

  const attachments = localSeed.attachments ?? [];
  const legacyLink = localSeed.url;

  return (
    <div
      ref={rootRef}
      className="lyrefly-sketchbook-editor"
      data-testid={`lyrefly-sketchbook-editor-${seed.id}`}
    >
      <input
        ref={titleRef}
        className="lyrefly-sketchbook-editor__title"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          scheduleAutosave();
        }}
        placeholder="Title"
        disabled={busy}
        aria-label="Idea title"
      />
      <textarea
        className="lyrefly-sketchbook-editor__notes"
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          scheduleAutosave();
        }}
        placeholder="Notes, beats, scraps…"
        rows={5}
        disabled={busy}
        aria-label="Idea notes"
      />

      <section className="lyrefly-sketchbook-editor__materials" aria-label="Materials">
        <div className="lyrefly-sketchbook-editor__materials-head">
          <h3 className="lyrefly-sketchbook-editor__materials-title">Materials</h3>
          <span className="lyrefly-sketchbook-editor__materials-lede">
            Art → concept · links → brainstorm refs
          </span>
        </div>

        {legacyLink ? (
          <div className="lyrefly-sketchbook-editor__row">
            <a
              className="lyrefly-sketchbook-editor__link"
              href={legacyLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LinkOutlinedIcon fontSize="inherit" aria-hidden />
              {legacyLink}
            </a>
          </div>
        ) : null}

        {attachments.length === 0 && !legacyLink ? (
          <p className="lyrefly-sketchbook-editor__empty">Drop art here or add a link below.</p>
        ) : (
          <ul className="lyrefly-sketchbook-editor__list">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="lyrefly-sketchbook-editor__row">
                <AttachmentThumb attachment={attachment} />
                <Tooltip title="Remove">
                  <IconButton
                    size="small"
                    aria-label="Remove material"
                    disabled={busy}
                    onClick={() => void onRemoveAttachment(attachment.id)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </li>
            ))}
          </ul>
        )}

        <div className="lyrefly-sketchbook-editor__add-row">
          <input
            className="lyrefly-sketchbook-editor__link-input"
            value={linkDraft}
            onChange={(event) => setLinkDraft(event.target.value)}
            placeholder="Paste a link…"
            disabled={busy}
            aria-label="Add link"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void onAddLink();
              }
            }}
          />
          <button
            type="button"
            className="lyrefly-sketchbook-editor__text-btn"
            disabled={busy || !linkDraft.trim()}
            onClick={() => void onAddLink()}
          >
            Add link
          </button>
          <button
            type="button"
            className="lyrefly-sketchbook-editor__text-btn"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            Attach art
          </button>
          <input ref={fileInputRef} type="file" multiple hidden onChange={onFileInput} />
        </div>
      </section>

      <div className="lyrefly-sketchbook-editor__actions">
        <Button
          size="small"
          color="inherit"
          disabled={busy}
          onClick={() => void onDelete()}
          startIcon={<DeleteOutlineIcon />}
        >
          Delete
        </Button>
        <div className="lyrefly-sketchbook-editor__actions-spacer" />
        <Button
          size="small"
          disabled={busy}
          onClick={() => {
            void (async () => {
              if (saveTimerRef.current != null) {
                window.clearTimeout(saveTimerRef.current);
                saveTimerRef.current = null;
              }
              await persistFields();
              onCollapse();
            })();
          }}
        >
          Close
        </Button>
        <Button size="small" variant="contained" disabled={busy} onClick={() => void onPromote()}>
          Promote to comic
        </Button>
      </div>
      {deleteDialog}
    </div>
  );
}
