import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import {
  addLyreflyPiecesFromDriveFolder,
  createLyreflyCollection,
  deleteLyreflyCollection,
  loadLyreflyPieceThumb,
  makeLyreflyComicFromPieces,
  updateLyreflyCollection,
} from '../db/lyreflyCollectionMutations';
import { ensureLyreflyGoogleDriveAccess } from '../drive/lyreflyGoogleDriveAccess';
import { useLyreflyCollections } from '../hooks/useLyreflyCollections';
import { lyreflyCollectionsHref, navigateLyreflyHash } from '../routes/lyreflyHash';
import type { LyreflyCollection, LyreflyCollectionPiece } from '../types';
import { LyreflySketchbookModeSwitch } from './LyreflySketchbookModeSwitch';

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function errorText(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

/** A piece's image, fetched as a small thumbnail when it scrolls into view and cached per device. */
function PieceThumb({ piece }: { piece: LyreflyCollectionPiece }): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'missing'>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let objectUrl: string | null = null;
    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        setState('loading');
        void (async () => {
          try {
            const token = await ensureLyreflyGoogleDriveAccess({ interactive: false });
            const blob = await loadLyreflyPieceThumb(piece, token);
            if (cancelled) return;
            if (!blob) {
              setState('missing');
              return;
            }
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
          } catch {
            if (!cancelled) setState('missing');
          }
        })();
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [piece]);

  return (
    <div ref={ref} className="lyrefly-piece__thumb" aria-hidden>
      {url ? (
        <img src={url} alt="" />
      ) : (
        <span className="lyrefly-piece__thumb-placeholder">{state === 'missing' ? 'No preview' : ''}</span>
      )}
    </div>
  );
}

function pieceLabel(piece: LyreflyCollectionPiece, index: number): string {
  return piece.title ?? `#${index + 1}`;
}

function CollectionCard({
  collection,
  pieces,
}: {
  collection: LyreflyCollection;
  pieces: LyreflyCollectionPiece[];
}): ReactElement {
  return (
    <li>
      <button
        type="button"
        className={['lyrefly-collection-card', collection.status === 'archived' ? 'lyrefly-collection-card--archived' : ''].join(' ')}
        onClick={() => navigateLyreflyHash(lyreflyCollectionsHref(collection.id))}
      >
        <span className="lyrefly-collection-card__strip">
          {pieces.slice(0, 4).map((p) => (
            <PieceThumb key={p.id} piece={p} />
          ))}
        </span>
        <span className="lyrefly-collection-card__title">{collection.title}</span>
        <span className="lyrefly-collection-card__meta">{plural(pieces.length, 'piece')}</span>
      </button>
    </li>
  );
}

