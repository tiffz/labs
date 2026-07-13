import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type ReactElement } from 'react';

type WikimediaResult = {
  title: string;
  url: string;
  thumbUrl?: string;
  license: string;
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim();
}

export function LyreflyWikimediaPhotoSearch(): ReactElement {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WikimediaResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSearch = async (): Promise<void> => {
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setError('');
    try {
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        generator: 'search',
        gsrsearch: q,
        gsrnamespace: '6',
        gsrlimit: '8',
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        iiurlwidth: '120',
        origin: '*',
      });
      const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
      if (!res.ok) throw new Error('request failed');
      const data = (await res.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              title?: string;
              imageinfo?: Array<{
                url?: string;
                thumburl?: string;
                extmetadata?: Record<string, { value?: string }>;
              }>;
            }
          >;
        };
      };
      const pages = data.query?.pages ?? {};
      const next: WikimediaResult[] = [];
      for (const page of Object.values(pages)) {
        const info = page.imageinfo?.[0];
        if (!info?.url) continue;
        const licenseRaw = info.extmetadata?.LicenseShortName?.value ?? 'See Commons';
        next.push({
          title: (page.title ?? 'Image').replace(/^File:/, ''),
          url: info.url,
          thumbUrl: info.thumburl,
          license: stripHtml(licenseRaw),
        });
      }
      setResults(next);
      if (next.length === 0) setError('No results. Try a different search.');
    } catch {
      setError('Search failed. Check your connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lyrefly-wikimedia" data-testid="lyrefly-wikimedia-search">
      <Typography component="h3" variant="subtitle2" sx={{ mt: 2 }}>
        Wikimedia (PD/CC)
      </Typography>
      <TextField
        size="small"
        fullWidth
        label="Search photos"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void onSearch();
        }}
        sx={{ mt: 0.5 }}
      />
      <Button size="small" sx={{ mt: 0.5 }} disabled={busy} onClick={() => void onSearch()}>
        {busy ? 'Searching…' : 'Search'}
      </Button>
      {error ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          {error}
        </Typography>
      ) : null}
      <ul className="lyrefly-wikimedia__results">
        {results.map((r) => (
          <li key={r.url} className="lyrefly-wikimedia__result">
            {r.thumbUrl ? (
              <img src={r.thumbUrl} alt="" className="lyrefly-wikimedia__thumb" loading="lazy" />
            ) : null}
            <div className="lyrefly-wikimedia__result-body">
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.title}
              </a>
              <span className="lyrefly-wikimedia__license">{r.license}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
