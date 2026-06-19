import type { ZineboxLibraryParams } from '../routes/zineboxHash';

type LibraryFilterPillsProps = {
  params: ZineboxLibraryParams;
  sources: string[];
  tags: string[];
  onChange: (next: Partial<ZineboxLibraryParams>) => void;
};

export default function LibraryFilterPills({
  params,
  sources,
  tags,
  onChange,
}: LibraryFilterPillsProps): React.ReactElement {
  const statusActive = (filter: ZineboxLibraryParams['filter']) =>
    params.filter === filter && !params.source && !params.tag;

  return (
    <div className="zinebox-filter-pills" role="toolbar" aria-label="Library filters">
      <button
        type="button"
        className={`zinebox-pill${statusActive('all') ? ' zinebox-pill--active' : ''}`}
        onClick={() => onChange({ filter: 'all', source: null, tag: null })}
      >
        All
      </button>
      <button
        type="button"
        className={`zinebox-pill${statusActive('unread') ? ' zinebox-pill--active' : ''}`}
        onClick={() => onChange({ filter: 'unread', source: null, tag: null })}
      >
        Unread
      </button>
      <button
        type="button"
        className={`zinebox-pill${statusActive('read') ? ' zinebox-pill--active' : ''}`}
        onClick={() => onChange({ filter: 'read', source: null, tag: null })}
      >
        Read
      </button>
      {sources.map((source) => (
        <button
          key={`source:${source}`}
          type="button"
          className={`zinebox-pill${params.source === source && !params.tag ? ' zinebox-pill--active' : ''}`}
          onClick={() => onChange({ filter: 'all', source, tag: null })}
        >
          {source}
        </button>
      ))}
      {tags.map((tag) => (
        <button
          key={`tag:${tag}`}
          type="button"
          className={`zinebox-pill zinebox-pill--tag${params.tag === tag && !params.source ? ' zinebox-pill--active' : ''}`}
          onClick={() => onChange({ filter: 'all', source: null, tag })}
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}
