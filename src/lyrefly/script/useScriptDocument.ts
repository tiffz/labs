import type { ScriptBlock } from '../types';
import { DEFAULT_SCRIPT_HTML } from './defaultScriptSample';
import { isScriptHtmlContent, parseScriptHtml } from './scriptHtmlParser';
import { parseScriptMarkdown } from './scriptLineParser';
import { analyzeScriptPacing } from './scriptPacingAnalyzer';
import { lyreflyDb, markLyreflyDirtyRow } from '../db/lyreflyDb';
import { notifyLyreflyLocalChange } from '../db/lyreflyChangeBus';
import type { ScriptDocument } from '../types';

export interface ParsedScriptResult {
  blocks: ScriptBlock[];
  pacingWarnings: ReturnType<typeof analyzeScriptPacing>;
}

export function parseAndAnalyzeScript(markdownOrHtml: string): ParsedScriptResult {
  const blocks = isScriptHtmlContent(markdownOrHtml)
    ? parseScriptHtml(markdownOrHtml)
    : parseScriptMarkdown(markdownOrHtml);
  const pacingWarnings = analyzeScriptPacing(blocks);
  return { blocks, pacingWarnings };
}

export async function loadScriptDocument(documentId: string): Promise<ScriptDocument | undefined> {
  return lyreflyDb.scriptDocuments.get(documentId);
}

export async function saveScriptDocument(
  doc: ScriptDocument,
  options?: { notifySync?: boolean },
): Promise<ScriptDocument> {
  const { blocks, pacingWarnings } = parseAndAnalyzeScript(doc.markdown);
  const updated: ScriptDocument = {
    ...doc,
    blocks,
    pacingWarnings,
    updatedAt: new Date().toISOString(),
  };
  await lyreflyDb.scriptDocuments.put(updated);
  await markLyreflyDirtyRow('script', updated.id, 'upsert', updated.projectId);
  if (options?.notifySync !== false) {
    notifyLyreflyLocalChange();
  }
  return updated;
}

export async function ensureScriptDocumentForProject(
  projectId: string,
  scriptDocumentId: string,
): Promise<ScriptDocument> {
  const existing = await lyreflyDb.scriptDocuments.get(scriptDocumentId);
  if (existing) return existing;
  const { blocks, pacingWarnings } = parseAndAnalyzeScript(DEFAULT_SCRIPT_HTML);
  const created: ScriptDocument = {
    id: scriptDocumentId,
    projectId,
    markdown: DEFAULT_SCRIPT_HTML,
    blocks,
    pacingWarnings,
    updatedAt: new Date().toISOString(),
  };
  await lyreflyDb.scriptDocuments.put(created);
  return created;
}
