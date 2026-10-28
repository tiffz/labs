import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import {
  addLyreflyAccountFromUrl,
  createLyreflyPersona,
  createLyreflySeries,
  renameLyreflyPersona,
  renameLyreflySeries,
  setLyreflyAccountRetired,
  setLyreflyPersonaRetired,
  setLyreflySeriesRetired,
} from '../db/lyreflyIdentityMutations';
import AppTooltip from '../../shared/components/AppTooltip';
import { useLyreflyIdentities } from '../hooks/useLyreflyIdentities';
import type { LyreflyAccount } from '../types';
import { PublishPlatformIcon } from './PublishPlatformIcon';

type Owner = LyreflyAccount['owner'];

/** Focus a field revealed by a click (the click asked for it, so this is not an unprompted jump). */
function useFocusWhenShown(shown: boolean) {
  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (shown) ref.current?.focus();
  }, [shown]);
  return ref;
}

function AccountRow({ account }: { account: LyreflyAccount }): ReactElement {
  const retired = Boolean(account.retiredAt);
  return (
    <li className={['lyrefly-accounts__account', retired ? 'lyrefly-accounts__account--retired' : ''].join(' ')}>
      <span className="lyrefly-accounts__platform-icon" aria-hidden>
        <PublishPlatformIcon platform={account.platform} />
      </span>
      <span className="lyrefly-accounts__platform">{account.platform}</span>
      <a className="lyrefly-accounts__handle" href={account.url} target="_blank" rel="noopener noreferrer">
        {account.handle}
      </a>
      <AppTooltip title={retired ? 'Bring back' : 'Retire'}>
        <IconButton
          size="small"
          sx={{ color: 'text.secondary' }}
          aria-label={`${retired ? 'Bring back' : 'Retire'} ${account.platform} ${account.handle}`}
          onClick={() => void setLyreflyAccountRetired(account, !retired)}
        >
          {retired ? <UnarchiveOutlinedIcon fontSize="small" /> : <ArchiveOutlinedIcon fontSize="small" />}
        </IconButton>
      </AppTooltip>
    </li>
  );
}

function AddAccount({ owner }: { owner: Owner }): ReactElement {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useFocusWhenShown(open);

  const add = async (): Promise<void> => {
    const result = await addLyreflyAccountFromUrl(url, owner);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setUrl('');
    setError(null);
    setOpen(false);
  };

  if (!open) {
    return (
      <Button size="small" className="lyrefly-accounts__add-account" onClick={() => setOpen(true)}>
        Add account
      </Button>
    );
  }
  return (
    <form
      className="lyrefly-accounts__add-form"
      onSubmit={(e) => {
        e.preventDefault();
        void add();
      }}
    >
      <TextField
        size="small"
        label="Profile link"
        placeholder="https://bsky.app/profile/…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        error={Boolean(error)}
        helperText={error ?? ' '}
        inputRef={inputRef}
      />
      <Button type="submit" size="small" variant="outlined" disabled={!url.trim()}>
        Add
      </Button>
      <Button size="small" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}

type OwnerBlockProps = {
  name: string;
  retired: boolean;
  accounts: LyreflyAccount[];
  owner: Owner;
  nameLabel: string;
  onRename: (name: string) => void;
  onToggleRetired: () => void;
  showRetired: boolean;
};

function OwnerBlock({
  name,
  retired,
  accounts,
  owner,
  nameLabel,
  onRename,
  onToggleRetired,
  showRetired,
}: OwnerBlockProps): ReactElement {
  const [draft, setDraft] = useState(name);
  const visible = accounts.filter((a) => showRetired || !a.retiredAt);
  return (
    <li className={['lyrefly-accounts__owner', retired ? 'lyrefly-accounts__owner--retired' : ''].join(' ')}>
      <div className="lyrefly-accounts__owner-head">
        <TextField
          variant="standard"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => (draft.trim() ? onRename(draft) : setDraft(name))}
          slotProps={{ input: { disableUnderline: true }, htmlInput: { 'aria-label': nameLabel, className: 'lyrefly-accounts__owner-name' } }}
        />
        <Button size="small" sx={{ color: 'text.secondary' }} onClick={onToggleRetired}>
          {retired ? 'Bring back' : 'Retire'}
        </Button>
      </div>
      {visible.length > 0 ? (
        <ul className="lyrefly-accounts__account-list">
          {visible.map((a) => (
            <AccountRow key={a.id} account={a} />
          ))}
        </ul>
      ) : null}
      {retired ? null : <AddAccount owner={owner} />}
    </li>
  );
}

