import type {
  ComicArchiveBinder,
  ComicMacroSnapshot,
  ComicProject,
  PageNode,
  PageRevision,
  ScriptDocument,
  VisualDevAsset,
} from '../types';
import {
  buildLayoutWire,
  buildPageRevisionsWire,
  buildVisualDevIndexWire,
  parseLayoutWire,
  parsePageNodeJson,
  parsePageRevisionsWire,
  parseProjectJson,
  parseScriptDocumentJson,
  parseVisualDevIndexWire,
  serializeLayoutWire,
  serializePageNodeJson,
  serializePageRevisionsWire,
  serializeProjectJson,
  serializeScriptDocumentJson,
  serializeScriptMarkdown,
  serializeVisualDevIndexWire,
  lyreflyArchivePath,
  lyreflyVisualDevIndexPath,
} from './projectPackageWire';

/** In-memory representation of a full project package (flat-file tree). */
export interface LyreflyProjectPackage {
  project: ComicProject;
  layoutOrder: string[];
  script?: {
    markdown: string;
    document: ScriptDocument;
  };
  pageNodes: Map<string, { node: PageNode; revisions: PageRevision[] }>;
  visualDevAssets: VisualDevAsset[];
  snapshots: ComicMacroSnapshot[];
  archive?: ComicArchiveBinder;
}

export interface LyreflyProjectPackageFiles {
  [relativePath: string]: string;
}

export function projectPackageToFiles(pkg: LyreflyProjectPackage): LyreflyProjectPackageFiles {
  const files: LyreflyProjectPackageFiles = {};

  files['project.json'] = serializeProjectJson(pkg.project);
  files['layout.json'] = serializeLayoutWire(buildLayoutWire(pkg.layoutOrder));

  if (pkg.project.modules.script && pkg.script) {
    files['script/script.md'] = serializeScriptMarkdown(pkg.script.markdown);
    files['script/script.json'] = serializeScriptDocumentJson(pkg.script.document);
  }

  for (const [nodeId, entry] of pkg.pageNodes) {
    files[`pages/${nodeId}/node.json`] = serializePageNodeJson(entry.node);
    files[`pages/${nodeId}/revisions.json`] = serializePageRevisionsWire(
      buildPageRevisionsWire(entry.revisions),
    );
  }

  if (pkg.project.modules.visualDev && pkg.visualDevAssets.length > 0) {
    files[lyreflyVisualDevIndexPath()] = serializeVisualDevIndexWire(
      buildVisualDevIndexWire(pkg.visualDevAssets),
    );
  }

  for (const snapshot of pkg.snapshots) {
    files[`snapshots/${snapshot.id}.json`] = JSON.stringify(snapshot, null, 2);
  }

  if (pkg.archive) {
    files[lyreflyArchivePath()] = JSON.stringify(pkg.archive, null, 2);
  }

  return files;
}

export function projectPackageFromFiles(files: LyreflyProjectPackageFiles): LyreflyProjectPackage {
  const projectJson = files['project.json'];
  if (!projectJson) throw new Error('Project package is missing project.json.');
  const project = parseProjectJson(projectJson);

  const layoutJson = files['layout.json'];
  const layoutOrder = layoutJson ? parseLayoutWire(layoutJson).order : project.layoutOrder;

  let script: LyreflyProjectPackage['script'];
  const scriptMd = files['script/script.md'];
  const scriptJson = files['script/script.json'];
  if (scriptMd != null && scriptJson != null) {
    script = {
      markdown: scriptMd,
      document: parseScriptDocumentJson(scriptJson),
    };
  }

  const pageNodes = new Map<string, { node: PageNode; revisions: PageRevision[] }>();
  const nodeIdPattern = /^pages\/([^/]+)\/node\.json$/;
  for (const [path, content] of Object.entries(files)) {
    const match = path.match(nodeIdPattern);
    if (!match) continue;
    const nodeId = match[1]!;
    const node = parsePageNodeJson(content);
    const revisionsJson = files[`pages/${nodeId}/revisions.json`];
    const revisions = revisionsJson
      ? parsePageRevisionsWire(revisionsJson).revisions
      : [];
    pageNodes.set(nodeId, { node, revisions });
  }

  let visualDevAssets: VisualDevAsset[] = [];
  const visualDevIndex = files[lyreflyVisualDevIndexPath()];
  if (visualDevIndex) {
    visualDevAssets = parseVisualDevIndexWire(visualDevIndex).assets;
  }

  const snapshots: ComicMacroSnapshot[] = [];
  const snapshotPattern = /^snapshots\/(.+)\.json$/;
  for (const [path, content] of Object.entries(files)) {
    const match = path.match(snapshotPattern);
    if (!match) continue;
    snapshots.push(JSON.parse(content) as ComicMacroSnapshot);
  }

  let archive: ComicArchiveBinder | undefined;
  const archiveJson = files[lyreflyArchivePath()];
  if (archiveJson) {
    archive = JSON.parse(archiveJson) as ComicArchiveBinder;
  }

  return {
    project,
    layoutOrder,
    script,
    pageNodes,
    visualDevAssets,
    snapshots,
    archive,
  };
}

export function emptyProjectPackage(project: ComicProject, scriptDocument: ScriptDocument): LyreflyProjectPackage {
  return {
    project,
    layoutOrder: project.layoutOrder,
    script: project.modules.script
      ? { markdown: scriptDocument.markdown, document: scriptDocument }
      : undefined,
    pageNodes: new Map(),
    visualDevAssets: [],
    snapshots: [],
  };
}
