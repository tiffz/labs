import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo, useState, type ReactElement, type SyntheticEvent } from 'react';

import { isRichTextEmpty } from '../../shared/utils/richTextContent';
import type { ComicArtVersion, ComicProject, PageNode, PageRevision, ScriptDocument, VisualDevAsset } from '../types';
import { parseAndAnalyzeScript } from '../script/useScriptDocument';
import { partitionConceptShelfAssets } from '../utils/conceptShelfUtils';
import {
  defaultArtVersionPickerValue,
  revisionMapForArtVersionPicker,
  type ArtVersionPickerValue,
} from '../utils/artVersionUtils';
import { LYREFLY_WORKFLOW_STAGES, type LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { lyreflyProjectStageHref, navigateLyreflyHash } from '../routes/lyreflyHash';
import { LyreflyArtVersionPicker } from './LyreflyArtVersionPicker';
import { LyreflyComicBookPreview } from './LyreflyComicBookPreview';
import { LyreflyProfileConceptGallery } from './LyreflyProfileConceptGallery';
import { LyreflyProfileReferenceList } from './LyreflyProfileReferenceList';
import { ScriptFormattedPreview } from '../script/ScriptFormattedPreview';

export type LyreflyProfileStudioTabsProps = {
  project: ComicProject;
  script: ScriptDocument | null;
  assets: VisualDevAsset[];
  pageNodes: PageNode[];
  revisions: PageRevision[];
  artVersions: ComicArtVersion[];
  workflowStage: LyreflyWorkflowStage;
};

type StudioTabId = 'preview' | 'script' | 'concept' | 'brainstorm';

function defaultStudioTab({
  hasPageArt,
  hasScript,
  hasConcept,
  hasBrainstorm,
}: {
  hasPageArt: boolean;
  hasScript: boolean;
  hasConcept: boolean;
  hasBrainstorm: boolean;
}): StudioTabId {
  if (hasPageArt) return 'preview';
  if (hasScript) return 'script';
  if (hasConcept) return 'concept';
  if (hasBrainstorm) return 'brainstorm';
  return 'preview';
}

export function LyreflyProfileStudioTabs({
  project,
  script,
  assets,
  pageNodes,
  revisions,
  artVersions,
  workflowStage,
}: LyreflyProfileStudioTabsProps): ReactElement {
  const [versionPicker, setVersionPicker] = useState<ArtVersionPickerValue>(() =>
    defaultArtVersionPickerValue(project),
  );
  const revisionByPageId = useMemo(
    () => revisionMapForArtVersionPicker(versionPicker, artVersions),
    [artVersions, versionPicker],
  );
  const scriptBlocks = useMemo(
    () => (script?.markdown ? parseAndAnalyzeScript(script.markdown).blocks : []),
    [script?.markdown],
  );
  const { gallery, references } = useMemo(() => partitionConceptShelfAssets(assets), [assets]);
  const hasPageArt = useMemo(
    () => revisions.some((revision) => pageNodes.some((node) => node.id === revision.pageNodeId)),
    [pageNodes, revisions],
  );
  const hasScript = scriptBlocks.length > 0;
  const hasConcept = gallery.length > 0;
  const hasBrainstorm = !isRichTextEmpty(project.brainstormHtml) || references.length > 0;

  const [tab, setTab] = useState<StudioTabId>(() =>
    defaultStudioTab({ hasPageArt, hasScript, hasConcept, hasBrainstorm }),
  );
  const [showBleedGuides, setShowBleedGuides] = useState(false);

  const onTabChange = (_event: SyntheticEvent, value: StudioTabId): void => {
    setTab(value);
  };

  return (
    <section className="lyrefly-profile-studio" data-testid="lyrefly-profile-studio">
      <Typography component="h3" className="lyrefly-section-eyebrow">
        Studio
      </Typography>
      <Stack direction="row" spacing={0.75} useFlexGap className="lyrefly-profile-studio__stages" sx={{
        flexWrap: "wrap"
      }}>
        {LYREFLY_WORKFLOW_STAGES.map((step) => (
          <button
            key={step.id}
            type="button"
            className={[
              'lyrefly-profile-hero__stage-link',
              step.id === workflowStage ? 'lyrefly-profile-hero__stage-link--current' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => navigateLyreflyHash(lyreflyProjectStageHref(project.id, step.id))}
          >
            {step.label}
          </button>
        ))}
      </Stack>
      <Tabs
        value={tab}
        onChange={onTabChange}
        className="lyrefly-profile-studio__tabs"
        aria-label="Comic studio sections"
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Book preview" value="preview" />
        <Tab label="Script" value="script" />
        <Tab label={`Concept art (${gallery.length})`} value="concept" />
        <Tab label="Brainstorming notes / references" value="brainstorm" />
      </Tabs>
      {artVersions.length > 0 && tab === 'preview' ? (
        <LyreflyArtVersionPicker
          project={project}
          artVersions={artVersions}
          value={versionPicker}
          onChange={setVersionPicker}
          compact
          className="lyrefly-profile-studio__version-picker"
        />
      ) : null}
      {tab === 'preview' && hasPageArt ? (
        <FormControlLabel
          className="lyrefly-profile-studio__bleed-toggle"
          control={
            <Switch
              size="small"
              checked={showBleedGuides}
              onChange={(event) => setShowBleedGuides(event.target.checked)}
              slotProps={{
                input: { 'aria-label': 'Show bleed guides in book preview' }
              }}
            />
          }
          label="Bleed guides"
        />
      ) : null}
      <Box
        role="tabpanel"
        id="lyrefly-profile-studio-preview"
        aria-labelledby="lyrefly-profile-studio-tab-preview"
        hidden={tab !== 'preview'}
        className="lyrefly-profile-studio__panel"
      >
        {tab === 'preview' ? (
          hasPageArt ? (
            <LyreflyComicBookPreview
              project={project}
              pageNodes={pageNodes}
              revisions={revisions}
              revisionByPageId={revisionByPageId}
              captureArrowKeys={tab === 'preview'}
              showBleedGuides={showBleedGuides}
            />
          ) : (
            <Typography variant="body2" className="lyrefly-profile-studio__empty" sx={{
              color: "text.secondary"
            }}>
              Add page art in Draw to preview spreads here.
            </Typography>
          )
        ) : null}
      </Box>
      <Box
        role="tabpanel"
        id="lyrefly-profile-studio-script"
        aria-labelledby="lyrefly-profile-studio-tab-script"
        hidden={tab !== 'script'}
        className="lyrefly-profile-studio__panel"
      >
        {tab === 'script' ? (
          hasScript ? (
            <Box className="lyrefly-profile-studio__script-preview">
              <ScriptFormattedPreview blocks={scriptBlocks} />
            </Box>
          ) : (
            <Stack spacing={1.25} className="lyrefly-profile-studio__empty">
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                No script yet. Write dialogue and panel notes in Script.
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigateLyreflyHash(lyreflyProjectStageHref(project.id, 'script'))}
              >
                Open Script editor
              </Button>
            </Stack>
          )
        ) : null}
      </Box>
      <Box
        role="tabpanel"
        id="lyrefly-profile-studio-concept"
        aria-labelledby="lyrefly-profile-studio-tab-concept"
        hidden={tab !== 'concept'}
        className="lyrefly-profile-studio__panel"
      >
        {tab === 'concept' ? <LyreflyProfileConceptGallery assets={assets} /> : null}
      </Box>
      <Box
        role="tabpanel"
        id="lyrefly-profile-studio-brainstorm"
        aria-labelledby="lyrefly-profile-studio-tab-brainstorm"
        hidden={tab !== 'brainstorm'}
        className="lyrefly-profile-studio__panel"
      >
        {tab === 'brainstorm' ? (
          hasBrainstorm ? (
            <div className="lyrefly-profile-studio__brainstorm">
              {!isRichTextEmpty(project.brainstormHtml) ? (
                <Box
                  className="lyrefly-profile-studio__richtext"
                  dangerouslySetInnerHTML={{ __html: project.brainstormHtml ?? '' }}
                />
              ) : null}
              {references.length > 0 ? (
                <div className="lyrefly-profile-studio__references">
                  <Typography component="h4" className="lyrefly-profile-studio__references-label">
                    References
                  </Typography>
                  <LyreflyProfileReferenceList assets={references} />
                </div>
              ) : null}
            </div>
          ) : (
            <Typography variant="body2" className="lyrefly-profile-studio__empty" sx={{
              color: "text.secondary"
            }}>
              Brainstorm notes and reference links live in Brainstorm.
            </Typography>
          )
        ) : null}
      </Box>
    </section>
  );
}