function AddOwner({ label, onAdd }: { label: string; onAdd: (name: string) => Promise<unknown> }): ReactElement {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useFocusWhenShown(open);
  if (!open) {
    return (
      <Button size="small" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }
  return (
    <form
      className="lyrefly-accounts__add-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        void onAdd(name).then(() => {
          setName('');
          setOpen(false);
        });
      }}
    >
      <TextField size="small" label="Name" value={name} onChange={(e) => setName(e.target.value)} inputRef={inputRef} />
      <Button type="submit" size="small" variant="outlined" disabled={!name.trim()}>
        Add
      </Button>
      <Button size="small" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}

export function LyreflyAccountsPage(): ReactElement {
  const { identities, identitiesHydrated } = useLyreflyIdentities();
  const [showRetired, setShowRetired] = useState(false);
  const { personas, series, accounts } = identities;

  const ownedBy = (owner: Owner) =>
    accounts.filter((a) => a.owner.kind === owner.kind && a.owner.id === owner.id);
  const retiredCount = [...personas, ...series, ...accounts].filter((r) => r.retiredAt).length;
  const visiblePersonas = personas.filter((p) => showRetired || !p.retiredAt);
  const visibleSeries = series.filter((s) => showRetired || !s.retiredAt);

  return (
    <section className="lyrefly-studio lyrefly-accounts" data-testid="lyrefly-accounts">
      <header className="lyrefly-studio__masthead lyrefly-accounts__masthead">
        <div>
          <h1 className="lyrefly-studio__title">Accounts</h1>
          <p className="lyrefly-studio__lede">Your pen names and series, and where each one posts.</p>
        </div>
      </header>

      {!identitiesHydrated ? null : (
        <>
          <section className="lyrefly-accounts__section" aria-labelledby="lyrefly-accounts-personas">
            <div className="lyrefly-accounts__section-head">
              <h2 id="lyrefly-accounts-personas" className="lyrefly-accounts__heading">
                Pen names
              </h2>
              <AddOwner label="Add pen name" onAdd={createLyreflyPersona} />
            </div>
            {visiblePersonas.length === 0 ? (
              <p className="lyrefly-accounts__empty">No pen names yet.</p>
            ) : (
              <ul className="lyrefly-accounts__owners">
                {visiblePersonas.map((p) => (
                  <OwnerBlock
                    key={p.id}
                    name={p.name}
                    nameLabel="Pen name"
                    retired={Boolean(p.retiredAt)}
                    owner={{ kind: 'persona', id: p.id }}
                    accounts={ownedBy({ kind: 'persona', id: p.id })}
                    onRename={(name) => void renameLyreflyPersona(p, name)}
                    onToggleRetired={() => void setLyreflyPersonaRetired(p, !p.retiredAt)}
                    showRetired={showRetired}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="lyrefly-accounts__section" aria-labelledby="lyrefly-accounts-series">
            <div className="lyrefly-accounts__section-head">
              <h2 id="lyrefly-accounts-series" className="lyrefly-accounts__heading">
                Series
              </h2>
              <AddOwner label="Add series" onAdd={createLyreflySeries} />
            </div>
            {visibleSeries.length === 0 ? (
              <p className="lyrefly-accounts__empty">No series yet.</p>
            ) : (
              <ul className="lyrefly-accounts__owners">
                {visibleSeries.map((s) => (
                  <OwnerBlock
                    key={s.id}
                    name={s.title}
                    nameLabel="Series title"
                    retired={Boolean(s.retiredAt)}
                    owner={{ kind: 'series', id: s.id }}
                    accounts={ownedBy({ kind: 'series', id: s.id })}
                    onRename={(title) => void renameLyreflySeries(s, title)}
                    onToggleRetired={() => void setLyreflySeriesRetired(s, !s.retiredAt)}
                    showRetired={showRetired}
                  />
                ))}
              </ul>
            )}
          </section>

          {retiredCount > 0 ? (
            <FormControlLabel
              className="lyrefly-accounts__show-retired"
              control={<Switch size="small" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} />}
              label={`Show retired (${retiredCount})`}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
