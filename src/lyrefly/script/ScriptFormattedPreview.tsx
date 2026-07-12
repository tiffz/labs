import type { ReactElement } from 'react';

import type { ScriptBlock } from '../types';

function ScriptPreviewPageSection({ block }: { block: Extract<ScriptBlock, { type: 'page_section' }> }): ReactElement {
  return (
    <section className="lyrefly-script-preview__page" aria-label={`Page ${block.pageNumber}`}>
      <h2 className="lyrefly-script-preview__page-title">
        Page {block.pageNumber}
        {block.pinnedBeatText ? (
          <span className="lyrefly-script-preview__page-beat">: {block.pinnedBeatText}</span>
        ) : null}
      </h2>
    </section>
  );
}

function ScriptPreviewPanel({ block }: { block: Extract<ScriptBlock, { type: 'panel' }> }): ReactElement {
  return (
    <h3 className="lyrefly-script-preview__panel">
      Panel {block.panelNumber}
      {block.caption ? (
        <span className="lyrefly-script-preview__panel-caption">: {block.caption}</span>
      ) : null}
    </h3>
  );
}

function ScriptPreviewDialogue({ block }: { block: Extract<ScriptBlock, { type: 'dialogue' }> }): ReactElement {
  return (
    <div className="lyrefly-script-preview__dialogue">
      <p className="lyrefly-script-preview__character">{block.character}</p>
      {block.lines.map((line) => (
        <p key={`${block.id}-${line}`} className="lyrefly-script-preview__dialogue-line">
          {line}
        </p>
      ))}
    </div>
  );
}

function ScriptPreviewSfx({ block }: { block: Extract<ScriptBlock, { type: 'sfx' }> }): ReactElement {
  return <p className="lyrefly-script-preview__sfx">{block.text}</p>;
}

function ScriptPreviewNarration({ block }: { block: Extract<ScriptBlock, { type: 'narration' }> }): ReactElement {
  return <p className="lyrefly-script-preview__narration">{block.text}</p>;
}

function ScriptPreviewBeatSheet({ block }: { block: Extract<ScriptBlock, { type: 'beat_sheet_line' }> }): ReactElement {
  return (
    <p className="lyrefly-script-preview__beat">
      Page {block.pageHint ?? '?'}: {block.text}
    </p>
  );
}

function ScriptPreviewBlock({ block }: { block: ScriptBlock }): ReactElement | null {
  switch (block.type) {
    case 'page_section':
      return <ScriptPreviewPageSection block={block} />;
    case 'panel':
      return <ScriptPreviewPanel block={block} />;
    case 'dialogue':
      return <ScriptPreviewDialogue block={block} />;
    case 'sfx':
      return <ScriptPreviewSfx block={block} />;
    case 'narration':
      return <ScriptPreviewNarration block={block} />;
    case 'beat_sheet_line':
      return <ScriptPreviewBeatSheet block={block} />;
    default:
      return null;
  }
}

export type ScriptFormattedPreviewProps = {
  blocks: readonly ScriptBlock[];
};

export function ScriptFormattedPreview({ blocks }: ScriptFormattedPreviewProps): ReactElement {
  if (blocks.length === 0) {
    return (
      <div className="lyrefly-script-preview lyrefly-script-preview--empty" data-testid="lyrefly-script-preview">
        <p className="lyrefly-script-preview__empty-lede">Formatted script</p>
        <p className="lyrefly-script-preview__empty-copy">
          Your professionally formatted script appears here as you write nested bullets on the left.
        </p>
      </div>
    );
  }

  const nodes: ReactElement[] = [];
  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index]!;
    if (block.type === 'page_section') {
      nodes.push(<ScriptPreviewPageSection key={block.id} block={block} />);
      index += 1;
      continue;
    }
    if (block.type === 'panel') {
      const panelBlocks: ScriptBlock[] = [block];
      index += 1;
      while (
        index < blocks.length &&
        blocks[index]!.type !== 'page_section' &&
        blocks[index]!.type !== 'panel'
      ) {
        panelBlocks.push(blocks[index]!);
        index += 1;
      }
      nodes.push(
        <section key={block.id} className="lyrefly-script-preview__panel-group" aria-label={`Panel ${block.panelNumber}`}>
          {panelBlocks.map((panelBlock) => (
            <ScriptPreviewBlock key={panelBlock.id} block={panelBlock} />
          ))}
        </section>,
      );
      continue;
    }
    nodes.push(<ScriptPreviewBlock key={block.id} block={block} />);
    index += 1;
  }

  return (
    <div className="lyrefly-script-preview" data-testid="lyrefly-script-preview">
      {nodes}
    </div>
  );
}
