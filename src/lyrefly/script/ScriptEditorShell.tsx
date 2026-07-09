import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { isRichTextEmpty } from '../../shared/utils/richTextContent';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import type { ComicProject, ScriptDocument } from '../types';
import { ScriptPacingMeter } from './ScriptPacingMeter';
import { ScriptRichTextEditor } from './ScriptRichTextEditor';
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
  const theme = useTheme();
  const { push, clear } = useLabsUndo();
  const [localHtml, setLocalHtml] = useState(document.markdown);
  const [committedHtml, setCommittedHtml] = useState(document.markdown);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalHtml(document.markdown);
    setCommittedHtml(document.markdown);
    clear();
  }, [document.id, document.markdown, clear]);

  const parsed = useMemo(() => parseAndAnalyzeScript(localHtml), [localHtml]);
  const showPacing = parsed.pacingWarnings.length > 0;

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

  const isEmpty = isRichTextEmpty(localHtml);

  return (
    <Box
      className="lyrefly-script-editor-shell"
      data-testid="lyrefly-script-editor"
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        p: variant === 'embedded' ? { xs: 2, sm: 2.5 } : 0,
      }}
    >
      {variant !== 'embedded' ? (
        <Typography variant="subtitle1" component="h2" sx={{ mb: 1 }}>
          Script — {project.title}
        </Typography>
      ) : null}

      <Stack spacing={1} sx={{ mb: 1.5, flexShrink: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '42rem', lineHeight: 1.6 }}>
          Nested bullets, like a Google Doc: <strong>page</strong> → <strong>panel</strong> → action or{' '}
          <strong>CHARACTER: line</strong>. Tab to indent, Shift+Tab to outdent. No special markup required.
        </Typography>
        {isEmpty ? (
          <Typography variant="caption" color="text.secondary">
            Tip: toolbar bullet list, then Tab inside a page to add panels.
          </Typography>
        ) : null}
        {saving ? (
          <Typography variant="caption" color="text.secondary">
            Saving…
          </Typography>
        ) : null}
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <ScriptRichTextEditor value={localHtml} onChange={handleChange} disabled={saving} />
      </Box>

      <Collapse in={showPacing}>
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.warning.main, 0.08),
            border: 1,
            borderColor: alpha(theme.palette.warning.main, 0.2),
          }}
        >
          <ScriptPacingMeter warnings={parsed.pacingWarnings} />
        </Box>
      </Collapse>
    </Box>
  );
}
