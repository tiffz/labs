import {
  getBookletPageLabel,
  labelToBookletPageNumber,
  spreadLabelsToPagePair,
} from '../../shared/zine/bookletPageLabels';
import type { ParsedPageFile } from '../../shared/zine/pageFileParser';
import type { PageNode } from '../types';

function normalizePageLabel(label: string): string {
  return label.trim().toLowerCase();
}

function pageNodeBookletNumber(node: PageNode): number | null {
  if (node.isSpread) {
    const pair = spreadLabelsToPagePair(node.displayName ?? '');
    return pair?.[0] ?? null;
  }
  return labelToBookletPageNumber(node.displayName ?? '');
}

function spreadDisplayName(left: number, right: number): string {
  return `${getBookletPageLabel(left)} - ${getBookletPageLabel(right)}`;
}

/** Match a parsed upload file to an existing page node by Mixam-style identity. */
export function findPageNodeForParsedFile(
  parsed: ParsedPageFile,
  pageNodes: readonly PageNode[],
): PageNode | undefined {
  if (parsed.isSpread && parsed.spreadPages) {
    const [left, right] = parsed.spreadPages;
    const expected = spreadDisplayName(left, right);
    const normalizedExpected = normalizePageLabel(expected);
    return pageNodes.find((node) => {
      if (!node.isSpread) return false;
      const name = node.displayName ?? '';
      if (normalizePageLabel(name) === normalizedExpected) return true;
      const pair = spreadLabelsToPagePair(name);
      return pair?.[0] === left && pair?.[1] === right;
    });
  }

  if (parsed.pageNumber !== null) {
    const expected = getBookletPageLabel(parsed.pageNumber);
    const normalizedExpected = normalizePageLabel(expected);
    return pageNodes.find((node) => {
      if (node.isSpread) return false;
      const name = node.displayName ?? '';
      if (normalizePageLabel(name) === normalizedExpected) return true;
      return pageNodeBookletNumber(node) === parsed.pageNumber;
    });
  }

  const stem = parsed.originalName.replace(/\.[^/.]+$/, '').trim().toLowerCase();
  if (!stem) return undefined;
  return pageNodes.find((node) => normalizePageLabel(node.displayName ?? '').includes(stem));
}

export type ParsedFilePageMatch = {
  parsed: ParsedPageFile;
  node: PageNode;
};

/** Pair parsed files with page nodes by filename identity (not grid index). */
export function matchParsedFilesToPageNodes(
  parsedFiles: readonly ParsedPageFile[],
  pageNodes: readonly PageNode[],
): { matches: ParsedFilePageMatch[]; unmatchedFiles: ParsedPageFile[] } {
  const usedNodeIds = new Set<string>();
  const matches: ParsedFilePageMatch[] = [];
  const unmatchedFiles: ParsedPageFile[] = [];

  for (const parsed of parsedFiles) {
    const node = findPageNodeForParsedFile(
      parsed,
      pageNodes.filter((candidate) => !usedNodeIds.has(candidate.id)),
    );
    if (!node) {
      unmatchedFiles.push(parsed);
      continue;
    }
    usedNodeIds.add(node.id);
    matches.push({ parsed, node });
  }

  return { matches, unmatchedFiles };
}
