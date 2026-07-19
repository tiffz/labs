import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import AnchoredPopover from '../../shared/components/AnchoredPopover';
import {
  MockupFitCanvas,
  PANEL_COMPOSITION_IDS,
  PANEL_COMPOSITION_LABELS,
  PANEL_LAYOUT_PRESETS,
  PanelMockupSvg,
  buildPanelLayout,
  resolvePanelComposition,
  type PanelBackgroundImage,
  type PanelCompositionId,
  type PanelFillSpec,
  type PanelLayoutPresetId,
  type PanelLayoutSpec,
} from '../../shared/comic';
import { LabsWikimediaImageSearch, type LabsWikimediaImageResult } from '../../shared/media';
import { applyPaletteToMockup, LabsPaletteBuilder } from '../../shared/palette';
import { lyreflyDb, markLyreflyDirtyRow } from '../db/lyreflyDb';
import { notifyLyreflyLocalChange } from '../db/lyreflyChangeBus';
import { saveLyreflyProject } from '../db/lyreflyProjectMutations';
import {
  useLyreflyComicCharacters,
  useLyreflyPageMockups,
  useLyreflyPageReferences,
  useLyreflyScriptDocument,
} from '../hooks/useLyreflyProjectData';
import { ScriptFormattedPreview } from '../script/ScriptFormattedPreview';
import { ScriptRichTextEditor } from '../script/ScriptRichTextEditor';
import { useScriptAutosave } from '../script/useScriptAutosave';
import {
  buildPanelFillsFromScriptBlocks,
  panelCountForPage,
  presetIdForPanelCount,
  scriptBlocksForPage,
  scriptPageNumbers,
} from '../utils/lyreflyScriptMockup';
import { resolveLyreflyPrintSpec } from '../utils/lyreflyPrintSpec';
import type { ComicCharacter, ComicProject, PageMockup, ScriptBlock, ScriptDocument } from '../types';
import { LyreflyPrintSpecPanel } from './LyreflyPrintSpecPanel';

export type ThumbsStageProps = {
  project: ComicProject;
  onProjectChange: (project: ComicProject) => void;
};

/** Placeholder used only until the real script document loads; never persisted. */
const PENDING_SCRIPT_DOCUMENT: ScriptDocument = {
  id: '__lyrefly-thumbs-pending__',
  projectId: '',
  markdown: '',
  blocks: [],
  pacingWarnings: [],
  updatedAt: '',
};

function deriveFillsFromScript(scriptPageKey: string, blocks: readonly ScriptBlock[]): {
  presetId: PanelLayoutPresetId;
  fills: PanelFillSpec[];
} {
  const pageBlocks = scriptBlocksForPage(blocks, Number(scriptPageKey));
  const preset = presetIdForPanelCount(panelCountForPage(pageBlocks) || 1);
  const layout = buildPanelLayout(preset);
  return { presetId: preset, fills: buildPanelFillsFromScriptBlocks(pageBlocks, layout.panels.length) };
}

