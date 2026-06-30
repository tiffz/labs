import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import IconButton from '@mui/material/IconButton';
import { useEffect, useId, useState } from 'react';

type LibrarySearchFieldProps = {
  value: string;
  onChange: (query: string | null) => void;
};

export default function LibrarySearchField({
  value,
  onChange,
}: LibrarySearchFieldProps): React.ReactElement {
  const inputId = useId();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = draft.trim();
      const nextQ = trimmed.length > 0 ? trimmed : null;
      const currentQ = value.trim().length > 0 ? value.trim() : null;
      if (nextQ === currentQ) return;
      onChange(nextQ);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draft, onChange, value]);

  const hasQuery = draft.length > 0;

  return (
    <div
      className={['zinebox-library-search', hasQuery ? 'is-active' : ''].filter(Boolean).join(' ')}
      role="search"
    >
      <label className="zinebox-library-search__field" htmlFor={inputId}>
        <SearchIcon className="zinebox-library-search__icon" aria-hidden />
        <input
          id={inputId}
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Search library…"
          className="zinebox-library-search__input"
          data-testid="zinebox-library-search"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {hasQuery ? (
          <IconButton
            type="button"
            size="small"
            aria-label="Clear search"
            className="zinebox-library-search__clear"
            onClick={() => setDraft('')}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        ) : null}
      </label>
    </div>
  );
}