function CollectionsIndex(): ReactElement {
  const { collections, piecesByCollection, hydrated } = useLyreflyCollections();
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState('');

  const ongoing = collections.filter((c) => c.status === 'ongoing');
  const archived = collections.filter((c) => c.status === 'archived');
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return [];
    const byId = new Map(collections.map((c) => [c.id, c] as const));
    return collections.flatMap((c) =>
      (piecesByCollection.get(c.id) ?? [])
        .map((p, i) => ({ piece: p, index: i, collection: byId.get(p.collectionId)! }))
        .filter(({ piece, collection }) =>
          [piece.title, piece.notes, piece.fileName, piece.occurredOn, collection.title]
            .filter(Boolean)
            .some((s) => s!.toLowerCase().includes(q)),
        ),
    );
  }, [q, collections, piecesByCollection]);

  const newCollection = async (): Promise<void> => {
    const created = await createLyreflyCollection('Untitled collection');
    navigateLyreflyHash(lyreflyCollectionsHref(created.id));
  };

  return (
    <section className="lyrefly-studio lyrefly-collections" data-testid="lyrefly-collections">
      <header className="lyrefly-collections__masthead">
        <div>
          <h1 className="lyrefly-studio__title">Sketchbook</h1>
          <p className="lyrefly-studio__lede">Finished pieces, gathered. Pick a few to start a comic.</p>
        </div>
        <LyreflySketchbookModeSwitch mode="collections" />
      </header>

      <div className="lyrefly-collections__toolbar">
        <TextField
          size="small"
          label="Search pieces"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="lyrefly-collections__search"
        />
        <Button variant="outlined" onClick={() => void newCollection()}>
          New collection
        </Button>
      </div>

      {!hydrated ? null : q ? (
        <section aria-label="Search results">
          <p className="lyrefly-collections__count">{plural(matches.length, 'piece')} found</p>
          <ul className="lyrefly-pieces">
            {matches.map(({ piece, index, collection }) => (
              <li key={piece.id}>
                <button
                  type="button"
                  className="lyrefly-piece"
                  onClick={() => navigateLyreflyHash(lyreflyCollectionsHref(collection.id))}
                >
                  <PieceThumb piece={piece} />
                  <span className="lyrefly-piece__label">{pieceLabel(piece, index)}</span>
                  <span className="lyrefly-piece__meta">{collection.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          {ongoing.length === 0 ? (
            <p className="lyrefly-collections__empty">
              No collections yet. Make one, then add a Drive folder of finished pieces.
            </p>
          ) : (
            <ul className="lyrefly-collections__grid">
              {ongoing.map((c) => (
                <CollectionCard key={c.id} collection={c} pieces={piecesByCollection.get(c.id) ?? []} />
              ))}
            </ul>
          )}
          {archived.length > 0 ? (
            <section className="lyrefly-collections__archived" aria-label="Archived collections">
              <Button
                size="small"
                sx={{ color: 'text.secondary' }}
                aria-expanded={showArchived}
                onClick={() => setShowArchived((v) => !v)}
              >
                {showArchived ? 'Hide archived' : `Archived (${archived.length})`}
              </Button>
              {showArchived ? (
                <ul className="lyrefly-collections__grid">
                  {archived.map((c) => (
                    <CollectionCard key={c.id} collection={c} pieces={piecesByCollection.get(c.id) ?? []} />
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}

/** `onDone` absent: the form cannot be closed (an empty collection has nothing else to show). */
function AddFromDriveForm({ collection, onDone }: { collection: LyreflyCollection; onDone?: () => void }): ReactElement {
  const [link, setLink] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const add = async (): Promise<void> => {
    setMessage(null);
    setProgress('Reading the folder…');
    try {
      const token = await ensureLyreflyGoogleDriveAccess({ interactive: true });
      const r = await addLyreflyPiecesFromDriveFolder(collection, link, token, setProgress);
      setMessage({
        text: [
          r.added ? `Added ${plural(r.added, 'piece')}.` : '',
          r.alreadyHere ? `${plural(r.alreadyHere, 'piece')} already here.` : '',
          r.skipped ? `Skipped ${plural(r.skipped, 'file')} that ${r.skipped === 1 ? 'is not an image' : 'are not images'}.` : '',
        ]
          .filter(Boolean)
          .join(' ') || 'No images in that folder.',
        error: false,
      });
      setLink('');
    } catch (e) {
      // Pieces added before a failure are kept and keyed, so adding the folder again finishes it.
      setMessage({ text: `${errorText(e, 'Could not read that folder.')} Try again to finish.`, error: true });
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="lyrefly-collection__add" data-testid="lyrefly-collection-add">
      <form
        className="lyrefly-accounts__add-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (link.trim()) void add();
        }}
      >
        <TextField
          size="small"
          label="Google Drive folder link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          disabled={Boolean(progress)}
        />
        <Button type="submit" variant="outlined" size="small" disabled={!link.trim() || Boolean(progress)}>
          Add pieces
        </Button>
        {onDone ? (
          <Button size="small" onClick={onDone} disabled={Boolean(progress)}>
            Close
          </Button>
        ) : null}
      </form>
      {progress ? (
        <div className="lyrefly-import__progress" role="status">
          <LinearProgress />
          <span>{progress}</span>
        </div>
      ) : null}
      {message ? (
        <Typography variant="body2" role={message.error ? 'alert' : 'status'} color={message.error ? 'error' : 'text.secondary'}>
          {message.text}
        </Typography>
      ) : null}
    </div>
  );
}

function MakeComicDialog({
  open,
  collection,
  pieces,
  onClose,
  onMade,
}: {
  open: boolean;
  collection: LyreflyCollection;
  pieces: LyreflyCollectionPiece[];
  onClose: () => void;
  onMade: (projectId: string) => void;
}): ReactElement {
  // Remounted on each open (see the key where it is rendered), so these start fresh every time.
  const [title, setTitle] = useState(() => `${collection.title} comic`);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const make = async (): Promise<void> => {
    setError(null);
    setProgress('Starting…');
    try {
      const token = await ensureLyreflyGoogleDriveAccess({ interactive: true });
      onMade(await makeLyreflyComicFromPieces(pieces, title, token, setProgress));
    } catch (e) {
      setError(errorText(e, 'Could not make the comic.'));
    } finally {
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onClose={() => !progress && onClose()} fullWidth maxWidth="xs" data-testid="lyrefly-make-comic-dialog">
      <DialogTitle>Make a comic from {plural(pieces.length, 'piece')}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          size="small"
          label="Comic title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={Boolean(progress)}
          sx={{ mt: 0.5 }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
          Each piece becomes a page, in the order you picked. The originals stay as they are.
        </Typography>
        {progress ? (
          <div className="lyrefly-import__progress" role="status">
            <LinearProgress />
            <span>{progress}</span>
          </div>
        ) : null}
        {error ? (
          <Typography variant="body2" role="alert" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={Boolean(progress)}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void make()} disabled={Boolean(progress)} data-testid="lyrefly-make-comic-confirm">
          Make comic
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CollectionDetail({
  collectionId,
  onOpenProject,
}: {
  collectionId: string;
  onOpenProject: (projectId: string) => void;
}): ReactElement {
  const { collections, piecesByCollection, hydrated } = useLyreflyCollections();
  const collection = collections.find((c) => c.id === collectionId);
  const pieces = useMemo(() => piecesByCollection.get(collectionId) ?? [], [piecesByCollection, collectionId]);
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [making, setMaking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!hydrated) return <section className="lyrefly-studio" aria-busy="true" />;
  if (!collection) {
    return (
      <section className="lyrefly-studio">
        <p className="lyrefly-collections__empty">This collection is gone.</p>
        <Button onClick={() => navigateLyreflyHash(lyreflyCollectionsHref())}>All collections</Button>
      </section>
    );
  }

  const toggle = (id: string): void =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const picked = selected
    .map((id) => pieces.find((p) => p.id === id))
    .filter((p): p is LyreflyCollectionPiece => Boolean(p));
  const archived = collection.status === 'archived';
  // An empty collection has nothing to show yet, so it opens straight onto adding pieces.
  const showAdd = adding || pieces.length === 0;

  return (
    <section className="lyrefly-studio lyrefly-collection" data-testid="lyrefly-collection">
      <Button size="small" sx={{ alignSelf: 'flex-start', mb: 1 }} onClick={() => navigateLyreflyHash(lyreflyCollectionsHref())}>
        All collections
      </Button>
      <header className="lyrefly-collection__head">
        <TextField
          // Re-keyed when the title changes elsewhere (another device), so the field shows it.
          key={collection.title}
          variant="standard"
          defaultValue={collection.title}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (!next) e.target.value = collection.title;
            else if (next !== collection.title) void updateLyreflyCollection(collection, { title: next });
          }}
          slotProps={{ input: { disableUnderline: true }, htmlInput: { 'aria-label': 'Collection title', className: 'lyrefly-collection__title' } }}
        />
        <div className="lyrefly-collection__actions">
          {!showAdd ? (
            <Button size="small" onClick={() => setAdding(true)}>
              Add from Drive
            </Button>
          ) : null}
          <Button size="small" sx={{ color: 'text.secondary' }} onClick={() => void updateLyreflyCollection(collection, { status: archived ? 'ongoing' : 'archived' })}>
            {archived ? 'Unarchive' : 'Archive'}
          </Button>
          <Button size="small" sx={{ color: 'text.secondary' }} onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </header>
      <p className="lyrefly-collections__count">
        {plural(pieces.length, 'piece')}
        {collection.sourceUrl ? (
          <>
            {' · '}
            <a href={collection.sourceUrl} target="_blank" rel="noopener noreferrer">
              Source folder
            </a>
          </>
        ) : null}
      </p>

      {showAdd ? (
        <AddFromDriveForm collection={collection} onDone={pieces.length > 0 ? () => setAdding(false) : undefined} />
      ) : null}

      <ul className="lyrefly-pieces" aria-label="Pieces. Select some to make a comic.">
        {pieces.map((piece, index) => {
          const order = selected.indexOf(piece.id);
          return (
            <li key={piece.id}>
              <button
                type="button"
                className={['lyrefly-piece', order >= 0 ? 'lyrefly-piece--selected' : ''].join(' ')}
                aria-pressed={order >= 0}
                onClick={() => toggle(piece.id)}
              >
                <PieceThumb piece={piece} />
                {order >= 0 ? (
                  <span className="lyrefly-piece__badge" aria-hidden>
                    <CheckCircleIcon fontSize="inherit" /> {order + 1}
                  </span>
                ) : null}
                <span className="lyrefly-piece__label">{pieceLabel(piece, index)}</span>
                {piece.usedInProjectIds?.length ? (
                  <span className="lyrefly-piece__meta">In {plural(piece.usedInProjectIds.length, 'comic')}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {picked.length > 0 ? (
        <div className="lyrefly-selection-bar" role="region" aria-label="Selection" data-testid="lyrefly-selection-bar">
          <span>{plural(picked.length, 'piece')} selected</span>
          <Button size="small" onClick={() => setSelected([])}>
            Clear
          </Button>
          <Button variant="contained" size="small" onClick={() => setMaking(true)} data-testid="lyrefly-make-comic">
            Make a comic
          </Button>
        </div>
      ) : null}

      <MakeComicDialog
        key={making ? 'open' : 'closed'}
        open={making}
        collection={collection}
        pieces={picked}
        onClose={() => setMaking(false)}
        onMade={(projectId) => {
          setMaking(false);
          setSelected([]);
          onOpenProject(projectId);
        }}
      />

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs">
        <DialogTitle>Delete {collection.title}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">The collection leaves Lyrefly. The images stay in your Drive.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              void deleteLyreflyCollection(collection).then(() => navigateLyreflyHash(lyreflyCollectionsHref()));
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </section>
  );
}

export function LyreflyCollectionsView({
  collectionId,
  onOpenProject,
}: {
  collectionId?: string;
  onOpenProject: (projectId: string) => void;
}): ReactElement {
  return collectionId ? <CollectionDetail collectionId={collectionId} onOpenProject={onOpenProject} /> : <CollectionsIndex />;
}
