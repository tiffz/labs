// ============================================
// Lyrefly — core domain types
// ============================================

import { DEFAULT_SCRIPT_HTML } from '../script/defaultScriptSample';
import { parseScriptHtml } from '../script/scriptHtmlParser';
import { analyzeScriptPacing } from '../script/scriptPacingAnalyzer';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import type { MixamBindingType } from '../../shared/zine/bleedConfig';
import type { ComicPalette } from '../../shared/palette';
import type { PageMockupSpec } from '../../shared/comic';

export type LyreflyProjectStatus = 'draft' | 'wip' | 'finished' | 'archived';

/** Gallery pipeline queue status (Story Tracker–aligned). */
export type LyreflyPipelineStatus = 'fleshing_out' | 'ready_to_draw' | 'complete';

export type SketchbookSeedKind = 'idea' | 'daily_flash' | 'link' | 'image' | 'file';
export type SketchbookSeedStatus = 'active' | 'promoted' | 'archived';

/** Optional pipeline stages — matrix checklist, not a rigid kanban. */
export type LyreflyMilestoneId =
  | 'brainstorm'
  | 'outline_thumbnails'
  | 'visual_dev'
  | 'wip_art'
  | 'scripting'
  | 'publishing';

export type LyreflyModuleId = 'milestones' | 'visual_dev' | 'script' | 'layout' | 'reader' | 'archive';

export interface LyreflyMilestoneState {
  id: LyreflyMilestoneId;
  /** User-visible label override (defaults from preset). */
  label?: string;
  complete: boolean;
  /** Optional freeform note when toggling complete. */
  note?: string;
  completedAt?: string;
}

export interface LyreflyModuleFlags {
  milestones: boolean;
  visualDev: boolean;
  script: boolean;
  layout: boolean;
  archive: boolean;
}

export interface LyreflyAssetRef {
  kind: 'page_revision' | 'visual_dev' | 'cover';
  id: string;
}

