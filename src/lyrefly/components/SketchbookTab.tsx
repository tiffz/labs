import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent as ReactClipboardEvent, type KeyboardEvent, type ReactElement } from 'react';

import { useDragDropHighlight } from '../../shared/hooks/useDragDropHighlight';
import { loadSketchbookBlob, putSketchbookSeed } from '../db/sketchbookMutations';
import { lyreflyDb } from '../db/lyreflyDb';
import { notifyLyreflyLocalChange } from '../db/lyreflyChangeBus';
import { createBlankComicProject, createBlankScriptDocument, type SketchbookSeed } from '../types';
import {
  collectImageFilesFromDataTransfer,
  collectFilesFromDataTransfer,
} from '../utils/conceptShelfFileIntake';
import {
  inferSketchbookCaptureFromText,
  isSketchbookAttachableFile,
  isSketchbookImageFile,
  sketchbookKindLabel,
} from '../utils/sketchbookCaptureUtils';

export type SketchbookTabProps = {
  onOpenProject: (projectId: string) => void;
};

function pipelineLabel(status: string | undefined): string {
  if (status === 'ready_to_draw') return 'Ready to draw';
  if (status === 'complete') return 'Complete';
  return 'Fleshing out';
}

function SketchbookKindIcon({ kind }: { kind: SketchbookSeed['kind'] }): ReactElement {
  if (kind === 'image') return <ImageOutlinedIcon fontSize="inherit" aria-hidden />;
  if (kind === 'link') return <LinkOutlinedIcon fontSize="inherit" aria-hidden />;
  if (kind === 'file') return <AttachFileOutlinedIcon fontSize="inherit" aria-hidden />;
  if (kind === 'daily_flash') return <WbSunnyOutlinedIcon fontSize="inherit" aria-hidden />;
  return <NotesOutlinedIcon fontSize="inherit" aria-hidden />;
}

function SketchbookSeedPreview({ seed }: { seed: SketchbookSeed }): ReactElement | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (seed.kind !== 'image' && seed.kind !== 'file') return;
    let cancelled = false;
    let objectUrl: string | null = null;
    void loadSketchbookBlob(seed.id).then((blob) => {
      if (cancelled || !blob) return;
      if (seed.kind === 'image' || blob.type.startsWith('image/')) {
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      }
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [seed.id, seed.kind]);

  if (seed.kind === 'link' && seed.url) {
    return (
      <a className="lyrefly-sketchbook__seed-link" href={seed.url} target="_blank" rel="noopener noreferrer">
        {seed.url}
      </a>
    );
  }

  if (previewUrl) {
    return <img src={previewUrl} alt="" className="lyrefly-sketchbook__seed-image" loading="lazy" />;
  }

  if (seed.kind === 'file' && seed.fileName) {
    return <p className="lyrefly-sketchbook__seed-file">{seed.fileName}</p>;
  }

  if (seed.bodyHtml) {
    return <p className="lyrefly-sketchbook__seed-body">{seed.bodyHtml}</p>;
  }

  if (seed.logline) {
    return <p className="lyrefly-sketchbook__seed-body">{seed.logline}</p>;
  }

  return null;
}

function SketchbookSeedCard({
  seed,
  onPromote,
}: {
  seed: SketchbookSeed;
  onPromote: (seed: SketchbookSeed) => void;
}): ReactElement {
  return (
    <li className="lyrefly-sketchbook__card" data-testid={`lyrefly-sketchbook-seed-${seed.id}`}>
      <div className="lyrefly-sketchbook__card-head">
        <span className={`lyrefly-sketchbook__kind lyrefly-sketchbook__kind--${seed.kind}`}>
          <SketchbookKindIcon kind={seed.kind} />
          {sketchbookKindLabel(seed.kind)}
        </span>
        {seed.occurredOn ? <span className="lyrefly-sketchbook__date">{seed.occurredOn}</span> : null}
      </div>
      <h3 className="lyrefly-sketchbook__card-title">{seed.title ?? 'Untitled'}</h3>
      <SketchbookSeedPreview seed={seed} />
      <div className="lyrefly-sketchbook__card-actions">
        <Button size="small" onClick={() => onPromote(seed)} data-testid={`lyrefly-promote-${seed.id}`}>
          Promote to comic
        </Button>
      </div>
    </li>
  );
}

