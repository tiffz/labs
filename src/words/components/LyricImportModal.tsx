import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { SongSectionType } from '../../shared/music/songSections';
import {
  parseLyricSections,
  type ParsedLyricSectionDraft,
} from '../../shared/music/lyricSectionParser';
import AppTooltip from '../../shared/components/AppTooltip';

interface LyricImportModalProps {
  isOpen: boolean;
  initialText: string;
  onClose: () => void;
  onApply: (drafts: ParsedLyricSectionDraft[]) => void;
}

export const LyricImportModal: React.FC<LyricImportModalProps> = ({
  isOpen,
  initialText,
  onClose,
  onApply,
}) => {
  const [rawText, setRawText] = useState(initialText);
  const [drafts, setDrafts] = useState<ParsedLyricSectionDraft[]>([]);
  const syncMatchingChorusLinks = useCallback(
    (inputDrafts: ParsedLyricSectionDraft[]) => {
      const repeatedChorusLyrics = new Set<string>();
      const chorusCounts = new Map<string, number>();
      inputDrafts.forEach((draft) => {
        if (draft.type !== 'chorus' || !draft.normalizedLyrics) return;
        chorusCounts.set(
          draft.normalizedLyrics,
          (chorusCounts.get(draft.normalizedLyrics) ?? 0) + 1
        );
      });
      chorusCounts.forEach((count, normalizedLyrics) => {
        if (count >= 2) repeatedChorusLyrics.add(normalizedLyrics);
      });
      return inputDrafts.map((draft) => {
        if (draft.type !== 'chorus' || !draft.normalizedLyrics) {
          return { ...draft, suggestedChorusLink: false };
        }
        if (!repeatedChorusLyrics.has(draft.normalizedLyrics)) {
          return { ...draft, suggestedChorusLink: false };
        }
        return { ...draft, suggestedChorusLink: true };
      });
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    setRawText(initialText);
  }, [isOpen, initialText]);

  useEffect(() => {
    if (!isOpen) return;
    setDrafts(syncMatchingChorusLinks(parseLyricSections(rawText)));
  }, [rawText, isOpen, syncMatchingChorusLinks]);

  const pluralize = (count: number, singular: string, plural: string) =>
    `${count} ${count === 1 ? singular : plural}`;

  const typeCode = (type: SongSectionType) => {
    if (type === 'chorus') return 'C';
    if (type === 'bridge') return 'B';
    return 'V';
  };

  const summary = useMemo(() => {
    const verseCount = drafts.filter((draft) => draft.type === 'verse').length;
    const chorusCount = drafts.filter((draft) => draft.type === 'chorus').length;
    const bridgeCount = drafts.filter((draft) => draft.type === 'bridge').length;
    const structure = drafts.map((draft) => typeCode(draft.type)).join('-');
    const countSummary = [
      pluralize(drafts.length, 'section', 'sections'),
      pluralize(verseCount, 'verse', 'verses'),
      pluralize(chorusCount, 'chorus', 'choruses'),
      pluralize(bridgeCount, 'bridge', 'bridges'),
    ].join(', ');
    return structure ? `${countSummary} - Structure: ${structure}` : countSummary;
  }, [drafts]);
  const sectionDisplayNames = useMemo(() => {
    const counts: Record<SongSectionType, number> = {
      verse: 0,
      chorus: 0,
      bridge: 0,
    };
    return drafts.map((draft) => {
      counts[draft.type] += 1;
      const label =
        draft.type === 'chorus'
          ? 'Chorus'
          : draft.type === 'bridge'
            ? 'Bridge'
            : 'Verse';
      return `${label} ${counts[draft.type]}`;
    });
  }, [drafts]);

  const updateDraft = (
    index: number,
    updates: Partial<Pick<ParsedLyricSectionDraft, 'type' | 'lyrics' | 'title' | 'suggestedChorusLink'>>
  ) => {
    setDrafts((previous) =>
      previous.map((draft, i) =>
        i === index
          ? {
              ...draft,
              ...updates,
            }
          : draft
      )
    );
  };

  const handleTypeChange = (index: number, nextType: SongSectionType) => {
    updateDraft(index, { type: nextType });
  };

  if (!isOpen) return null;

  return (
    <div className="words-import-backdrop" role="dialog" aria-modal="true">
      <div className="words-import-modal">
        <div className="words-import-header">
          <div>
            <h2>Detected multiple song sections</h2>
            <p>{summary}</p>
          </div>
          <button type="button" className="words-button words-button-icon" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="words-import-grid">
          <label className="words-import-column">
            <strong>pasted lyrics</strong>
            <textarea
              className="words-textarea words-import-textarea"
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              spellCheck={false}
            />
          </label>
          <div className="words-import-column">
            <strong>section suggestions</strong>
            <div className="words-import-section-list">
              {drafts.map((draft, index) => (
                <div key={`${index}-${draft.title}`} className="words-import-section-card">
                  <div className="words-import-section-head">
                    <select
                      className="words-select-inline"
                      value={draft.type}
                      onChange={(event) =>
                        handleTypeChange(index, event.target.value as SongSectionType)
                      }
                    >
                      <option value="verse">
                        {(sectionDisplayNames[index] ?? '').includes('Verse')
                          ? sectionDisplayNames[index]
                          : 'Verse'}
                      </option>
                      <option value="chorus">
                        {(sectionDisplayNames[index] ?? '').includes('Chorus')
                          ? sectionDisplayNames[index]
                          : 'Chorus'}
                      </option>
                      <option value="bridge">
                        {(sectionDisplayNames[index] ?? '').includes('Bridge')
                          ? sectionDisplayNames[index]
                          : 'Bridge'}
                      </option>
                    </select>
                  </div>
                  <p className="words-import-section-preview">{draft.lyrics}</p>
                  {draft.type === 'chorus' ? (
                    <div className="words-import-link-row">
                      <AppTooltip
                        title={
                          draft.suggestedChorusLink
                            ? 'Identical chorus lyrics linked'
                            : 'Chorus variation detected - lyrics unlinked'
                        }
                      >
                        <button
                          type="button"
                          className={`words-button words-button-icon words-link-toggle words-link-toggle-chorus${
                            draft.suggestedChorusLink ? ' is-linked' : ' is-unlinked'
                          }`}
                          onClick={() =>
                            setDrafts((previous) => {
                              const source = previous[index];
                              if (!source || source.type !== 'chorus') return previous;
                              const nextLinked = !source.suggestedChorusLink;
                              if (!source.normalizedLyrics) {
                                return previous.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, suggestedChorusLink: nextLinked }
                                    : entry
                                );
                              }
                              return previous.map((entry) =>
                                entry.type === 'chorus' &&
                                entry.normalizedLyrics === source.normalizedLyrics
                                  ? { ...entry, suggestedChorusLink: nextLinked }
                                  : entry
                              );
                            })
                          }
                          aria-label="Toggle chorus lyrics linking"
                        >
                          <span className="material-symbols-outlined">
                            {draft.suggestedChorusLink ? 'link' : 'link_off'}
                          </span>
                        </button>
                      </AppTooltip>
                      <span>
                        {draft.suggestedChorusLink
                          ? 'Identical chorus lyrics linked'
                          : 'Chorus variation detected - lyrics unlinked'}
                      </span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="words-import-actions">
          <button type="button" className="words-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="words-button words-button-primary"
            disabled={drafts.length === 0}
            onClick={() => onApply(drafts)}
          >
            Import sections
          </button>
        </div>
      </div>
    </div>
  );
};