/** Top-level comic project — showcase card + workbench entry. */
export interface ComicProject {
  id: string;
  title: string;
  status: LyreflyProjectStatus;
  /** Short tagline for showcase shelf metadata badge. */
  subtitle?: string;
  /** Cover thumbnail: revision id or visual-dev asset id. */
  coverRef?: LyreflyAssetRef;
  /** Which optional modules are enabled for this comic. */
  modules: LyreflyModuleFlags;
  milestones: LyreflyMilestoneState[];
  /** Ordered layout slot ids — decoupled from page node identity. */
  layoutOrder: string[];
  /** Active script document id (usually one; beat-sheet expansion mutates same doc). */
  scriptDocumentId: string;
  /** Macro snapshot ids, newest last. */
  snapshotIds: string[];
  /** Saved full-comic art versions (page → revision pointers). */
  artVersionIds?: string[];
  /** Version used for export / profile preview when set. */
  finalArtVersionId?: string;
  /** Publish / press / sales live in archive module. */
  archiveId?: string;
  /** Brainstorm canvas — rich text ideas doc (HTML). */
  brainstormHtml?: string;
  /** Manual workflow stage completion overrides (Encore Originals pattern). */
  stageCompletion?: Partial<Record<LyreflyWorkflowStage, boolean>>;
  /** Guest share: Drive file id of redacted public snapshot (Encore pattern). */
  publicSnapshotDriveFileId?: string;
  /** Zine Box handoff: exported distribution PDF sidecar id. */
  distributionPdfDriveFileId?: string;
  /** Cached Drive folder id for projects/{id}/. */
  projectFolderId?: string;
  /** Target trim size + binding for Mixam-ready page art (Draw stage). */
  printSpec?: LyreflyPrintSpec;
  /** Optional project color palette (Chromacle / Coolors import). */
  colorPalette?: ComicPalette;
  /** Gallery pipeline status when in active queue. */
  pipelineStatus?: LyreflyPipelineStatus;
  /** Lower sorts earlier in priority queue. */
  priorityRank?: number;
  pageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComicProjectSummary {
  id: string;
  title: string;
  status: LyreflyProjectStatus;
  subtitle?: string;
  coverRef?: LyreflyAssetRef;
  pageCount?: number;
  updatedAt: string;
  projectFolderId?: string;
}

export type PageRevisionStage = 'thumbnail' | 'pencil' | 'inks' | 'colors' | 'final' | 'other';

export interface PageRevision {
  id: string;
  pageNodeId: string;
  label: string;
  stage: PageRevisionStage;
  /** Sidecar filename under pages/{nodeId}/revisions/{id}.ext */
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize?: number;
  driveFileId?: string;
  importedAt: string;
  createdAt: string;
}

export interface PageNode {
  id: string;
  projectId: string;
  /** Optional human label ("Page 3", "Spread 4–5"). */
  displayName?: string;
  /** Soft link to script page section — informative only, not binding. */
  scriptPageSectionId?: string;
  /** Whether this node represents a two-page spread canvas. */
  isSpread: boolean;
  /** Active revision for reader/export; WIP slider defaults here. */
  activeRevisionId: string | null;
  /** Chronological revision ids (oldest → newest). */
  revisionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type VisualDevAssetKind = 'image' | 'sketch' | 'moodboard' | 'reference' | 'note' | 'link';

export interface VisualDevAsset {
  id: string;
  projectId: string;
  kind: VisualDevAssetKind;
  title: string;
  caption?: string;
  tags: string[];
  /** For image kinds — sidecar under visual-dev/. */
  fileName?: string;
  mimeType?: string;
  driveFileId?: string;
  /** For link/note kinds. */
  url?: string;
  markdown?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptBlockBase {
  id: string;
  /** 1-based source line in script.md for round-trip editing. */
  sourceLineStart: number;
  sourceLineEnd: number;
}

/** Pre-expansion beat sheet row: "Page 1: Hero wakes up..." */
export interface ScriptBeatSheetLineBlock extends ScriptBlockBase {
  type: 'beat_sheet_line';
  pageHint?: number;
  text: string;
}

/** After beat-sheet expand — pins original beat at top of page. */
export interface ScriptPageSectionBlock extends ScriptBlockBase {
  type: 'page_section';
  pageNumber: number;
  pinnedBeatText?: string;
}

export interface ScriptPanelBlock extends ScriptBlockBase {
  type: 'panel';
  pageNumber: number;
  panelNumber: number;
  /** Panel row label from the source list (e.g. "Opening spread"). */
  caption?: string;
}

export interface ScriptDialogueBlock extends ScriptBlockBase {
  type: 'dialogue';
  pageNumber: number;
  panelNumber: number;
  character: string;
  lines: string[];
}

export interface ScriptSfxBlock extends ScriptBlockBase {
  type: 'sfx';
  pageNumber: number;
  panelNumber: number;
  text: string;
}

export interface ScriptNarrationBlock extends ScriptBlockBase {
  type: 'narration';
  pageNumber: number;
  panelNumber: number;
  text: string;
}

export type ScriptBlock =
  | ScriptBeatSheetLineBlock
  | ScriptPageSectionBlock
  | ScriptPanelBlock
  | ScriptDialogueBlock
  | ScriptSfxBlock
  | ScriptNarrationBlock;

export interface ScriptPacingWarning {
  blockId: string;
  kind: 'dialogue_density' | 'panel_overcrowded';
  message: string;
  severity: 'info' | 'warn';
}

export interface ScriptDocument {
  id: string;
  projectId: string;
  /** Raw markdown — single source of truth for editing. */
  markdown: string;
  blocks: ScriptBlock[];
  /** Derived pacing metrics; recomputed on parse. */
  pacingWarnings: ScriptPacingWarning[];
  updatedAt: string;
}

/** How a saved art version was created. */
export type ComicArtVersionSource = 'snapshot' | 'upload';

/** Frozen map of which page revision belongs to a saved comic art version. */
export interface ComicArtVersion {
  id: string;
  projectId: string;
  label: string;
  notes?: string;
  /** Snapshot of current page picks, or a bulk-uploaded page set. */
  source?: ComicArtVersionSource;
  /** Page node id → revision id for this version. */
  pageRevisions: Record<string, string>;
  /** When this version was completed — inferred from files or edited manually. */
  completedAt?: string;
  /** When true, a public Drive snapshot is published for guest preview. */
  shareEnabled?: boolean;
  /** Drive file id for the published guest snapshot JSON. */
  shareSnapshotDriveFileId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Macro draft archive — frozen pointer map, not a full duplicate of every byte. */
export interface ComicMacroSnapshot {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
  frozenLayoutOrder: string[];
  frozenActiveRevisions: Record<string, string>;
  frozenScriptMarkdown: string;
}

export interface PublishLogEntry {
  id: string;
  platform: string;
  publishedAt: string;
  url?: string;
  notes?: string;
}

export interface PressMemorabiliaEntry {
  id: string;
  title: string;
  markdown: string;
  url?: string;
  occurredAt?: string;
}

export interface SalesLedgerRow {
  id: string;
  date: string;
  description: string;
  quantity: number;
  unitCostCents?: number;
  revenueCents?: number;
  notes?: string;
}

export interface ComicArchiveBinder {
  id: string;
  projectId: string;
  publishLog: PublishLogEntry[];
  pressEntries: PressMemorabiliaEntry[];
  salesLedger: SalesLedgerRow[];
}

export interface SketchbookSeed {
  id: string;
  kind: SketchbookSeedKind;
  title?: string;
  logline?: string;
  bodyHtml?: string;
  occurredOn?: string;
  url?: string;
  fileName?: string;
  mimeType?: string;
  tags: string[];
  status: SketchbookSeedStatus;
  promotedProjectId?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComicCharacter {
  id: string;
  projectId: string;
  name: string;
  displayName?: string;
  aliases: string[];
  notesHtml?: string;
  colorToken?: string;
  conceptAssetIds: string[];
  source: 'manual' | 'script';
  createdAt: string;
  updatedAt: string;
}

export interface PageReference {
  id: string;
  projectId: string;
  scriptPageKey: string;
  title?: string;
  notesHtml?: string;
  conceptAssetIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PageMockup {
  id: string;
  projectId: string;
  scriptPageKey: string;
  mockup: PageMockupSpec;
  createdAt: string;
  updatedAt: string;
}

/** Mixam-oriented trim + binding settings for Draw / export. */
export interface LyreflyPrintSpec {
  presetId: string;
  trimWidth: number;
  trimHeight: number;
  unit: 'in';
  dpi: number;
  binding: MixamBindingType;
  /** Per-side bleed in inches (Mixam default 0.125). */
  bleedInches?: number;
}

export type LyreflyDirtySyncKind =
  | 'project'
  | 'layout'
  | 'script'
  | 'page_node'
  | 'page_revision'
  | 'visual_dev'
  | 'snapshot'
  | 'art_version'
  | 'archive'
  | 'sketchbook_seed'
  | 'comic_character'
  | 'page_reference'
  | 'page_mockup';

export interface LyreflyDirtySyncRow {
  id: string;
  kind: LyreflyDirtySyncKind;
  rowId: string;
  action: 'upsert' | 'delete';
  projectId?: string;
  updatedAt: string;
}

export function lyreflyDirtySyncRowKey(kind: LyreflyDirtySyncKind, rowId: string): string {
  return `${kind}:${rowId}`;
}

export const LYREFLY_DEFAULT_MILESTONES: LyreflyMilestoneState[] = [
  { id: 'brainstorm', complete: false },
  { id: 'outline_thumbnails', complete: false },
  { id: 'visual_dev', complete: false },
  { id: 'wip_art', complete: false },
  { id: 'scripting', complete: false },
  { id: 'publishing', complete: false },
];

export const LYREFLY_DEFAULT_MODULES: LyreflyModuleFlags = {
  milestones: true,
  visualDev: true,
  script: true,
  layout: true,
  archive: false,
};

export function projectToSummary(project: ComicProject): ComicProjectSummary {
  return {
    id: project.id,
    title: project.title,
    status: project.status,
    subtitle: project.subtitle,
    coverRef: project.coverRef,
    pageCount: project.pageCount,
    updatedAt: project.updatedAt,
    projectFolderId: project.projectFolderId,
  };
}

export function createBlankComicProject(now = new Date().toISOString()): ComicProject {
  const id = crypto.randomUUID();
  const scriptDocumentId = crypto.randomUUID();
  return {
    id,
    title: 'Untitled comic',
    status: 'draft',
    modules: { ...LYREFLY_DEFAULT_MODULES },
    milestones: LYREFLY_DEFAULT_MILESTONES.map((m) => ({ ...m })),
    layoutOrder: [],
    scriptDocumentId,
    snapshotIds: [],
    artVersionIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createBlankScriptDocument(projectId: string, now = new Date().toISOString()): ScriptDocument {
  const blocks = parseScriptHtml(DEFAULT_SCRIPT_HTML);
  const pacingWarnings = analyzeScriptPacing(blocks);
  return {
    id: crypto.randomUUID(),
    projectId,
    markdown: DEFAULT_SCRIPT_HTML,
    blocks,
    pacingWarnings,
    updatedAt: now,
  };
}
