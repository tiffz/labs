import { describe, expect, it } from 'vitest';

import { emptyProjectPackage, projectPackageFromFiles, projectPackageToFiles } from './projectPackage';
import { createBlankComicProject, createBlankScriptDocument } from '../types';

describe('projectPackage', () => {
  it('round-trips project json and layout', () => {
    const project = createBlankComicProject();
    project.layoutOrder = ['n1', 'n2'];
    const scriptDoc = createBlankScriptDocument(project.id);
    scriptDoc.id = project.scriptDocumentId;
    scriptDoc.markdown = '## Page 1\n\n[P1]\n\nHello.';
    const pkg = emptyProjectPackage(project, scriptDoc);
    const files = projectPackageToFiles(pkg);
    const restored = projectPackageFromFiles(files);
    expect(restored.project.id).toBe(project.id);
    expect(restored.layoutOrder).toEqual(['n1', 'n2']);
    expect(restored.script?.markdown).toContain('## Page 1');
  });
});
