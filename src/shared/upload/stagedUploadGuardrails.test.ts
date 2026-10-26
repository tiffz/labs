import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Every way a file enters a Labs app stages it for review first (ADR 0030).
 *
 * The guard finds intake modules by what they DO — a file input, a drop handler reading
 * `dataTransfer.files`, a native file picker, a `DragDropFileUpload` consumer — so a new upload path
 * is enrolled by existing. Each must then be one of:
 *
 *  - **staged**: imports the shared staging (`src/shared/upload/`) or calls a `stage*()` function
 *    that feeds it;
 *  - **forwards**: a primitive that hands files to its caller and writes nothing itself;
 *  - **saves nothing**: reads a file into memory only (a palette from an image, say);
 *  - **pending**: a known path not yet moved onto staging. This list is the migration plan. It may
 *    only shrink: delete the row in the PR that migrates the module.
 *
 * What this cannot see: a module that is "staged" for one intake and immediate for another (the
 * Originals song-files panel stages takes but not references yet). Such a module stays in
 * `PENDING` until every intake in it stages. A behavioural check would need every surface driven in
 * a browser; the e2e smokes cover the migrated ones.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', '..');

const INTAKE =
  /type="file"|\bonFiles=|dataTransfer\??\.files|showOpenFilePicker|showDirectoryPicker|\.getAsFile\(\)|webkitGetAsEntry/;
