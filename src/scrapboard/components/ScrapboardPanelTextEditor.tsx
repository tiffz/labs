import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';
import ArrowUpwardOutlinedIcon from '@mui/icons-material/ArrowUpwardOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import type { ReactElement } from 'react';

import {
  defaultArrangementForCount,
  resolvePanelArrangement,
  resolvePanelSpeakerIds,
  slotForSpeakerIndex,
  SFX_LOUDNESS_LEVELS,
  type PanelBackgroundImage,
  type PanelTextBlock,
  type SfxLoudness,
} from '../../shared/comic';
import { LabsWikimediaImageField, type LabsWikimediaImageResult } from '../../shared/media';
import type { ScrapboardBoardState } from '../hooks/useScrapboardBoard';
import { ScrapboardArrangementField } from './ScrapboardArrangementField';
import { ScrapboardScopeActions } from './ScrapboardScopeActions';

export type ScrapboardPanelTextEditorProps = {
  board: ScrapboardBoardState;
};

function blockKey(block: PanelTextBlock, index: number): string {
  return `${block.kind}-${index}`;
}

function blockTypeTag(block: PanelTextBlock): string {
  if (block.kind === 'caption') return 'Cap';
  if (block.kind === 'sfx') return 'SFX';
  return '';
}

export function ScrapboardPanelTextEditor({ board }: ScrapboardPanelTextEditorProps): ReactElement {
  const {
    layout,
    fills,
    cast,
    selectedPanelIndex,
    setSelectedPanelIndex,
    setPanelBlocks,
    setPanelSpeakers,
    setPanelArrangement,
    setPanelBackgroundImage,
    randomizeLocks,
    toggleRandomizeLock,
    randomizePanelCopy,
    randomizePanelStaging,
    randomizePhotos,
  } = board;
  const fill = fills.find((row) => row.panelIndex === selectedPanelIndex);
  const blocks = fill?.blocks ?? [];
  const panelBackground = fill?.backgroundImage ?? null;
  const speakerIds = resolvePanelSpeakerIds(fill, cast);
  const arrangement = resolvePanelArrangement(fill, speakerIds.length || 1);

  const onSelectPanelPhoto = (result: LabsWikimediaImageResult): void => {
    const image: PanelBackgroundImage = {
      url: result.url,
      thumbUrl: result.thumbUrl,
      title: result.title,
      license: result.license,
    };
    setPanelBackgroundImage(selectedPanelIndex, image);
  };

  const updateBlocks = (next: PanelTextBlock[]): void => {
    setPanelBlocks(selectedPanelIndex, next);
  };

  const updateBlock = (index: number, patch: Partial<PanelTextBlock>): void => {
    const next = blocks.map((block, rowIndex) =>
      rowIndex === index ? ({ ...block, ...patch } as PanelTextBlock) : block,
    );
    updateBlocks(next);
  };

  const defaultCastMemberId = speakerIds[0] ?? cast[0]?.id;
  const lastDialogueCastId = [...blocks]
    .reverse()
    .find((block): block is Extract<PanelTextBlock, { kind: 'dialogue' }> => block.kind === 'dialogue')
    ?.castMemberId;

  const addBlock = (block: PanelTextBlock): void => {
    updateBlocks([...blocks, block]);
  };

  const removeBlock = (index: number): void => {
    updateBlocks(blocks.filter((_, rowIndex) => rowIndex !== index));
  };

  const moveBlock = (index: number, direction: -1 | 1): void => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row!);
    updateBlocks(next);
  };

  const toggleSpeaker = (castId: string): void => {
    if (speakerIds.includes(castId)) {
      if (speakerIds.length <= 1) return;
      setPanelSpeakers(
        selectedPanelIndex,
        speakerIds.filter((id) => id !== castId),
      );
      return;
    }
    if (speakerIds.length >= 3) return;
    setPanelSpeakers(selectedPanelIndex, [...speakerIds, castId]);
  };

  const assignDialogueSpeaker = (blockIndex: number, castMemberId: string): void => {
    const speakerIndex = speakerIds.indexOf(castMemberId);
    let nextSpeakers = speakerIds;
    if (speakerIndex < 0) {
      if (speakerIds.length >= 3) return;
      nextSpeakers = [...speakerIds, castMemberId];
      setPanelSpeakers(selectedPanelIndex, nextSpeakers);
    }
    const slotIndex = Math.max(0, nextSpeakers.indexOf(castMemberId));
    updateBlock(blockIndex, {
      castMemberId,
      characterId: slotForSpeakerIndex(slotIndex),
    });
  };

  return (
    <section className="scrapboard-panel-text scrapboard-controls__section" data-testid="scrapboard-panel-text">
      <h2 className="scrapboard-section-title">Panel {selectedPanelIndex + 1}</h2>
      <p className="scrapboard-section-hint">Click a panel on the page, or pick a tab.</p>

      <div className="scrapboard-panel-tabs" role="tablist" aria-label="Panels">
        {layout.panels.map((_, index) => {
          const active = index === selectedPanelIndex;
          return (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={active}
              className={['scrapboard-panel-tab', active ? 'scrapboard-panel-tab--active' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => setSelectedPanelIndex(index)}
              data-testid={`scrapboard-panel-tab-${index}`}
            >
              P{index + 1}
            </button>
          );
        })}
      </div>

      <div className="scrapboard-panel-speakers" data-testid="scrapboard-panel-speakers">
        <div className="scrapboard-section-title-row">
          <span className="scrapboard-section-title">Who’s here</span>
          <ScrapboardScopeActions
            scopeLabel="cast & arrangement"
            locked={randomizeLocks.staging}
            onToggleLock={() => toggleRandomizeLock('staging')}
            onRandomize={() => randomizePanelStaging(selectedPanelIndex)}
            testIdPrefix="scrapboard-panel-staging"
            density="plain"
          />
        </div>
        <div className="scrapboard-panel-speakers__chips" role="group" aria-label="Panel cast">
          {cast.map((member) => {
            const active = speakerIds.includes(member.id);
            return (
              <button
                key={member.id}
                type="button"
                className={[
                  'scrapboard-cast-chip',
                  active ? 'scrapboard-cast-chip--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={active}
                title={member.label ?? member.emoji}
                data-testid={`scrapboard-panel-speaker-${member.id}`}
                onClick={() => toggleSpeaker(member.id)}
              >
                <span className="scrapboard-emoji scrapboard-emoji--sm" aria-hidden>
                  {member.emoji}
                </span>
                <span className="scrapboard-cast-chip__label">{member.label ?? ''}</span>
              </button>
            );
          })}
        </div>
        <p className="scrapboard-section-hint">Up to 3 characters per panel.</p>
      </div>

      <ScrapboardArrangementField
        speakerCount={speakerIds.length || 1}
        value={arrangement ?? defaultArrangementForCount(speakerIds.length || 1)}
        onChange={(next) => setPanelArrangement(selectedPanelIndex, next)}
      />

      <div className="scrapboard-section-title-row">
        <span className="scrapboard-section-title">Lines</span>
        <ScrapboardScopeActions
          scopeLabel="panel copy"
          locked={randomizeLocks.copy}
          onToggleLock={() => toggleRandomizeLock('copy')}
          onRandomize={() => randomizePanelCopy(selectedPanelIndex)}
          testIdPrefix="scrapboard-panel-copy"
          density="plain"
        />
      </div>

      <div className="scrapboard-text-blocks">
        {blocks.length === 0 ? (
          <p className="scrapboard-text-empty">Add lines below. Order matches read order on the panel.</p>
        ) : null}
        {blocks.map((block, index) => (
          <div
            key={blockKey(block, index)}
            className="scrapboard-text-block scrapboard-text-block--compact"
            data-testid={`scrapboard-text-block-${index}`}
          >
            <div className="scrapboard-text-block__meta">
              <span className="scrapboard-text-block__order" title="Reading order">
                {index + 1}
              </span>

              {block.kind === 'dialogue' ? (
                <div className="scrapboard-speaker-chips" role="radiogroup" aria-label="Speaker">
                  {cast.map((member) => {
                    const active = block.castMemberId === member.id;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={[
                          'scrapboard-speaker-chip',
                          'scrapboard-speaker-chip--emoji',
                          active ? 'scrapboard-speaker-chip--active' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => assignDialogueSpeaker(index, member.id)}
                        data-testid={`scrapboard-dialogue-character-${index}-${member.id}`}
                        title={member.label ?? member.emoji}
                      >
                        <span className="scrapboard-emoji scrapboard-emoji--sm" aria-hidden>
                          {member.emoji}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span className="scrapboard-text-block__type">{blockTypeTag(block)}</span>
              )}

              <div className="scrapboard-text-block__actions">
                <IconButton
                  size="small"
                  aria-label="Move earlier"
                  disabled={index === 0}
                  onClick={() => moveBlock(index, -1)}
                >
                  <ArrowUpwardOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Move later"
                  disabled={index === blocks.length - 1}
                  onClick={() => moveBlock(index, 1)}
                >
                  <ArrowDownwardOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" aria-label="Remove" onClick={() => removeBlock(index)}>
                  <DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </div>
            </div>

            {block.kind === 'dialogue' ? (
              <textarea
                className="scrapboard-inline-input"
                rows={3}
                value={block.content}
                placeholder="Dialogue…"
                onChange={(event) => updateBlock(index, { content: event.target.value })}
                data-testid={`scrapboard-dialogue-text-${index}`}
              />
            ) : null}

            {block.kind === 'caption' ? (
              <textarea
                className="scrapboard-inline-input scrapboard-inline-input--caption"
                rows={2}
                value={block.content}
                placeholder="Caption…"
                onChange={(event) => updateBlock(index, { content: event.target.value })}
                data-testid={`scrapboard-caption-text-${index}`}
              />
            ) : null}

            {block.kind === 'sfx' ? (
              <div className="scrapboard-text-block__sfx-row">
                <input
                  type="text"
                  className="scrapboard-inline-input scrapboard-inline-input--sfx"
                  value={block.content}
                  placeholder="POW!"
                  onChange={(event) => updateBlock(index, { content: event.target.value })}
                  data-testid={`scrapboard-sfx-text-${index}`}
                />
                <div className="scrapboard-sfx-loudness" role="radiogroup" aria-label="SFX loudness">
                  {SFX_LOUDNESS_LEVELS.map((level) => {
                    const active = (block.loudness ?? 'normal') === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={[
                          'scrapboard-sfx-loudness__chip',
                          active ? 'scrapboard-sfx-loudness__chip--active' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => updateBlock(index, { loudness: level as SfxLoudness })}
                        data-testid={`scrapboard-sfx-loudness-${index}-${level}`}
                        title={`SFX ${level}`}
                      >
                        {level === 'quiet' ? 'Q' : level === 'loud' ? 'L' : 'N'}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="scrapboard-text-add scrapboard-text-add--compact">
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={() => {
            const castMemberId = lastDialogueCastId ?? defaultCastMemberId;
            const slotIndex = Math.max(0, speakerIds.indexOf(castMemberId ?? ''));
            addBlock({
              kind: 'dialogue',
              characterId: slotForSpeakerIndex(slotIndex),
              castMemberId,
              content: '',
            });
          }}
          data-testid="scrapboard-add-dialogue"
        >
          Line
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => addBlock({ kind: 'caption', content: '' })}
          data-testid="scrapboard-add-caption"
        >
          Cap
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => addBlock({ kind: 'sfx', content: '', loudness: 'normal' })}
          data-testid="scrapboard-add-sfx"
        >
          SFX
        </Button>
      </div>

      <div className="scrapboard-panel-photo" data-testid="scrapboard-panel-photo">
        <div className="scrapboard-section-title-row">
          <span className="scrapboard-section-title">Background photo</span>
          <ScrapboardScopeActions
            scopeLabel="photos"
            locked={randomizeLocks.photos}
            onToggleLock={() => toggleRandomizeLock('photos')}
            onRandomize={randomizePhotos}
            testIdPrefix="scrapboard-panel-photos"
            density="plain"
          />
        </div>
        <LabsWikimediaImageField
          variant="sketchy"
          label=""
          hint="Wikimedia scenery, softly tinted. Prefer photos over empty panels."
          value={
            panelBackground
              ? {
                  url: panelBackground.url,
                  thumbUrl: panelBackground.thumbUrl,
                  title: panelBackground.title ?? 'Photo',
                  license: panelBackground.license,
                }
              : null
          }
          onSelectImage={onSelectPanelPhoto}
          onClear={() => setPanelBackgroundImage(selectedPanelIndex, null)}
        />
      </div>
    </section>
  );
}
