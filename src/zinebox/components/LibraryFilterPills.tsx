import { handleSpaLinkClick, zineboxLibraryHref, type ZineboxLibraryParams } from '../routes/zineboxHash';

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

  const pillHref = (next: Partial<ZineboxLibraryParams>) =>
    zineboxLibraryHref({ ...params, ...next });

  return (
    <div className="zinebox-filter-pills-wrap">
      <div className="zinebox-filter-pills" role="toolbar" aria-label="Library filters">
      <a
        href={pillHref({ filter: 'all', source: null, tag: null })}
        className={`zinebox-pill${statusActive('all') ? ' zinebox-pill--active' : ''}`}
        onClick={(e) => handleSpaLinkClick(e, () => onChange({ filter: 'all', source: null, tag: null }))}
      >
        All
      </a>
      <a
        href={pillHref({ filter: 'unread', source: null, tag: null })}
        className={`zinebox-pill${statusActive('unread') ? ' zinebox-pill--active' : ''}`}
        onClick={(e) => handleSpaLinkClick(e, () => onChange({ filter: 'unread', source: null, tag: null }))}
      >
        Unread
      </a>
      <a
        href={pillHref({ filter: 'read', source: null, tag: null })}
        className={`zinebox-pill${statusActive('read') ? ' zinebox-pill--active' : ''}`}
        onClick={(e) => handleSpaLinkClick(e, () => onChange({ filter: 'read', source: null, tag: null }))}
      >
        Read
      </a>
      {sources.map((source) => (
        <a
          key={`source:${source}`}
          href={pillHref({ filter: 'all', source, tag: null })}
          className={`zinebox-pill${params.source === source && !params.tag ? ' zinebox-pill--active' : ''}`}
          onClick={(e) => handleSpaLinkClick(e, () => onChange({ filter: 'all', source, tag: null }))}
        >
          {source}
        </a>
      ))}
      {tags.map((tag) => (
        <a
          key={`tag:${tag}`}
          href={pillHref({ filter: 'all', source: null, tag })}
          className={`zinebox-pill zinebox-pill--tag${params.tag === tag && !params.source ? ' zinebox-pill--active' : ''}`}
          onClick={(e) => handleSpaLinkClick(e, () => onChange({ filter: 'all', source: null, tag }))}
        >
          #{tag}
        </a>
      ))}
      </div>
    </div>
  );
}
