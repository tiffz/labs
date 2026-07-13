import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState, type ReactElement } from 'react';

import {
  PanelMockupSvg,
  PANEL_LAYOUT_PRESETS,
  STICK_POSE_IDS,
  buildPanelLayout,
  defaultFillsForLayout,
  type PanelFillKind,
  type PanelFillSpec,
  type PanelLayoutPresetId,
} from '../../shared/comic';
import { applyPaletteToMockup } from '../../shared/palette';
import { lyreflyDb, markLyreflyDirtyRow } from '../db/lyreflyDb';
import { notifyLyreflyLocalChange } from '../db/lyreflyChangeBus';
import { saveLyreflyProject } from '../db/lyreflyProjectMutations';
import {
  useLyreflyComicCharacters,
  useLyreflyPageMockups,
  useLyreflyPageReferences,
  useLyreflyScriptDocument,
} from '../hooks/useLyreflyProjectData';
import type { ComicCharacter, ComicProject, PageMockup } from '../types';
import { LyreflyPaletteImport } from './LyreflyPaletteImport';
import { LyreflyWikimediaPhotoSearch } from './LyreflyWikimediaPhotoSearch';

export type ThumbsStageProps = {
  project: ComicProject;
  onProjectChange: (project: ComicProject) => void;
};

function scriptPageKeys(scriptMarkdown: string | undefined): string[] {
  if (!scriptMarkdown) return ['1'];
  const matches = scriptMarkdown.match(/page\s+(\d+)/gi) ?? [];
  const nums = matches.map((m) => m.replace(/\D/g, '')).filter(Boolean);
  return nums.length > 0 ? [...new Set(nums)] : ['1'];
}

