import type { RefObject } from 'react';
import type { SongSection } from '../../shared/music/songSections';
import AnchoredPopover from '../../shared/components/AnchoredPopover';
import {
  chorusLinkAggregateLabel,
  countChorusSections,
  getChorusLyricsLinkAggregate,
  getChorusTemplateLinkAggregate,
  type ChorusLinkAggregate,
} from '../utils/wordsChorusLinking';

type WordsChorusLinkMenuPopoverProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  paperRef?: RefObject<HTMLDivElement | null>;
  section: SongSection;
  sections: SongSection[];
  onToggleChorusLyricsLink: () => void;
  onToggleChorusTemplateLink: () => void;
  onLinkAllChorusLyrics: () => void;
  onUnlinkAllChorusLyrics: () => void;
  onLinkAllChorusTemplates: () => void;
  onUnlinkAllChorusTemplates: () => void;
};

function aggregateStatusClass(aggregate: ChorusLinkAggregate): string {
  if (aggregate === 'all-linked') return 'words-chorus-link-aggregate is-linked';
  if (aggregate === 'all-unlinked') return 'words-chorus-link-aggregate is-unlinked';
  return 'words-chorus-link-aggregate is-mixed';
}

type ChorusLinkRowProps = {
  linked: boolean;
  label: string;
  hint: string;
  ariaLabel: string;
  onClick: () => void;
};

function ChorusLinkRow({ linked, label, hint, ariaLabel, onClick }: ChorusLinkRowProps) {
  return (
    <li>
      <button type="button" className="words-chorus-link-menu-row" onClick={onClick} aria-label={ariaLabel}>
        <span
          className={`words-chorus-link-menu-row-icon material-symbols-outlined${linked ? ' is-linked' : ' is-unlinked'}`}
          aria-hidden
        >
          {linked ? 'link' : 'link_off'}
        </span>
        <span className="words-chorus-link-menu-row-copy">
          <span className="words-chorus-link-menu-row-label">{label}</span>
          <span className="words-chorus-link-menu-row-hint">{hint}</span>
        </span>
        <span className={`words-chorus-link-menu-row-state${linked ? ' is-linked' : ' is-unlinked'}`}>
          {linked ? 'Linked' : 'Unlinked'}
        </span>
      </button>
    </li>
  );
}

type ChorusLinkBulkBlockProps = {
  name: string;
  aggregate: ChorusLinkAggregate;
  onLinkAll: () => void;
  onUnlinkAll: () => void;
};

function ChorusLinkBulkBlock({ name, aggregate, onLinkAll, onUnlinkAll }: ChorusLinkBulkBlockProps) {
  return (
    <div className="words-chorus-link-bulk-block">
      <div className="words-chorus-link-bulk-meta">
        <span className="words-chorus-link-bulk-label">{name}</span>
        <span className={aggregateStatusClass(aggregate)}>{chorusLinkAggregateLabel(aggregate)}</span>
      </div>
      <div className="words-chorus-link-bulk-actions" role="group" aria-label={`${name} bulk actions`}>
        <button type="button" className="words-chorus-link-bulk-btn" onClick={onLinkAll}>
          <span className="material-symbols-outlined" aria-hidden>
            link
          </span>
          Link all
        </button>
        <button type="button" className="words-chorus-link-bulk-btn" onClick={onUnlinkAll}>
          <span className="material-symbols-outlined" aria-hidden>
            link_off
          </span>
          Unlink all
        </button>
      </div>
    </div>
  );
}

export default function WordsChorusLinkMenuPopover({
  open,
  anchorEl,
  onClose,
  paperRef,
  section,
  sections,
  onToggleChorusLyricsLink,
  onToggleChorusTemplateLink,
  onLinkAllChorusLyrics,
  onUnlinkAllChorusLyrics,
  onLinkAllChorusTemplates,
  onUnlinkAllChorusTemplates,
}: WordsChorusLinkMenuPopoverProps) {
  const showBulkActions = countChorusSections(sections) >= 2;
  const lyricsAggregate = getChorusLyricsLinkAggregate(sections);
  const templateAggregate = getChorusTemplateLinkAggregate(sections);

  const runAndClose = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <AnchoredPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      placement="bottom-start"
      paperClassName="words-dropdown-menu words-chorus-link-menu"
      slotProps={{
        paper: paperRef ? { ref: paperRef } : undefined,
      }}
    >
      <header className="words-chorus-link-menu-header">
        <h3 className="words-chorus-link-menu-title">Chorus linking</h3>
        <p className="words-chorus-link-menu-lede">Sync lyrics and rhythm templates across chorus sections.</p>
      </header>

      <section className="words-chorus-link-menu-section" aria-label="This chorus">
        <h4 className="words-chorus-link-menu-eyebrow">This chorus</h4>
        <ul className="words-chorus-link-menu-row-list">
          <ChorusLinkRow
            linked={section.linkedToPreviousChorusLyrics}
            label="Lyrics"
            hint={
              section.linkedToPreviousChorusLyrics
                ? 'Edits sync with linked choruses'
                : 'This chorus keeps its own lyrics'
            }
            ariaLabel="Toggle chorus lyrics linking for this section"
            onClick={() => runAndClose(onToggleChorusLyricsLink)}
          />
          <ChorusLinkRow
            linked={section.linkedToPreviousChorusTemplate}
            label="Rhythm template"
            hint={
              section.linkedToPreviousChorusTemplate
                ? 'Stays in sync with linked choruses'
                : 'This chorus keeps its own template'
            }
            ariaLabel="Toggle chorus rhythm template linking for this section"
            onClick={() => runAndClose(onToggleChorusTemplateLink)}
          />
        </ul>
      </section>

      {showBulkActions ? (
        <>
          <div className="words-chorus-link-menu-divider" role="presentation" />
          <section className="words-chorus-link-menu-section" aria-label="All choruses">
            <h4 className="words-chorus-link-menu-eyebrow">All choruses</h4>
            <div className="words-chorus-link-bulk-panel">
              {lyricsAggregate ? (
                <ChorusLinkBulkBlock
                  name="Lyrics"
                  aggregate={lyricsAggregate}
                  onLinkAll={() => runAndClose(onLinkAllChorusLyrics)}
                  onUnlinkAll={() => runAndClose(onUnlinkAllChorusLyrics)}
                />
              ) : null}
              {templateAggregate ? (
                <ChorusLinkBulkBlock
                  name="Rhythm templates"
                  aggregate={templateAggregate}
                  onLinkAll={() => runAndClose(onLinkAllChorusTemplates)}
                  onUnlinkAll={() => runAndClose(onUnlinkAllChorusTemplates)}
                />
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </AnchoredPopover>
  );
}
