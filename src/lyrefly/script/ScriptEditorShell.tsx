import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import type { ComicProject, ScriptDocument } from '../types';
import { ScriptFormattedPreview } from './ScriptFormattedPreview';
import { ScriptPacingMeter } from './ScriptPacingMeter';
import { ScriptRichTextEditor } from './ScriptRichTextEditor';
import { DEFAULT_SCRIPT_HTML } from './defaultScriptSample';
import { isScriptContentEmpty } from './scriptEmpty';
import { parseAndAnalyzeScript, saveScriptDocument } from './useScriptDocument';

export type ScriptEditorShellProps = {
  project: ComicProject;
  document: ScriptDocument;
  onDocumentSaved: (doc: ScriptDocument) => void;
  variant?: 'standalone' | 'embedded';
};

const AUTOSAVE_MS = 600;

export function ScriptEditorShell({
  project,
  document,
  onDocumentSaved,
  variant = 'embedded',
}: ScriptEditorShellProps): ReactElement {
  const { push, clear } = useLabsUndo();
  const [localHtml, setLocalHtml] = useState(document.markdown);
  const [committedHtml, setCommittedHtml] = useState(document.markdown);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  const loadedDocumentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loadedDocumentIdRef.current === document.id) return;
    loadedDocumentIdRef.current = document.id;
    setLocalHtml(document.markdown);
    setCommittedHtml(document.markdown);
    clear();
  }, [document.id, document.markdown, clear]);

  const parsed = useMemo(() => parseAndAnalyzeScript(localHtml), [localHtml]);
  const showPacing = parsed.pacingWarnings.length > 0;
  const scriptIsEmpty = useMemo(() => isScriptContentEmpty(localHtml), [localHtml]);

  const persistHtml = useCallback(
    async (html: string, recordUndo: boolean): Promise<void> => {
      const previous = committedHtml;
      setSaving(true);
      try {
        const saved = await saveScriptDocument({ ...document, markdown: html });
        setLocalHtml(html);
        setCommittedHtml(html);
        onDocumentSaved(saved);
        if (recordUndo) {
          push({
            undo: () => {
              void persistHtml(previous, false);
            },
            redo: () => {
              void persistHtml(html, false);
            },
          });
        }
      } finally {
        setSaving(false);
      }
    },
    [committedHtml, document, onDocumentSaved, push],
  );

  const scheduleSave = useCallback(
    (html: string) => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        if (html !== committedHtml) {
          void persistHtml(html, true);
        }
        saveTimerRef.current = null;
      }, AUTOSAVE_MS);
    },
    [committedHtml, persistHtml],
  );

  const onInsertSampleScript = (): void => {
    void persistHtml(DEFAULT_SCRIPT_HTML, true);
  };

  const handleChange = (html: string): void => {
    setLocalHtml(html);
    scheduleSave(html);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

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
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '48rem', lineHeight: 1.55 }}>
          Nested bullets on the left; formatted script on the right. Tab to indent pages → panels → lines.
        </Typography>
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
          <Typography component="h3" className="lyrefly-script-split__label">
            Source
          </Typography>
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
