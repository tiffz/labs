import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react';

import { useDragDropHighlight } from '../../shared/hooks/useDragDropHighlight';
import { loadSketchbookBlob, putSketchbookSeed, putSketchbookSeeds } from '../db/sketchbookMutations';
import { lyreflyDb } from '../db/lyreflyDb';
import type { SketchbookAttachment, SketchbookSeed } from '../types';
import {
  collectImageFilesFromDataTransfer,
  collectFilesFromDataTransfer,
} from '../utils/conceptShelfFileIntake';
import { promoteSketchbookSeed } from '../utils/promoteSketchbookSeed';
import {
  inferSketchbookCaptureFromText,
  isSketchbookAttachableFile,
  isSketchbookImageFile,
  sketchbookKindLabel,
} from '../utils/sketchbookCaptureUtils';
import { isSketchbookImportFileName, parseSketchbookImportFile } from '../utils/sketchbookImportParser';
import { LyreflyDateChip } from './LyreflyDateChip';
import { SketchbookSeedEditor } from './SketchbookSeedEditor';

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

function materialCount(seed: SketchbookSeed): number {
  let count = seed.attachments?.length ?? 0;
  if (seed.url) count += 1;
  // Legacy single-file seeds store the blob on the seed itself (no attachments array).
  if (
    (seed.kind === 'image' || seed.kind === 'file') &&
    (seed.fileName || seed.mimeType) &&
    (seed.attachments?.length ?? 0) === 0
  ) {
    count += 1;
  }
  return count;
}

function SketchbookSeedPreview({ seed }: { seed: SketchbookSeed }): ReactElement | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const imageAttachment = seed.attachments?.find((item) => item.kind === 'image');
  const blobId =
    imageAttachment?.id ??
    (seed.kind === 'image' || seed.kind === 'file' ? seed.id : undefined);

  useEffect(() => {
    if (!blobId) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    void loadSketchbookBlob(blobId).then((blob) => {
      if (cancelled || !blob) return;
      if (blob.type.startsWith('image/') || seed.kind === 'image' || imageAttachment) {
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      }
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blobId, imageAttachment, seed.kind]);

  if (previewUrl) {
    return <img src={previewUrl} alt="" className="lyrefly-sketchbook__seed-image" loading="lazy" />;
  }

  const link = seed.url || seed.attachments?.find((item) => item.kind === 'link')?.url;
  if (link) {
    return (
      <a className="lyrefly-sketchbook__seed-link" href={link} target="_blank" rel="noopener noreferrer">
        {link}
      </a>
    );
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
  expanded,
  busy,
  setBusy,
  onExpand,
  onCollapse,
  onChanged,
  onPromoted,
  onPromote,
}: {
  seed: SketchbookSeed;
  expanded: boolean;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onExpand: (seed: SketchbookSeed) => void;
  onCollapse: () => void;
  onChanged: (seed: SketchbookSeed | null) => void;
  onPromoted: (projectId: string) => void;
  onPromote: (seed: SketchbookSeed) => void;
}): ReactElement {
  const materials = materialCount(seed);
  const cardRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!expanded) return;
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [expanded]);

  if (expanded) {
    return (
      <li
        ref={cardRef}
        className="lyrefly-sketchbook__card lyrefly-sketchbook__card--expanded"
        data-testid={`lyrefly-sketchbook-seed-${seed.id}`}
      >
        <div className="lyrefly-sketchbook__card-head lyrefly-sketchbook__card-head--expanded">
          <span className={`lyrefly-sketchbook__kind lyrefly-sketchbook__kind--${seed.kind}`}>
            <SketchbookKindIcon kind={seed.kind} />
            {sketchbookKindLabel(seed.kind)}
          </span>
          {seed.occurredOn ? (
            <LyreflyDateChip value={seed.occurredOn} ariaLabel="Idea date" />
          ) : null}
        </div>
        <SketchbookSeedEditor
          seed={seed}
          busy={busy}
          setBusy={setBusy}
          onCollapse={onCollapse}
          onChanged={onChanged}
          onPromoted={onPromoted}
        />
      </li>
    );
  }

  return (
    <li
      ref={cardRef}
      className="lyrefly-sketchbook__card"
      data-testid={`lyrefly-sketchbook-seed-${seed.id}`}
    >
      <button
        type="button"
        className="lyrefly-sketchbook__card-open"
        onClick={() => onExpand(seed)}
        aria-label={`Expand ${seed.title ?? 'idea'}`}
      >
        <div className="lyrefly-sketchbook__card-head">
          <span className={`lyrefly-sketchbook__kind lyrefly-sketchbook__kind--${seed.kind}`}>
            <SketchbookKindIcon kind={seed.kind} />
            {sketchbookKindLabel(seed.kind)}
          </span>
          {seed.occurredOn ? (
            <LyreflyDateChip value={seed.occurredOn} ariaLabel="Idea date" />
          ) : null}
        </div>
        <h3 className="lyrefly-sketchbook__card-title">{seed.title ?? 'Untitled'}</h3>
        <SketchbookSeedPreview seed={seed} />
        {materials > 0 ? (
          <p className="lyrefly-sketchbook__card-materials">
            {materials} material{materials === 1 ? '' : 's'}
          </p>
        ) : null}
      </button>
      <div className="lyrefly-sketchbook__card-actions">
        <Button
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onPromote(seed);
          }}
          data-testid={`lyrefly-promote-${seed.id}`}
        >
          Promote
        </Button>
      </div>
    </li>
  );
}

