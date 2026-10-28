import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Every way a file enters a Labs app goes through the shared upload code (ADR 0030): picked files
 * and pasted links stage for review, dropped files save at once through the same checks.
 *
 * The guard finds intake modules by what they DO — a file input, a drop handler reading
 * `dataTransfer.files`, a native file picker, a `DragDropFileUpload` consumer — so a new upload path
 * is enrolled by existing. Each must then be one of:
 *
 *  - **staged**: imports the shared staging (`src/shared/upload/`) or calls a `stage*()` or
 *    `save*Files*()` function that feeds it;
 *  - **forwards**: a primitive that hands files to its caller and writes nothing itself;
 *  - **saves nothing**: reads a file into memory only (a palette from an image, say);
 *  - **pending**: a known path not yet moved onto staging. This list is the migration plan. It may
 *    only shrink: delete the row in the PR that migrates the module.
 *
 * What this cannot see: whether a module sends a PICKED file to `save*()`, which would skip the
 * review, or saves through something other than the shared hook under a `save*` name. A source scan
 * cannot tell a picker from a drop. The shared hook's tests and the staged-upload e2e smokes cover
 * that split behaviourally.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', '..');

const INTAKE =
  /type="file"|\bonFiles=|dataTransfer\??\.files|showOpenFilePicker|showDirectoryPicker|\.getAsFile\(\)|webkitGetAsEntry/;
/**
 * Imports the shared staging, or calls a `stage*()` or `save*Files*()` function (directly or through a
 * ref). The save names are narrow on purpose: a bare `save*` would excuse `saveSong(` and the like.
 */
const STAGED = /shared\/upload\/|\b(?:stage[A-Z]\w*|save\w*Files\w*)(?:Ref\.current)?\(/;

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
  // Gesture: these hand picks to useGestureCollectionUpload, which stages them (useGestureUploadStaging).
  ['gesture/components/AddCollectionActions.tsx', 'passes picked photos and folders to the upload hook'],
  ['gesture/drive/gestureLocalFolderUpload.ts', 'reads a picked folder for the upload hook'],
  // Resuming an interrupted upload continues one the user already confirmed; it does not restage.
  ['gesture/components/InterruptedUploadBanner.tsx', 'resumes an upload already confirmed'],
  // Encore: these hand videos to PerformanceEditorDialog, which stages them until Save.
  ['encore/components/song/SongPerformancesPanel.tsx', 'a dropped video opens the performance editor'],
  ['encore/components/song/SongPerformancesCompactPanel.tsx', 'a dropped video opens the performance editor'],
  ['encore/components/song/usePerformanceSectionDrop.ts', 'passes a dropped video to onDropVideo'],
  ['encore/components/performance/PerformanceAddVideoSourceStrip.tsx', 'passes picked videos to onPickFiles'],
  ['encore/components/performance/PerformanceEditorVideosDropZone.tsx', 'passes dropped files to onDropVideos'],
  // Lyrefly: these hand files to a component that stages them.
  ['lyrefly/components/LyreflyArtEmptyUpload.tsx', 'passes picked, dropped and pasted pages to ArtStage'],
  ['lyrefly/components/BrainstormResourceDialog.tsx', 'holds the picked file, named, until "Add"'],
  // Zine Box's LibraryView sends every pick and drop to its "Review import" dialog, which shows
  // new vs duplicate PDFs before "Import N PDFs" (kept over the shared panel for the dedupe view).
  ['zinebox/components/ZineboxLibraryAddPanel.tsx', 'passes picked PDFs to the Review import dialog'],
  ['zinebox/hooks/useZineboxLibraryDrop.ts', 'passes dropped PDFs to the Review import dialog'],
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
  ['encore/components/BulkPerformanceImportDialog.tsx', 'reviews in its own dialog'],
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
