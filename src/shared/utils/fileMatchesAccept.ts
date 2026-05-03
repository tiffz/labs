/** Whether `file` matches an `<input accept>`-style filter (mime globs + extensions). */
export function fileMatchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const tokens = accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  for (const t of tokens) {
    if (t.startsWith('.')) {
      if (fileName.endsWith(t)) return true;
      continue;
    }
    if (t.endsWith('/*')) {
      if (fileType.startsWith(t.slice(0, -1))) return true;
      continue;
    }
    if (t === fileType) return true;
  }
  return false;
}