/** Imports the shared staging, or calls a `stage*()` function (directly or through a ref). */
const STAGED = /shared\/upload\/|\bstage[A-Z]\w*(?:Ref\.current)?\(/;

const FORWARDS = new Map([
  ['shared/components/DragDropFileUpload.tsx', 'drop zone primitive; passes files to onFiles'],
  ['shared/utils/readDataTransferEntryFiles.ts', 'reads dropped folders for its caller'],
  ['encore/ui/EncoreMediaTrackAddMenu.tsx', 'add menu; its caller owns the input or handler'],
  ['encore/components/EncoreResourceLinksPanel.tsx', 'passes picked and dropped files to onUploadFiles'],
  ['encore/originals/originalsSongFileDrag.ts', 'classifies a drag for slot highlighting'],
  ['encore/components/song/encoreDragPayload.ts', 'classifies a drag for slot highlighting'],
  ['gesture/drive/gestureFolderPicker.ts', 'wraps showDirectoryPicker for its caller'],
  // Stanza: these hand files to StanzaWorkspace, which stages them (useStanzaUploadStaging).
  ['stanza/components/stanzaWorkspace/StanzaLandingHero.tsx', 'passes the picked file to onUploadFile'],
  ['stanza/components/stanzaWorkspace/StanzaLibraryFooterPanel.tsx', 'passes the picked file to onUploadFile'],
  ['stanza/components/stanzaWorkspace/StanzaPracticeMixSection.tsx', 'passes the picked stem to onAddStemFromFile'],
  ['stanza/hooks/useStanzaFileDrop.ts', 'passes dropped files to onAudioFiles'],
]);

const SAVES_NOTHING = new Map([
  ['palette/App.tsx', 'builds a palette from dropped images; stores nothing'],
  ['palette/components/PalettegenToolbar.tsx', 'builds a palette from an image; stores nothing'],
  ['shared/palette/LabsPaletteBuilder.tsx', 'reads an image for its colours; the image is not kept'],
  ['zines/App.tsx', 'booklet images live in React state only'],
  ['zines/components/ImageUploaderSlot.tsx', 'booklet images live in React state only'],
  ['zines/components/SpreadPreview.tsx', 'booklet images live in React state only'],
  ['ui/melodia/MelodiaCorpusReview.tsx', 'dev page that previews MusicXML'],
]);

/** Migration plan (ADR 0030 § Rollout). Delete a row when its module stages. */
const PENDING = new Map([
  // Encore: performance videos stage until Save, and bulk imports review, each in their own UI
  ['encore/components/song/SongPerformancesPanel.tsx', 'drop opens the performance editor (stages until Save)'],
  ['encore/components/song/SongPerformancesCompactPanel.tsx', 'drop opens the performance editor (stages until Save)'],
  ['encore/components/song/usePerformanceSectionDrop.ts', 'drop opens the performance editor (stages until Save)'],
  ['encore/components/performance/PerformanceAddVideoSourceStrip.tsx', 'stages until Save in its own UI'],
  ['encore/components/performance/PerformanceEditorVideosDropZone.tsx', 'stages until Save in its own UI'],
  ['encore/components/BulkPerformanceImportDialog.tsx', 'reviews in its own dialog'],
  ['encore/components/BulkScoreImportDialog.tsx', 'reviews in its own dialog'],
  // Zine Box: one PDF imports at once; two or more review in a dialog
  ['zinebox/components/ZineboxLibraryAddPanel.tsx', 'single PDF imports on pick'],
  ['zinebox/hooks/useZineboxLibraryDrop.ts', 'single PDF imports on drop'],
  // Gesture: photo uploads start on pick or drop
  ['gesture/components/AddCollectionActions.tsx', 'uploads photos on pick'],
  ['gesture/components/InterruptedUploadBanner.tsx', 'resumes an upload on re-pick'],
  ['gesture/drive/gestureLocalFolderUpload.ts', 'folder upload'],
  // Lyrefly: pages, versions, concept art and sketchbook files save on pick, drop or paste
  ['lyrefly/components/ArtPageGrid.tsx', 'pages and revisions save on pick'],
  ['lyrefly/components/ArtStage.tsx', 'pages save on drop'],
  ['lyrefly/components/ArtVersionPanel.tsx', 'versions save on pick'],
  ['lyrefly/components/BrainstormResourceDialog.tsx', 'confirms with Add but shows nothing to review'],
  ['lyrefly/components/LyreflyArtEmptyUpload.tsx', 'pages save on pick, drop or paste'],
  ['lyrefly/components/LyreflyConceptShelf.tsx', 'concept art saves on pick'],
  ['lyrefly/components/SketchbookSeedEditor.tsx', 'attachments save on pick'],
  ['lyrefly/components/SketchbookTab.tsx', 'seeds save on drop, paste or import'],
  ['lyrefly/utils/conceptShelfFileIntake.ts', 'concept art saves on drop or paste'],
]);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') out.push(...sourceFiles(abs));
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name) && !/^generated/.test(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

const files = sourceFiles(SRC).map((abs) => ({
  rel: path.relative(SRC, abs).split(path.sep).join('/'),
  code: fs.readFileSync(abs, 'utf8'),
}));
const intake = files.filter((f) => INTAKE.test(f.code));

describe('every upload stages before it saves (ADR 0030)', () => {
  it('finds the intake modules it governs', () => {
    expect(intake.length).toBeGreaterThan(20);
    // The migrated take controller must be seen as intake AND as staged, or the patterns drifted.
    const takes = intake.find((f) => f.rel === 'encore/originals/hooks/useOriginalsTakes.tsx');
    expect(takes, 'useOriginalsTakes no longer matches INTAKE').toBeDefined();
    expect(STAGED.test(takes!.code), 'useOriginalsTakes no longer matches STAGED').toBe(true);
  });

  it('classifies every intake module', () => {
    const unclassified = intake
      .filter((f) => !STAGED.test(f.code))
      .filter((f) => !FORWARDS.has(f.rel) && !SAVES_NOTHING.has(f.rel) && !PENDING.has(f.rel))
      .map((f) => f.rel);
    expect(
      unclassified,
      'These modules take files from the user without staging them. Stage with useLabsStagedUploads + ' +
        'LabsStagedUploadPanel (src/shared/upload), or add the module to a list here with a reason.',
    ).toEqual([]);
  });

  it('keeps every listed module real, so the lists cannot rot', () => {
    const intakeNames = new Set(intake.map((f) => f.rel));
    const stale = [...FORWARDS.keys(), ...SAVES_NOTHING.keys(), ...PENDING.keys()].filter(
      (rel) => !intakeNames.has(rel),
    );
    expect(stale, 'Listed modules that no longer take files in (moved, renamed or done). Remove them.').toEqual([]);
  });

  it('lets a primitive or a no-save module write nothing', () => {
    const WRITES =
      /driveUploadFileResumable|executeDriveFileImport|\b\w*[dD]b\.\w+\.(?:put|bulkPut|add|bulkAdd)\(|save\w*Blob\(|localStorage\.setItem/;
    const writers = [...FORWARDS.keys(), ...SAVES_NOTHING.keys()].filter((rel) =>
      WRITES.test(files.find((f) => f.rel === rel)?.code ?? ''),
    );
    expect(writers, 'A module listed as forwarding or saving nothing now writes. Stage it instead.').toEqual([]);
  });
});
