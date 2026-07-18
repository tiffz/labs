import { useId, useMemo, useState, type ReactElement } from 'react';

import type { LabsWikimediaLicenseFilter } from './wikimediaLicense';
import {
  fetchRandomScenicWikimediaImage,
  fetchWikimediaResults,
  filterWikimediaResultsByLicense,
  RANDOM_SCENIC_QUERIES,
  type LabsWikimediaImageResult,
} from './labsWikimediaScenic';
import './labsWikimediaImageSearch.css';

export type { LabsWikimediaImageResult };

export type LabsWikimediaImageSearchVariant = 'default' | 'lyrefly' | 'sketchy';

export interface LabsWikimediaImageSearchProps {
  className?: string;
  /** Visual theme. `lyrefly` maps to Riso Cube tokens; `sketchy` is Scrapboard balsamiq; `default` is app-neutral. */
  variant?: LabsWikimediaImageSearchVariant;
  heading?: string;
  /** When false, omit the heading (host already labels the section). */
  showHeading?: boolean;
  /** Called when a result thumbnail is chosen (e.g. Scrapboard sets a panel background). */
  onSelectImage?: (result: LabsWikimediaImageResult) => void;
}

const LICENSE_FILTER_OPTIONS: Array<{ value: LabsWikimediaLicenseFilter; label: string }> = [
  { value: 'any', label: 'Any license' },
  { value: 'pd', label: 'Public domain' },
  { value: 'cc-by', label: 'CC BY' },
  { value: 'cc-by-sa', label: 'CC BY-SA' },
];

function pickRandom<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Wikimedia Commons photo search with a client-side license filter.
 * Native controls (not MUI) so host skins — especially Scrapboard `sketchy` — can match the rail.
 */
export function LabsWikimediaImageSearch({
  className,
  variant = 'default',
  heading = 'Wikimedia (PD/CC)',
  showHeading = true,
  onSelectImage,
}: LabsWikimediaImageSearchProps): ReactElement {
  const baseId = useId();
  const queryId = `${baseId}-query`;
  const licenseId = `${baseId}-license`;
  const [query, setQuery] = useState('');
  const [licenseFilter, setLicenseFilter] = useState<LabsWikimediaLicenseFilter>('any');
  const [results, setResults] = useState<LabsWikimediaImageResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSearch = async (): Promise<void> => {
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setError('');
    try {
      const next = await fetchWikimediaResults(q);
      setResults(next);
      if (next.length === 0) setError('No results. Try a different search.');
    } catch {
      setError('Search failed. Check your connection.');
    } finally {
      setBusy(false);
    }
  };

  const onRandom = async (): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      if (!query.trim()) {
        const scenic = pickRandom(RANDOM_SCENIC_QUERIES) ?? 'landscape photograph';
        setQuery(scenic);
      }
      const chosen = await fetchRandomScenicWikimediaImage(Date.now(), licenseFilter);
      if (!chosen) {
        setError('No random photo found. Try another search.');
        return;
      }
      setResults([chosen]);
      onSelectImage?.(chosen);
    } catch {
      setError('Random photo failed. Check your connection.');
    } finally {
      setBusy(false);
    }
  };

  const filteredResults = useMemo(() => {
    return filterWikimediaResultsByLicense(results, licenseFilter);
  }, [results, licenseFilter]);

  const rootClassName = [
    'labs-wikimedia-search',
    variant !== 'default' ? `labs-wikimedia-search--${variant}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName} data-variant={variant} data-testid="labs-wikimedia-search">
      {showHeading ? (
        <h3 className="labs-wikimedia-search__heading">{heading}</h3>
      ) : null}

      <div className="labs-wikimedia-search__toolbar">
        <label className="labs-wikimedia-search__field" htmlFor={queryId}>
          <span className="labs-wikimedia-search__field-label">Search photos</span>
          <input
            id={queryId}
            type="search"
            className="labs-wikimedia-search__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void onSearch();
            }}
            placeholder="e.g. rainy street"
            autoComplete="off"
          />
        </label>

        <label className="labs-wikimedia-search__field" htmlFor={licenseId}>
          <span className="labs-wikimedia-search__field-label">License</span>
          <select
            id={licenseId}
            className="labs-wikimedia-search__select"
            value={licenseFilter}
            onChange={(e) => setLicenseFilter(e.target.value as LabsWikimediaLicenseFilter)}
            data-testid="labs-wikimedia-license-filter"
          >
            {LICENSE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="labs-wikimedia-search__actions">
          <button
            type="button"
            className="labs-wikimedia-search__search-btn"
            disabled={busy || !query.trim()}
            onClick={() => void onSearch()}
          >
            {busy ? 'Working…' : 'Search'}
          </button>
          <button
            type="button"
            className="labs-wikimedia-search__search-btn labs-wikimedia-search__search-btn--secondary"
            disabled={busy}
            onClick={() => void onRandom()}
            data-testid="labs-wikimedia-random"
          >
            Random
          </button>
        </div>
      </div>

      {error ? (
        <p className="labs-wikimedia-search__error" role="status">
          {error}
        </p>
      ) : null}

      {filteredResults.length > 0 ? (
        <ul className="labs-wikimedia-search__results">
          {filteredResults.map((result) => (
            <li key={result.url} className="labs-wikimedia-search__result">
              {result.thumbUrl ? (
                onSelectImage ? (
                  <button
                    type="button"
                    className="labs-wikimedia-search__thumb-button"
                    onClick={() => onSelectImage(result)}
                    aria-label={`Use ${result.title}`}
                  >
                    <img
                      src={result.thumbUrl}
                      alt=""
                      className="labs-wikimedia-search__thumb"
                      loading="lazy"
                    />
                  </button>
                ) : (
                  <img
                    src={result.thumbUrl}
                    alt=""
                    className="labs-wikimedia-search__thumb"
                    loading="lazy"
                  />
                )
              ) : null}
              <div className="labs-wikimedia-search__result-body">
                <a href={result.url} target="_blank" rel="noopener noreferrer">
                  {result.title}
                </a>
                <span className="labs-wikimedia-search__license">{result.license}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
