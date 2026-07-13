import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';
import ArrowUpwardOutlinedIcon from '@mui/icons-material/ArrowUpwardOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import type { ReactElement } from 'react';

import { PANEL_CHARACTER_IDS, type PanelTextBlock } from '../../shared/comic';
import type { ScrapboardBoardState } from '../hooks/useScrapboardBoard';

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
  const { layout, fills, selectedPanelIndex, setSelectedPanelIndex, setPanelBlocks } = board;
  const fill = fills.find((row) => row.panelIndex === selectedPanelIndex);
  const blocks = fill?.blocks ?? [];

  const updateBlocks = (next: PanelTextBlock[]): void => {
    setPanelBlocks(selectedPanelIndex, next);
  };

  const updateBlock = (index: number, patch: Partial<PanelTextBlock>): void => {
    const next = blocks.map((block, rowIndex) =>
      rowIndex === index ? ({ ...block, ...patch } as PanelTextBlock) : block,
    );
    updateBlocks(next);
  };

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

  return (
    <section className="scrapboard-panel-text scrapboard-controls__section" data-testid="scrapboard-panel-text">
      <h2 className="scrapboard-section-title">Panel copy</h2>

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
            <div className="scrapboard-text-block__inline">
              <span className="scrapboard-text-block__order" title="Reading order">
                {index + 1}
              </span>

              {block.kind === 'dialogue' ? (
                <div className="scrapboard-speaker-chips" role="radiogroup" aria-label="Speaker">
                  {PANEL_CHARACTER_IDS.map((id) => {
                    const active = block.characterId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={[
                          'scrapboard-speaker-chip',
                          active ? 'scrapboard-speaker-chip--active' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => updateBlock(index, { characterId: id })}
                        data-testid={`scrapboard-dialogue-character-${index}-${id}`}
                      >
                        {id.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <span className="scrapboard-text-block__type">{blockTypeTag(block)}</span>
              )}

              {block.kind === 'dialogue' ? (
                <textarea
                  className="scrapboard-inline-input"
                  rows={2}
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
                <input
                  type="text"
                  className="scrapboard-inline-input scrapboard-inline-input--sfx"
                  value={block.content}
                  placeholder="POW!"
                  onChange={(event) => updateBlock(index, { content: event.target.value })}
                  data-testid={`scrapboard-sfx-text-${index}`}
                />
              ) : null}

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
          </div>
        ))}
      </div>

      <div className="scrapboard-text-add scrapboard-text-add--compact">
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={() => addBlock({ kind: 'dialogue', characterId: 'a', content: '' })}
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
          onClick={() => addBlock({ kind: 'sfx', content: '' })}
          data-testid="scrapboard-add-sfx"
        >
          SFX
        </Button>
      </div>
    </section>
  );
}