export function ThumbsStage({ project, onProjectChange }: ThumbsStageProps): ReactElement {
  const { script, scriptHydrated } = useLyreflyScriptDocument(project.scriptDocumentId);
  const { characters } = useLyreflyComicCharacters(project.id);
  const { mockups, mockupsHydrated } = useLyreflyPageMockups(project.id);
  const { pageReferences } = useLyreflyPageReferences(project.id);

  const scriptDoc = script ?? PENDING_SCRIPT_DOCUMENT;
  const { localHtml, saving, handleChange } = useScriptAutosave(scriptDoc, () => {});

  const pages = useMemo(() => scriptPageNumbers(script?.blocks ?? []), [script?.blocks]);
  const [scriptPageKey, setScriptPageKey] = useState('1');
  const [editingScript, setEditingScript] = useState(false);
  const [presetId, setPresetId] = useState<PanelLayoutPresetId>('grid-2x2');
  const [useIrregularPanels, setUseIrregularPanels] = useState(false);
  const [fills, setFills] = useState<PanelFillSpec[]>([]);
  const [pageBackgroundImage, setPageBackgroundImage] = useState<PanelBackgroundImage | null>(null);
  const [characterName, setCharacterName] = useState('');

  const [castAnchor, setCastAnchor] = useState<HTMLElement | null>(null);
  const [paletteAnchor, setPaletteAnchor] = useState<HTMLElement | null>(null);
  const [photoAnchor, setPhotoAnchor] = useState<HTMLElement | null>(null);

  const appliedPageKeyRef = useRef<string | null>(null);

  const layout = useMemo(() => {
    const id = useIrregularPanels ? 'diagonal-split' : presetId;
    return buildPanelLayout(id);
  }, [presetId, useIrregularPanels]);

  const colors = useMemo(
    () => applyPaletteToMockup(project.colorPalette ?? null, layout.panels.length),
    [layout.panels.length, project.colorPalette],
  );

  const printSpec = useMemo(() => resolveLyreflyPrintSpec(project), [project]);
  const pageBlocks = useMemo(
    () => scriptBlocksForPage(script?.blocks ?? [], Number(scriptPageKey)),
    [script?.blocks, scriptPageKey],
  );

  const activeMockup = mockups.find((m) => m.scriptPageKey === scriptPageKey);
  const pageRefCount = pageReferences.filter((r) => r.scriptPageKey === scriptPageKey).length;

  // Load a saved mockup for the selected page, or derive a starting point from the script — once
  // per page visit, so it never clobbers in-progress manual edits.
  useEffect(() => {
    if (!scriptHydrated || !mockupsHydrated) return;
    if (appliedPageKeyRef.current === scriptPageKey) return;
    appliedPageKeyRef.current = scriptPageKey;

    const saved = mockups.find((m) => m.scriptPageKey === scriptPageKey);
    if (saved) {
      const savedPresetId = (saved.mockup.layout.presetId as PanelLayoutPresetId | undefined) ?? 'grid-2x2';
      setPresetId(savedPresetId);
      setUseIrregularPanels(savedPresetId === 'diagonal-split');
      setFills(saved.mockup.fills);
      setPageBackgroundImage(saved.mockup.pageBackgroundImage ?? null);
      return;
    }

    const derived = deriveFillsFromScript(scriptPageKey, script?.blocks ?? []);
    setPresetId(derived.presetId);
    setUseIrregularPanels(false);
    setFills(derived.fills);
    setPageBackgroundImage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guarded by appliedPageKeyRef; only re-run on page switch
  }, [scriptPageKey, scriptHydrated, mockupsHydrated]);

  const regenerateFillsForLayout = useCallback(
    (targetLayout: PanelLayoutSpec) => {
      const nextPageBlocks = scriptBlocksForPage(script?.blocks ?? [], Number(scriptPageKey));
      setFills(buildPanelFillsFromScriptBlocks(nextPageBlocks, targetLayout.panels.length));
    },
    [script?.blocks, scriptPageKey],
  );

  const onPresetChange = (next: PanelLayoutPresetId): void => {
    setPresetId(next);
    setUseIrregularPanels(false);
    regenerateFillsForLayout(buildPanelLayout(next));
  };

  const onToggleIrregular = (checked: boolean): void => {
    setUseIrregularPanels(checked);
    regenerateFillsForLayout(buildPanelLayout(checked ? 'diagonal-split' : presetId));
  };

  const onSyncFromScript = (): void => {
    const derived = deriveFillsFromScript(scriptPageKey, script?.blocks ?? []);
    setPresetId(derived.presetId);
    setUseIrregularPanels(false);
    setFills(derived.fills);
  };

  const onCompositionChange = (panelIndex: number, composition: PanelCompositionId): void => {
    setFills((current) => {
      const index = current.findIndex((f) => f.panelIndex === panelIndex);
      if (index === -1) return [...current, { panelIndex, composition, blocks: [] }];
      const next = [...current];
      next[index] = { ...next[index]!, composition };
      return next;
    });
  };

  const onSaveMockup = async (): Promise<void> => {
    const now = new Date().toISOString();
    const row: PageMockup = {
      id: activeMockup?.id ?? crypto.randomUUID(),
      projectId: project.id,
      scriptPageKey,
      mockup: {
        layout,
        fills,
        paletteId: project.colorPalette?.id,
        pageBackgroundImage: pageBackgroundImage ?? undefined,
      },
      createdAt: activeMockup?.createdAt ?? now,
      updatedAt: now,
    };
    await lyreflyDb.pageMockups.put(row);
    await markLyreflyDirtyRow('page_mockup', row.id, 'upsert', project.id);
    notifyLyreflyLocalChange();
  };

  const onAddCharacter = async (): Promise<void> => {
    const name = characterName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const row: ComicCharacter = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name,
      aliases: [],
      conceptAssetIds: [],
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    };
    await lyreflyDb.comicCharacters.put(row);
    await markLyreflyDirtyRow('comic_character', row.id, 'upsert', project.id);
    notifyLyreflyLocalChange();
    setCharacterName('');
  };

  const onPaletteApply = async (palette: ComicProject['colorPalette']): Promise<void> => {
    const updated = await saveLyreflyProject({ ...project, colorPalette: palette });
    onProjectChange(updated);
  };

  const onSelectPageBackgroundImage = (result: LabsWikimediaImageResult): void => {
    setPageBackgroundImage({ url: result.url, title: result.title, license: result.license });
  };

  return (
    <div className="lyrefly-thumbs lyrefly-stage-body" data-testid="lyrefly-thumbs-stage">
      <header className="lyrefly-thumbs__header">
        <Typography component="h2" className="lyrefly-section-eyebrow">
          Thumbs
        </Typography>
        <Typography variant="body2" className="lyrefly-thumbs__lede" sx={{
          color: "text.secondary"
        }}>
          Rough panel mockups pulled from your script. Not final art.
        </Typography>
      </header>
      <div className="lyrefly-thumbs__toolbar">
        <FormControl size="small" sx={{ minWidth: '8rem' }}>
          <InputLabel id="lyrefly-thumbs-page-label">Page</InputLabel>
          <Select
            labelId="lyrefly-thumbs-page-label"
            label="Page"
            value={scriptPageKey}
            onChange={(e) => setScriptPageKey(String(e.target.value))}
            data-testid="lyrefly-thumbs-page-select"
          >
            {pages.map((p) => (
              <MenuItem key={p} value={String(p)}>
                Page {p}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {pageRefCount > 0 ? (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {pageRefCount} page reference{pageRefCount === 1 ? '' : 's'}
          </Typography>
        ) : null}

        <span className="lyrefly-thumbs__toolbar-spacer" />

        <Tooltip title="Cast">
          <IconButton
            size="small"
            aria-label="Manage cast"
            aria-haspopup="true"
            aria-expanded={Boolean(castAnchor)}
            onClick={(e) => setCastAnchor(e.currentTarget)}
            data-testid="lyrefly-thumbs-cast-trigger"
          >
            <GroupsOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Palette">
          <IconButton
            size="small"
            aria-label="Edit color palette"
            aria-haspopup="true"
            aria-expanded={Boolean(paletteAnchor)}
            onClick={(e) => setPaletteAnchor(e.currentTarget)}
            data-testid="lyrefly-thumbs-palette-trigger"
          >
            <PaletteOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Reference photo">
          <IconButton
            size="small"
            aria-label="Search reference photos"
            aria-haspopup="true"
            aria-expanded={Boolean(photoAnchor)}
            onClick={(e) => setPhotoAnchor(e.currentTarget)}
            data-testid="lyrefly-thumbs-photo-trigger"
          >
            <PhotoCameraOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
      <AnchoredPopover
        open={Boolean(castAnchor)}
        anchorEl={castAnchor}
        onClose={() => setCastAnchor(null)}
        placement="bottom-end"
        paperClassName="lyrefly-thumbs__popover"
      >
        <div className="lyrefly-thumbs__popover-inner" data-testid="lyrefly-thumbs-cast-panel">
          <Typography component="h4" variant="subtitle2">
            Cast
          </Typography>
          <div className="lyrefly-thumbs__cast-add">
            <TextField
              size="small"
              label="Character name"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              data-testid="lyrefly-character-name"
            />
            <Button size="small" variant="outlined" onClick={() => void onAddCharacter()}>
              Add
            </Button>
          </div>
          {characters.length > 0 ? (
            <ul className="lyrefly-thumbs__cast-list">
              {characters.map((c) => (
                <li key={c.id}>{c.displayName ?? c.name}</li>
              ))}
            </ul>
          ) : (
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              No characters yet.
            </Typography>
          )}
        </div>
      </AnchoredPopover>
      <AnchoredPopover
        open={Boolean(paletteAnchor)}
        anchorEl={paletteAnchor}
        onClose={() => setPaletteAnchor(null)}
        placement="bottom-end"
        paperClassName="lyrefly-thumbs__popover"
      >
        <div className="lyrefly-thumbs__popover-inner">
          <LabsPaletteBuilder
            variant="lyrefly"
            value={project.colorPalette}
            onApply={(palette) => void onPaletteApply(palette)}
          />
        </div>
      </AnchoredPopover>
      <AnchoredPopover
        open={Boolean(photoAnchor)}
        anchorEl={photoAnchor}
        onClose={() => setPhotoAnchor(null)}
        placement="bottom-end"
        paperClassName="lyrefly-thumbs__popover"
      >
        <div className="lyrefly-thumbs__popover-inner">
          {pageBackgroundImage ? (
            <div className="lyrefly-thumbs__background-current" data-testid="lyrefly-thumbs-background-current">
              <span className="lyrefly-thumbs__background-title">{pageBackgroundImage.title}</span>
              <Button size="small" onClick={() => setPageBackgroundImage(null)}>
                Remove
              </Button>
            </div>
          ) : null}
          <LabsWikimediaImageSearch
            variant="lyrefly"
            heading="Page background photo"
            onSelectImage={onSelectPageBackgroundImage}
          />
        </div>
      </AnchoredPopover>
      <div className="lyrefly-thumbs__grid">
        <section className="lyrefly-thumbs__script-pane" aria-label={`Script for page ${scriptPageKey}`}>
          <div className="lyrefly-thumbs__script-pane-header">
            <Typography component="h3" className="lyrefly-script-split__label">
              Script
            </Typography>
            <Tooltip title={editingScript ? 'Done editing' : 'Edit script'}>
              <IconButton
                size="small"
                aria-label={editingScript ? 'Done editing script' : 'Edit script'}
                aria-expanded={editingScript}
                disabled={!script}
                onClick={() => setEditingScript((open) => !open)}
                data-testid="lyrefly-thumbs-script-edit-toggle"
              >
                {editingScript ? <CheckOutlinedIcon fontSize="small" /> : <EditOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </div>

          {editingScript && script ? (
            <div className="lyrefly-thumbs__script-editor">
              <ScriptRichTextEditor value={localHtml} onChange={handleChange} />
              <Typography variant="caption" aria-live="polite" sx={{
                color: "text.secondary"
              }}>
                {saving ? 'Saving…' : 'Edits apply to the whole script. Use Sync from script to refresh this mockup.'}
              </Typography>
            </div>
          ) : (
            <div className="lyrefly-thumbs__script-preview">
              <ScriptFormattedPreview blocks={pageBlocks} />
            </div>
          )}
        </section>

        <section className="lyrefly-thumbs__board" aria-label="Panel mockup">
          <LyreflyPrintSpecPanel project={project} onProjectChange={onProjectChange} />

          <div className="lyrefly-thumbs__board-toolbar">
            <FormControl size="small" sx={{ minWidth: '10rem' }}>
              <InputLabel id="lyrefly-thumbs-layout-label">Layout</InputLabel>
              <Select
                labelId="lyrefly-thumbs-layout-label"
                label="Layout"
                value={presetId}
                onChange={(e) => onPresetChange(e.target.value as PanelLayoutPresetId)}
                data-testid="lyrefly-thumbs-layout"
              >
                {PANEL_LAYOUT_PRESETS.map((preset) => (
                  <MenuItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <label className="lyrefly-thumbs__flag">
              <input
                type="checkbox"
                checked={useIrregularPanels}
                onChange={(e) => onToggleIrregular(e.target.checked)}
              />
              Irregular panel emphasis (experimental)
            </label>

            <Button
              size="small"
              startIcon={<SyncOutlinedIcon fontSize="small" />}
              onClick={onSyncFromScript}
              data-testid="lyrefly-thumbs-sync-script"
            >
              Sync from script
            </Button>

            <span className="lyrefly-thumbs__toolbar-spacer" />

            <Button
              variant="contained"
              size="small"
              onClick={() => void onSaveMockup()}
              data-testid="lyrefly-save-mockup"
            >
              Save mockup
            </Button>
          </div>

          <div className="lyrefly-thumbs__panel-grid">
            {layout.panels.map((_, index) => {
              const fill = fills.find((f) => f.panelIndex === index);
              const hint = fill?.blocks?.find((b) => b.content.trim().length > 0)?.content;
              return (
                <div key={index} className="lyrefly-thumbs__panel-card">
                  <span className="lyrefly-thumbs__panel-label">Panel {index + 1}</span>
                  <Select
                    size="small"
                    fullWidth
                    value={resolvePanelComposition(fill)}
                    onChange={(e) => onCompositionChange(index, e.target.value as PanelCompositionId)}
                    data-testid={`lyrefly-thumbs-panel-composition-${index}`}
                  >
                    {PANEL_COMPOSITION_IDS.map((id) => (
                      <MenuItem key={id} value={id}>
                        {PANEL_COMPOSITION_LABELS[id]}
                      </MenuItem>
                    ))}
                  </Select>
                  {hint ? <p className="lyrefly-thumbs__panel-script-hint">{hint}</p> : null}
                </div>
              );
            })}
          </div>

          <MockupFitCanvas
            printSpec={printSpec}
            className="lyrefly-thumbs__fit-canvas"
            innerClassName="lyrefly-thumbs__fit-canvas-inner"
            testId="lyrefly-thumbs-mockup"
          >
            {(size) => (
              <PanelMockupSvg
                layout={layout}
                fills={fills}
                colors={colors}
                width={size.width}
                height={size.height}
                printSpec={printSpec}
                pageBackgroundImage={pageBackgroundImage ?? undefined}
              />
            )}
          </MockupFitCanvas>
        </section>
      </div>
    </div>
  );
}
