import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const EXPORT_SCRIPT = path.join(REPO_ROOT, 'tools/muscle-anatomy/export_region_glb.py');

/** Neck / shoulder bridge and auxiliary patches that must stay routed in export predicates. */
const REQUIRED_NECK_SKIN_ROUTING = [
  'Deltopectoral triangle',
  'Triangle of auscultation',
  'Greater subclavian fossa',
  'Lesser supraclavicular fossa',
  'Carotid triangle',
  'Muscular triangle',
  'Submandibular triangle',
];

describe('skinPatchRoutingGuardrails', () => {
  it('routes known neck bridge and auxiliary skin patches in export_region_glb.py', () => {
    const exportScript = fs.readFileSync(EXPORT_SCRIPT, 'utf8');
    for (const patchName of REQUIRED_NECK_SKIN_ROUTING) {
      expect(exportScript, `missing export routing for ${patchName}`).toContain(patchName);
    }
  });
});
