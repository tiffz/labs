import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { normalizeRichTextLinkHref, plainOrHtmlToEditorHtml } from '../utils/richTextContent';
import RichTextLinkHoverPopover from './RichTextLinkHoverPopover';
import { selectLinkDomRange, useRichTextLinkHover } from './useRichTextLinkHover';
import './richTextEditor.css';

function isSafeRichTextLinkHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || /^mailto:/i.test(href);
}

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  /** Shown when the document is empty (TipTap placeholder). */
  placeholder?: string;
  /** When this returns true, default paste is cancelled (e.g. chord chart import). */
  onPastePlainText?: (text: string) => boolean;
  'aria-label': string;
  className?: string;
  sx?: SxProps<Theme>;
};

/**
 * Shared TipTap rich text field (paragraphs, bold, italic, lists, links). Values are stored as HTML;
 * {@link plainOrHtmlToEditorHtml} migrates legacy plain text on load.
 */
function RichTextEditorInner({
  value,
  onChange,
  readOnly = false,
  placeholder,
  onPastePlainText,
  'aria-label': ariaLabel,
  className,
  sx,
}: RichTextEditorProps): ReactElement {
  const [linkAnchor, setLinkAnchor] = useState<HTMLElement | null>(null);
  const [linkDraft, setLinkDraft] = useState('');
  const linkHoverPopoverRef = useRef<HTMLDivElement | null>(null);
  const onPastePlainTextRef = useRef(onPastePlainText);
  onPastePlainTextRef.current = onPastePlainText;

  const extensions = useMemo(
    () => [
      StarterKit.configure({ heading: false }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Write as much as helps…',
      }),
      Link.configure({
        openOnClick: readOnly,
        autolink: !readOnly,
        linkOnPaste: !readOnly,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    ],
    [placeholder, readOnly],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      content: plainOrHtmlToEditorHtml(value),
      editable: !readOnly,
      editorProps: {
        attributes: {
          'aria-label': ariaLabel,
          spellcheck: 'true',
          class: 'shared-rich-text-surface',
        },
        handlePaste: (_view, event) => {
          if (readOnly) return false;
          const handler = onPastePlainTextRef.current;
          if (!handler) return false;
          const raw = event.clipboardData?.getData('text/plain') ?? '';
          if (!raw.trim()) return false;
          if (handler(raw)) {
            event.preventDefault();
            return true;
          }
          return false;
        },
        handleClick: (view, _pos, event) => {
          const target = event.target;
          if (!(target instanceof Element)) return false;
          const anchor = target.closest('a[href]');
          if (!anchor) return false;
          const href = anchor.getAttribute('href')?.trim() ?? '';
          if (!isSafeRichTextLinkHref(href)) return false;
          if (!view.editable || event.metaKey || event.ctrlKey || event.button === 1) {
            window.open(href, '_blank', 'noopener,noreferrer');
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChange(ed.getHTML());
      },
    },
    [extensions],
  );

  useEffect(() => {
    if (!editor) return;
    const next = plainOrHtmlToEditorHtml(value);
    if (editor.getHTML() === next) return;
    editor.commands.setContent(next, false);
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [readOnly, editor]);

  const { hover: linkHover, cancelPendingHide, scheduleHide, dismiss: dismissLinkHover } =
    useRichTextLinkHover(editor, linkHoverPopoverRef);

  const openLinkPopover = useCallback(
    (anchor: HTMLElement) => {
      if (!editor) return;
      const href = String(editor.getAttributes('link').href ?? '');
      setLinkDraft(href);
      setLinkAnchor(anchor);
    },
    [editor],
  );

  const closeLinkPopover = useCallback(() => {
    setLinkAnchor(null);
  }, []);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const href = normalizeRichTextLinkHref(linkDraft);
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    }
    closeLinkPopover();
  }, [closeLinkPopover, editor, linkDraft]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    closeLinkPopover();
  }, [closeLinkPopover, editor]);

  const toolbarIconSx = (active: boolean): SxProps<Theme> => ({
    color: active ? 'primary.main' : 'text.secondary',
    '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, active ? 0.12 : 0.06) },
  });

  const linkActive = editor?.isActive('link') ?? false;

  return (
    <Box
      className={['shared-rich-text-editor', className].filter(Boolean).join(' ')}
      sx={[
        (theme) => ({
          border: 1,
          borderStyle: 'solid',
          borderColor: alpha(theme.palette.text.primary, 0.12),
          borderRadius: `${theme.shape.borderRadius}px`,
          bgcolor: alpha(theme.palette.background.default, 0.35),
          boxShadow: 'none',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          '& .shared-rich-text-surface': {
            flex: 1,
            minHeight: 140,
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
            '& a': {
              color: theme.palette.primary.main,
              textDecoration: 'underline',
              textUnderlineOffset: '0.12em',
              cursor: 'pointer',
            },
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
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.25}
          className="shared-rich-text-toolbar"
          sx={{
            flexWrap: 'wrap',
            px: 0.5,
            pt: 0.35,
            pb: 0.15,
            gap: 0,
            bgcolor: 'transparent',
            flexShrink: 0,
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
          <Tooltip title={linkActive ? 'Edit link' : 'Add link'}>
            <IconButton
              size="small"
              aria-label={linkActive ? 'Edit link' : 'Add link'}
              aria-expanded={Boolean(linkAnchor)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => openLinkPopover(e.currentTarget)}
              sx={toolbarIconSx(linkActive)}
            >
              <LinkIcon fontSize="small" />
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
          <Popover
            open={Boolean(linkAnchor)}
            anchorEl={linkAnchor}
            onClose={closeLinkPopover}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{ paper: { sx: { p: 1.5, width: 280 } } }}
          >
            <Stack spacing={1.25}>
              <TextField
                size="small"
                label="Link URL"
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                placeholder="https://…"
                fullWidth
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                  }
                }}
              />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {linkActive ? (
                  <Button size="small" color="inherit" startIcon={<LinkOffIcon fontSize="small" />} onClick={removeLink}>
                    Remove
                  </Button>
                ) : null}
                <Button size="small" onClick={closeLinkPopover}>
                  Cancel
                </Button>
                <Button size="small" variant="contained" onClick={applyLink}>
                  Apply
                </Button>
              </Stack>
            </Stack>
          </Popover>
        </Stack>
      ) : null}
      {editor ? <EditorContent editor={editor} /> : null}
      {editor ? (
        <RichTextLinkHoverPopover
          hover={linkHover}
          popoverRef={linkHoverPopoverRef}
          readOnly={readOnly}
          onClose={dismissLinkHover}
          onPopoverEnter={cancelPendingHide}
          onPopoverLeave={scheduleHide}
          onEdit={
            readOnly || !linkHover
              ? undefined
              : () => {
                  selectLinkDomRange(editor, linkHover.anchorEl);
                  openLinkPopover(linkHover.anchorEl);
                  dismissLinkHover();
                }
          }
        />
      ) : null}
    </Box>
  );
}

export const RichTextEditor = memo(RichTextEditorInner);
