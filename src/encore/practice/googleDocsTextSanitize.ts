/** Strip characters Google Docs insertText rejects (BMP PUA / C0 controls). */
export function sanitizeTextForGoogleDocsInsert(text: string): string {
  const stripControls = (s: string) => {
    let out = '';
    for (let i = 0; i < s.length; i += 1) {
      const code = s.charCodeAt(i);
      if (code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31)) continue;
      if (code >= 0xe000 && code <= 0xf8ff) continue;
      out += s[i]!;
    }
    return out;
  };
  return stripControls(text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
}