export function ThumbsStage({ project, onProjectChange }: ThumbsStageProps): ReactElement {
  const { script } = useLyreflyScriptDocument(project.scriptDocumentId);
  const { characters } = useLyreflyComicCharacters(project.id);
  const { mockups } = useLyreflyPageMockups(project.id);
  const { pageReferences } = useLyreflyPageReferences(project.id);

  const pages = useMemo(() => scriptPageKeys(script?.markdown), [script?.markdown]);
  const [scriptPageKey, setScriptPageKey] = useState('1');
  const [presetId, setPresetId] = useState<PanelLayoutPresetId>('grid-2x2');
  const [fills, setFills] = useState<PanelFillSpec[]>(() =>
    defaultFillsForLayout(buildPanelLayout('grid-2x2')),
  );
  const [characterName, setCharacterName] = useState('');
  const [useIrregularPanels, setUseIrregularPanels] = useState(false);

  const layout = useMemo(() => {
    const id = useIrregularPanels ? 'diagonal-split' : presetId;
    return buildPanelLayout(id);
  }, [presetId, useIrregularPanels]);

  const colors = useMemo(
    () => applyPaletteToMockup(project.colorPalette ?? null, layout.panels.length),
    [layout.panels.length, project.colorPalette],
  );

  const activeMockup = mockups.find((m) => m.scriptPageKey === scriptPageKey);

  const onPresetChange = (next: PanelLayoutPresetId): void => {
    setPresetId(next);
    setFills(defaultFillsForLayout(buildPanelLayout(next)));
  };

  const onFillChange = (panelIndex: number, kind: PanelFillKind, extra?: Partial<PanelFillSpec>): void => {
    setFills((current) => {
      const next = [...current];
      const existing = next.find((f) => f.panelIndex === panelIndex);
      if (existing) Object.assign(existing, { kind, ...extra });
      else next.push({ panelIndex, kind, ...extra });
      return next;
    });
  };

  const onSaveMockup = async (): Promise<void> => {
    const now = new Date().toISOString();
    const row: PageMockup = {
      id: activeMockup?.id ?? crypto.randomUUID(),
      projectId: project.id,
      scriptPageKey,
      mockup: { layout, fills, paletteId: project.colorPalette?.id },
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

  const onPaletteChange = async (palette: ComicProject['colorPalette']): Promise<void> => {
    const updated = await saveLyreflyProject({ ...project, colorPalette: palette });
    onProjectChange(updated);
  };

  return (
    <div
      className="lyrefly-thumbs lyrefly-stage-body"
      data-testid="lyrefly-thumbs-stage"
    >
      <header className="lyrefly-thumbs__header">
        <Typography component="h2" className="lyrefly-section-eyebrow">
          Thumbs
        </Typography>
        <Typography variant="body2" color="text.secondary" className="lyrefly-thumbs__lede">
          Characters, page refs, and rough panel mockups. Not final art.
        </Typography>
      </header>

      <div className="lyrefly-thumbs__grid">
        <aside className="lyrefly-thumbs__rail">
          <section className="lyrefly-thumbs__rail-section">
            <LyreflyPaletteImport palette={project.colorPalette} onPaletteChange={(p) => void onPaletteChange(p)} />
          </section>

          <section className="lyrefly-thumbs__rail-section">
            <Typography component="h3" variant="subtitle2">
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
            <ul className="lyrefly-thumbs__cast-list">
              {characters.map((c) => (
                <li key={c.id}>{c.displayName ?? c.name}</li>
              ))}
            </ul>
          </section>

          <section className="lyrefly-thumbs__rail-section">
            <Typography component="h3" variant="subtitle2">
              Script page
            </Typography>
            <FormControl size="small" fullWidth sx={{ mt: 0.5 }}>
              <InputLabel id="lyrefly-thumbs-page-label">Page</InputLabel>
              <Select
                labelId="lyrefly-thumbs-page-label"
                label="Page"
                value={scriptPageKey}
                onChange={(e) => setScriptPageKey(String(e.target.value))}
              >
                {pages.map((p) => (
                  <MenuItem key={p} value={p}>
                    Page {p}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {pageReferences.filter((r) => r.scriptPageKey === scriptPageKey).length > 0 ? (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {pageReferences.filter((r) => r.scriptPageKey === scriptPageKey).length} page reference(s)
              </Typography>
            ) : null}
          </section>

          <section className="lyrefly-thumbs__rail-section">
            <LyreflyWikimediaPhotoSearch />
          </section>
        </aside>

        <section className="lyrefly-thumbs__board">
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
                onChange={(e) => setUseIrregularPanels(e.target.checked)}
              />
              Irregular panel emphasis (experimental)
            </label>

            <Button variant="contained" size="small" onClick={() => void onSaveMockup()} data-testid="lyrefly-save-mockup">
              Save mockup
            </Button>
          </div>

          <div className="lyrefly-thumbs__panel-grid">
            {layout.panels.map((_, index) => {
              const fill = fills.find((f) => f.panelIndex === index);
              return (
                <div key={index} className="lyrefly-thumbs__panel-card">
                  <span className="lyrefly-thumbs__panel-label">Panel {index + 1}</span>
                  <Select
                    size="small"
                    fullWidth
                    value={fill?.kind ?? 'empty'}
                    onChange={(e) =>
                      onFillChange(index, e.target.value as PanelFillKind, {
                        poseId: e.target.value === 'stick' ? 'standing' : undefined,
                      })
                    }
                  >
                    <MenuItem value="empty">Empty</MenuItem>
                    <MenuItem value="stick">Stick</MenuItem>
                    <MenuItem value="silhouette">Silhouette</MenuItem>
                    <MenuItem value="note">Note</MenuItem>
                  </Select>
                  {fill?.kind === 'stick' ? (
                    <Select
                      size="small"
                      fullWidth
                      value={fill.poseId ?? 'standing'}
                      onChange={(e) => onFillChange(index, 'stick', { poseId: e.target.value })}
                    >
                      {STICK_POSE_IDS.map((pose) => (
                        <MenuItem key={pose} value={pose}>
                          {pose}
                        </MenuItem>
                      ))}
                    </Select>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="lyrefly-thumbs__preview" data-testid="lyrefly-thumbs-mockup">
            <PanelMockupSvg layout={layout} fills={fills} colors={colors} />
          </div>
        </section>
      </div>
    </div>
  );
}