export function SketchbookTab({ onOpenProject }: SketchbookTabProps): ReactElement {
  const seeds = useLiveQuery(
    () => lyreflyDb.sketchbookSeeds.where('status').equals('active').sortBy('sortOrder'),
    [],
  );
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [editingSeedId, setEditingSeedId] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const activeSeeds = useMemo(() => seeds ?? [], [seeds]);

  const createSeed = useCallback(
    async (
      partial: Omit<SketchbookSeed, 'id' | 'sortOrder' | 'createdAt' | 'updatedAt' | 'status' | 'tags'>,
      options?: { blob?: Blob | null; attachmentBlobs?: Map<string, Blob>; openEditor?: boolean },
    ) => {
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
        attachments: partial.attachments,
        tags: [],
        status: 'active',
        sortOrder: (seeds?.length ?? 0) + 1,
        createdAt: now,
        updatedAt: now,
      };
      await putSketchbookSeed(seed, options?.blob ?? null, options?.attachmentBlobs);
      if (options?.openEditor) setEditingSeedId(seed.id);
      return seed;
    },
    [seeds?.length],
  );

  const onCaptureText = async (): Promise<void> => {
    const capture = inferSketchbookCaptureFromText(draft);
    if (!capture) return;
    setBusy(true);
    try {
      await createSeed(
        {
          kind: capture.kind,
          title: capture.title,
          bodyHtml: capture.bodyHtml,
          url: capture.url,
          occurredOn: capture.occurredOn,
          logline: capture.kind === 'idea' ? undefined : capture.bodyHtml?.split('\n')[0],
        },
        { openEditor: true },
      );
      setDraft('');
      composerRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const onAttachFiles = useCallback(
    async (files: File[]): Promise<void> => {
      const usable = files.filter(isSketchbookAttachableFile);
      if (usable.length === 0) return;
      setBusy(true);
      try {
        const noteText = draft.trim();
        const attachments: SketchbookAttachment[] = usable.map((file) => ({
          id: crypto.randomUUID(),
          kind: isSketchbookImageFile(file) ? 'image' : 'file',
          title: file.name.replace(/\.[^.]+$/, '') || 'Attachment',
          fileName: file.name,
          mimeType: file.type || undefined,
          createdAt: new Date().toISOString(),
        }));
        const attachmentBlobs = new Map(
          attachments.map((attachment, index) => [attachment.id, usable[index]! as Blob]),
        );
        const first = usable[0]!;
        const titleFromNote = noteText.split('\n')[0]?.slice(0, 80);
        await createSeed(
          {
            kind: noteText ? 'idea' : isSketchbookImageFile(first) ? 'image' : 'file',
            title: titleFromNote || first.name.replace(/\.[^.]+$/, '') || 'Untitled',
            bodyHtml: noteText || undefined,
            logline: noteText ? noteText.split('\n')[0] : undefined,
            attachments,
          },
          { attachmentBlobs, openEditor: true },
        );
        setDraft('');
      } finally {
        setBusy(false);
      }
    },
    [createSeed, draft],
  );

  const onImportFiles = useCallback(
    async (files: File[]): Promise<void> => {
      if (files.length === 0) return;
      setBusy(true);
      setImportSummary(null);
      try {
        let unsupportedCount = 0;
        let skippedCount = 0;
        const importedItems: {
          kind: SketchbookSeed['kind'];
          title: string;
          bodyHtml?: string;
          occurredOn?: string;
        }[] = [];

        for (const file of files) {
          if (!isSketchbookImportFileName(file.name)) {
            unsupportedCount += 1;
            continue;
          }
          const text = await file.text();
          const result = parseSketchbookImportFile(file.name, text);
          if (!result) {
            unsupportedCount += 1;
            continue;
          }
          importedItems.push(...result.items);
          skippedCount += result.skippedCount;
        }

        if (importedItems.length === 0) {
          setImportSummary(
            unsupportedCount > 0
              ? 'No ideas found. Export PDFs to text or Markdown first, then import that file.'
              : 'No ideas found in that file.',
          );
          return;
        }

        const now = new Date().toISOString();
        const baseSortOrder = seeds?.length ?? 0;
        const newSeeds: SketchbookSeed[] = importedItems.map((item, index) => ({
          id: crypto.randomUUID(),
          kind: item.kind,
          title: item.title,
          bodyHtml: item.bodyHtml,
          occurredOn: item.occurredOn,
          tags: [],
          status: 'active',
          sortOrder: baseSortOrder + index + 1,
          createdAt: now,
          updatedAt: now,
        }));
        await putSketchbookSeeds(newSeeds);

        const summary = [
          importedItems.length === 1 ? 'Imported 1 idea.' : `Imported ${importedItems.length} ideas.`,
        ];
        if (skippedCount > 0) {
          summary.push(`Skipped ${skippedCount} unreadable line${skippedCount === 1 ? '' : 's'}.`);
        }
        if (unsupportedCount > 0) {
          summary.push(
            `${unsupportedCount} file${unsupportedCount === 1 ? '' : 's'} not supported. Export PDFs to text or Markdown first.`,
          );
        }
        setImportSummary(summary.join(' '));
      } finally {
        setBusy(false);
      }
    },
    [seeds?.length],
  );

  const { dragActive, handlers } = useDragDropHighlight({
    disabled: busy,
    onDrop: (event) => void onAttachFiles(collectFilesFromDataTransfer(event.dataTransfer)),
  });

  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      if (document.activeElement === composerRef.current) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, [contenteditable="true"]')) {
        return;
      }
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
    setBusy(true);
    try {
      const project = await promoteSketchbookSeed(seed);
      onOpenProject(project.id);
    } finally {
      setBusy(false);
    }
  };

  const onFileInput = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files ? [...event.target.files] : [];
    event.target.value = '';
    void onAttachFiles(files);
  };

  const onImportFileInput = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files ? [...event.target.files] : [];
    event.target.value = '';
    void onImportFiles(files);
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
        <div className="lyrefly-sketchbook__masthead-text">
          <h1 className="lyrefly-studio__title">Sketchbook</h1>
          <p className="lyrefly-studio__lede">
            Catch scraps as they come. Click a card to expand it on the board and keep adding.
          </p>
        </div>
        <Button
          size="small"
          variant="text"
          onClick={() => importInputRef.current?.click()}
          disabled={busy}
          data-testid="lyrefly-sketchbook-import"
        >
          Import ideas
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept=".md,.txt,.jsonl"
          multiple
          hidden
          onChange={onImportFileInput}
          data-testid="lyrefly-sketchbook-import-input"
        />
      </header>

      {importSummary ? (
        <p
          className="lyrefly-sketchbook__import-summary"
          aria-live="polite"
          data-testid="lyrefly-sketchbook-import-summary"
        >
          {importSummary}
        </p>
      ) : null}

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
          placeholder="Type a scrap, paste a link, or drop art… Enter adds it to the board."
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
          <span className="lyrefly-sketchbook__composer-hint">
            Drop files onto a note to keep them together · Shift+Enter for a new line
          </span>
          <Button
            size="small"
            variant="contained"
            disabled={busy || !draft.trim()}
            onClick={() => void onCaptureText()}
            data-testid="lyrefly-sketchbook-add"
          >
            Save scrap
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
        <p className="lyrefly-sketchbook__empty">
          Nothing here yet. Start typing, paste a link, or drop a reference image.
        </p>
      ) : (
        <ul className="lyrefly-sketchbook__grid">
          {activeSeeds.map((seed) => (
            <SketchbookSeedCard
              key={seed.id}
              seed={seed}
              expanded={editingSeedId === seed.id}
              busy={busy}
              setBusy={setBusy}
              onExpand={(row) => setEditingSeedId(row.id)}
              onCollapse={() =>
                setEditingSeedId((current) => (current === seed.id ? null : current))
              }
              onChanged={(next) => {
                if (!next) {
                  setEditingSeedId((current) => (current === seed.id ? null : current));
                }
              }}
              onPromoted={onOpenProject}
              onPromote={(row) => void onPromote(row)}
            />
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
