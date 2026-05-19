import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export type StanzaSongTitleEditorProps = {
  title: string;
  onCommit: (nextTitle: string) => void;
};

/**
 * Viewer header title: click to edit in place. Typography lives on `.stanza-song-title-heading`
 * so resting and editing states stay pixel-aligned.
 */
export default function StanzaSongTitleEditor({ title, onCommit }: StanzaSongTitleEditorProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditing(false);
    setDraft(title);
  }, [title]);

  const syncTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    if (!editing) return;
    syncTextareaHeight();
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [editing, syncTextareaHeight]);

  const cancel = useCallback(() => {
    setDraft(title);
    setEditing(false);
  }, [title]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === title) {
      setDraft(title);
      return;
    }
    onCommit(trimmed);
  }, [draft, onCommit, title]);

  const startEditing = useCallback(() => {
    setDraft(title);
    setEditing(true);
  }, [title]);

  return (
    <h1 className="stanza-song-title-heading">
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          rows={1}
          aria-label="Song title"
          className="stanza-song-title-field"
          onChange={(e) => {
            setDraft(e.target.value);
            syncTextareaHeight();
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
        />
      ) : (
        <button type="button" className="stanza-song-title-field" onClick={startEditing} title="Click to rename">
          {title}
        </button>
      )}
    </h1>
  );
}