export function SketchbookTab({ onOpenProject }: SketchbookTabProps): ReactElement {
  const seeds = useLiveQuery(() => lyreflyDb.sketchbookSeeds.where('status').equals('active').sortBy('sortOrder'), []);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSeeds = useMemo(() => seeds ?? [], [seeds]);

  const createSeed = useCallback(
    async (partial: Omit<SketchbookSeed, 'id' | 'sortOrder' | 'createdAt' | 'updatedAt' | 'status' | 'tags'>, blob?: Blob) => {
      const now = new Date().toISOString();
      const seed: SketchbookSeed = {
        id: crypto.randomUUID(),
        kind: partial.kind,
        title: partial.title,
        logline: partial.logline,
        bodyHtml: partial.bodyHtml,
        occurredOn: partial.occurredOn,
        url: partial.url,
        fileName: partial.fileName,
        mimeType: partial.mimeType,
        tags: [],
        status: 'active',
        sortOrder: (seeds?.length ?? 0) + 1,
        createdAt: now,
        updatedAt: now,
      };
      await putSketchbookSeed(seed, blob ?? null);
      return seed;
    },
    [seeds?.length],
  );

  const onCaptureText = async (): Promise<void> => {
    const capture = inferSketchbookCaptureFromText(draft);
    if (!capture) return;
    setBusy(true);
    try {
      await createSeed({
        kind: capture.kind,
        title: capture.title,
        bodyHtml: capture.bodyHtml,
        url: capture.url,
        occurredOn: capture.occurredOn,
        logline: capture.kind === 'idea' ? undefined : capture.bodyHtml?.split('\n')[0],
      });
      setDraft('');
      composerRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const onAttachFiles = useCallback(async (files: File[]): Promise<void> => {
    const usable = files.filter(isSketchbookAttachableFile);
    if (usable.length === 0) return;
    setBusy(true);
    try {
      for (const file of usable) {
        const kind = isSketchbookImageFile(file) ? 'image' : 'file';
        await createSeed(
          {
            kind,
            title: file.name.replace(/\.[^.]+$/, '') || 'Attachment',
            fileName: file.name,
            mimeType: file.type || undefined,
          },
          file,
        );
      }
    } finally {
      setBusy(false);
    }
  }, [createSeed]);

  const { dragActive, handlers } = useDragDropHighlight({
    disabled: busy,
    onDrop: (event) => void onAttachFiles(collectFilesFromDataTransfer(event.dataTransfer)),
  });

  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      if (document.activeElement === composerRef.current) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, [contenteditable="true"]')) return;
      const clipboard = event.clipboardData;
      if (!clipboard) return;
      const files = collectImageFilesFromDataTransfer(clipboard);
      if (files.length > 0) {
        event.preventDefault();
        void onAttachFiles(files);
        return;
      }
      const text = clipboard.getData('text/plain')?.trim();
      if (text) {
        event.preventDefault();
        setDraft((current) => (current ? `${current}\n${text}` : text));
        composerRef.current?.focus();
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [onAttachFiles]);

  const onComposerPaste = (event: ReactClipboardEvent<HTMLTextAreaElement>): void => {
    const files = collectImageFilesFromDataTransfer(event.clipboardData);
    if (files.length > 0) {
      event.preventDefault();
      void onAttachFiles(files);
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void onCaptureText();
    }
  };

  const onPromote = async (seed: SketchbookSeed): Promise<void> => {
    const project = createBlankComicProject();
    project.title = seed.title ?? 'Untitled comic';
    project.subtitle = seed.logline ?? seed.bodyHtml?.split('\n')[0];
    project.pipelineStatus = 'fleshing_out';
    project.brainstormHtml = seed.bodyHtml;
    const script = createBlankScriptDocument(project.id);
    script.id = project.scriptDocumentId;
    const now = new Date().toISOString();
    await lyreflyDb.transaction(
      'rw',
      [lyreflyDb.projects, lyreflyDb.scriptDocuments, lyreflyDb.sketchbookSeeds],
      async () => {
        await lyreflyDb.projects.put(project);
        await lyreflyDb.scriptDocuments.put(script);
        await lyreflyDb.sketchbookSeeds.put({
          ...seed,
          status: 'promoted',
          promotedProjectId: project.id,
          updatedAt: now,
        });
      },
    );
    notifyLyreflyLocalChange();
    onOpenProject(project.id);
  };

  const onFileInput = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files ? [...event.target.files] : [];
    event.target.value = '';
    void onAttachFiles(files);
  };

  const onComposerContainerKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      composerRef.current?.focus();
    }
  };

  return (
    <section className="lyrefly-sketchbook lyrefly-studio" data-testid="lyrefly-sketchbook">
      <header className="lyrefly-sketchbook__masthead">
        <h1 className="lyrefly-studio__title">Sketchbook</h1>
        <p className="lyrefly-studio__lede">
          Jot notes, flashes, links, concept art, and files. Promote anything when it is ready to become a comic.
        </p>
      </header>

      <Box
        className={[
          'lyrefly-sketchbook__composer',
          dragActive ? 'lyrefly-sketchbook__composer--drag-active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid="lyrefly-sketchbook-composer"
        tabIndex={-1}
        onKeyDown={onComposerContainerKeyDown}
        onDragEnter={handlers.onDragEnter}
        onDragOver={handlers.onDragOver}
        onDragLeave={handlers.onDragLeave}
        onDrop={handlers.onDrop}
      >
        <textarea
          ref={composerRef}
          className="lyrefly-sketchbook__composer-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onComposerKeyDown}
          onPaste={onComposerPaste}
          placeholder="Type an idea, paste a link, or drop art and files…"
          rows={3}
          data-testid="lyrefly-sketchbook-input"
          disabled={busy}
        />
        <div className="lyrefly-sketchbook__composer-bar">
          <button
            type="button"
            className="lyrefly-sketchbook__attach"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            Attach file
          </button>
          <span className="lyrefly-sketchbook__composer-hint">Enter to save · Shift+Enter for a new line</span>
          <Button
            size="small"
            variant="contained"
            disabled={busy || !draft.trim()}
            onClick={() => void onCaptureText()}
            data-testid="lyrefly-sketchbook-add"
          >
            Save note
          </Button>
        </div>
        <input ref={fileInputRef} type="file" multiple hidden onChange={onFileInput} />
      </Box>

      {dragActive ? (
        <p className="lyrefly-sketchbook__drop-hint" aria-live="polite">
          Drop to attach images, PDFs, or docs
        </p>
      ) : null}

      {activeSeeds.length === 0 ? (
        <p className="lyrefly-sketchbook__empty">Nothing here yet. Start typing or drop a reference image.</p>
      ) : (
        <ul className="lyrefly-sketchbook__grid">
          {activeSeeds.map((seed) => (
            <SketchbookSeedCard key={seed.id} seed={seed} onPromote={(row) => void onPromote(row)} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function GalleryPipelineQueue(): ReactElement {
  const projects = useLiveQuery(
    () =>
      lyreflyDb.projects
        .filter((p) => Boolean(p.pipelineStatus))
        .toArray()
        .then((rows) => rows.sort((a, b) => (a.priorityRank ?? 999) - (b.priorityRank ?? 999))),
    [],
  );

  if (!projects || projects.length === 0) return <></>;

  return (
    <section className="lyrefly-pipeline" aria-label="Priority queue" data-testid="lyrefly-pipeline-queue">
      <h2 className="lyrefly-pipeline__title">Priority queue</h2>
      <ol className="lyrefly-pipeline__list">
        {projects.map((project) => (
          <li key={project.id}>
            <span className="lyrefly-pipeline__name">{project.title}</span>
            <span className="lyrefly-pipeline__status">{pipelineLabel(project.pipelineStatus)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
