import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { memo, useEffect, type ReactElement } from 'react';
import { characterNineAnswerToEditorHtml } from '../practice/encorePracticeExerciseModel';

export type EncoreTiptapAnswerFieldProps = {
  value: string;
  onChange: (html: string) => void;
  readOnly: boolean;
  /** Shown when the document is empty (TipTap placeholder). */
  placeholder?: string;
  'aria-label': string;
  sx?: SxProps<Theme>;
};

/**
 * Rich text field for Encore (TipTap + StarterKit: paragraphs, bold, italic, lists).
 * Values are stored as HTML; {@link characterNineAnswerToEditorHtml} migrates legacy plain text.
 */
function EncoreTiptapAnswerFieldInner({
  value,
  onChange,
  readOnly,
  placeholder,
  'aria-label': ariaLabel,
  sx,
}: EncoreTiptapAnswerFieldProps): ReactElement {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Write as much as helps…',
      }),
    ],
    content: characterNineAnswerToEditorHtml(value),
    editable: !readOnly,
    editorProps: {
      attributes: {
        'aria-label': ariaLabel,
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = characterNineAnswerToEditorHtml(value);
    if (editor.getHTML() === next) return;
    editor.commands.setContent(next, false);
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [readOnly, editor]);

  const toolbarIconSx = (active: boolean): SxProps<Theme> => ({
    color: active ? 'primary.main' : 'text.secondary',
    '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, active ? 0.12 : 0.06) },
  });

  return (
    <Box
      sx={[
        (theme) => ({
          border: 1,
          borderStyle: 'solid',
          borderColor: alpha(theme.palette.text.primary, 0.12),
          borderRadius: 0,
          bgcolor: alpha(theme.palette.background.default, 0.35),
          boxShadow: 'none',
          overflow: 'hidden',
          '& .ProseMirror': {
            minHeight: 140,
            maxHeight: 380,
            overflowY: 'auto',
            px: 1.75,
            py: 1.25,
            outline: 'none',
            fontSize: '1.0625rem',
            lineHeight: 1.72,
            letterSpacing: '0.01em',
            fontFamily: theme.typography.body1.fontFamily,
            color: 'text.primary',
            bgcolor: 'transparent',
            '& p': { margin: '0.4em 0' },
            '& p.is-editor-empty:first-child::before': {
              color: alpha(theme.palette.text.secondary, 0.45),
              fontStyle: 'italic',
            },
            '&:focus-visible': {
              outline: 'none',
              boxShadow: `inset 0 -1px 0 0 ${alpha(theme.palette.primary.main, 0.35)}`,
            },
          },
        }),
        ...(sx ? (Array.isArray(sx) ? sx : [sx]) : []),
      ]}
    >
      {!readOnly && editor ? (
        <>
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.25}
            sx={{
              flexWrap: 'wrap',
              px: 0.5,
              pt: 0.35,
              pb: 0.15,
              gap: 0,
              bgcolor: 'transparent',
            }}
          >
            <Tooltip title="Bold">
              <IconButton
                size="small"
                aria-label="Bold"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleBold().run()}
                sx={toolbarIconSx(editor.isActive('bold'))}
              >
                <FormatBoldIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Italic">
              <IconButton
                size="small"
                aria-label="Italic"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                sx={toolbarIconSx(editor.isActive('italic'))}
              >
                <FormatItalicIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Bullet list">
              <IconButton
                size="small"
                aria-label="Bullet list"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                sx={toolbarIconSx(editor.isActive('bulletList'))}
              >
                <FormatListBulletedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Numbered list">
              <IconButton
                size="small"
                aria-label="Numbered list"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                sx={toolbarIconSx(editor.isActive('orderedList'))}
              >
                <FormatListNumberedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </>
      ) : null}
      {editor ? <EditorContent editor={editor} /> : null}
    </Box>
  );
}

export const EncoreTiptapAnswerField = memo(EncoreTiptapAnswerFieldInner);
