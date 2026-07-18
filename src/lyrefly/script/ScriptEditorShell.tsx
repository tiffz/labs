import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';
import type { ReactElement } from 'react';

import type { ComicProject, ScriptDocument } from '../types';
import { ScriptFormatHelp } from './ScriptFormatHelp';
import { ScriptFormattedPreview } from './ScriptFormattedPreview';
import { ScriptPacingMeter } from './ScriptPacingMeter';
import { ScriptRichTextEditor } from './ScriptRichTextEditor';
import { DEFAULT_SCRIPT_HTML } from './defaultScriptSample';
import { isScriptContentEmpty } from './scriptEmpty';
import { parseAndAnalyzeScript } from './useScriptDocument';
import { useScriptAutosave } from './useScriptAutosave';

export type ScriptEditorShellProps = {
  project: ComicProject;
  document: ScriptDocument;
  onDocumentSaved: (doc: ScriptDocument) => void;
  variant?: 'standalone' | 'embedded';
};

export function ScriptEditorShell({
  project,
  document,
  onDocumentSaved,
  variant = 'embedded',
}: ScriptEditorShellProps): ReactElement {
  const { localHtml, saving, handleChange, persistNow } = useScriptAutosave(document, onDocumentSaved);

  const parsed = useMemo(() => parseAndAnalyzeScript(localHtml), [localHtml]);
  const showPacing = parsed.pacingWarnings.length > 0;
  const scriptIsEmpty = useMemo(() => isScriptContentEmpty(localHtml), [localHtml]);

  const onInsertSampleScript = (): void => {
    void persistNow(DEFAULT_SCRIPT_HTML);
  };

  return (
    <Box
      className={[
        'lyrefly-script-editor-shell',
        variant === 'embedded' ? 'lyrefly-stage-body' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="lyrefly-script-editor"
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {variant !== 'embedded' ? (
        <Typography variant="subtitle1" component="h2" sx={{ mb: 1 }}>
          Script: {project.title}
        </Typography>
      ) : null}

      <Stack spacing={0.75} className="lyrefly-script-editor-shell__intro">
        {scriptIsEmpty ? (
          <Box className="lyrefly-script-empty-banner" data-testid="lyrefly-script-empty-banner">
            <Typography variant="body2" color="text.secondary">
              Start from a sample script to see the page → panel → line format.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={onInsertSampleScript}
              data-testid="lyrefly-insert-sample-script"
            >
              Insert sample script
            </Button>
          </Box>
        ) : null}
        <Typography
          variant="caption"
          color="text.secondary"
          className="lyrefly-script-editor-shell__status"
          aria-live="polite"
        >
          {saving ? 'Saving…' : '\u00a0'}
        </Typography>
      </Stack>

      <Box className="lyrefly-script-split">
        <Box className="lyrefly-script-split__column lyrefly-script-split__source">
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.25}
            className="lyrefly-script-split__label-row"
          >
            <Typography component="h3" className="lyrefly-script-split__label">
              Source
            </Typography>
            <ScriptFormatHelp />
          </Stack>
          <Box className="lyrefly-script-split__editor">
            <ScriptRichTextEditor value={localHtml} onChange={handleChange} />
          </Box>
        </Box>

        <Box className="lyrefly-script-split__column lyrefly-script-split__preview">
          <Typography component="h3" className="lyrefly-script-split__label">
            Formatted script
          </Typography>
          <Box className="lyrefly-script-split__preview-scroll">
            <ScriptFormattedPreview blocks={parsed.blocks} />
          </Box>
          <Box
            className={[
              'lyrefly-script-split__pacing',
              showPacing ? 'lyrefly-script-split__pacing--visible' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={!showPacing}
          >
            <ScriptPacingMeter warnings={parsed.pacingWarnings} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
