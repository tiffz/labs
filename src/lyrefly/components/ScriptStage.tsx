import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

import { ensureScriptDocumentForProject } from '../script/useScriptDocument';
import { ScriptEditorShell } from '../script/ScriptEditorShell';
import type { ComicProject, ScriptDocument } from '../types';

export type ScriptStageProps = {
  project: ComicProject;
};

export function ScriptStage({ project }: ScriptStageProps): ReactElement {
  const [document, setDocument] = useState<ScriptDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void ensureScriptDocumentForProject(project.id, project.scriptDocumentId).then((doc) => {
      if (cancelled) return;
      setDocument(doc);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [project.id, project.scriptDocumentId]);

  if (loading || !document) {
    return <div aria-busy="true" />;
  }

  return (
    <ScriptEditorShell
      project={project}
      document={document}
      onDocumentSaved={setDocument}
      variant="embedded"
    />
  );
}
