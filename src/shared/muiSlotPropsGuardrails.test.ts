import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * MUI v9 removed `inputProps` from the `TextField` family. Passing it does **not** throw and does
 * **not** fail typecheck — the object is spread onto the wrapper and lands in the DOM as the literal
 * attribute `inputprops="[object Object]"`. Anything it carried is silently dropped.
 *
 * That is almost always an `aria-label`, so the real control ends up with no accessible name and
 * nothing tells you. Three textareas in the Encore practice dialog and one in the Originals take row
 * were unnamed this way. Use `slotProps={{ htmlInput: { ... } }}` instead.
 *
 * `InputBase` (and the raw `Input` variants) still accept `inputProps`, so they are not flagged.
 */
const SLOT_PROPS_ONLY_COMPONENTS = ['TextField', 'Autocomplete', 'Select'];

function sourceFiles(dir = path.resolve(__dirname, '..'), out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) out.push(full);
  }
  return out;
}

/** Attribute span of a JSX opening tag: from `<Name` to the `>` that closes it. */
function openingTagSpans(source: string, componentName: string): string[] {
  const spans: string[] = [];
  const open = new RegExp(`<${componentName}[\\s/>]`, 'g');
  let m: RegExpExecArray | null;
  while ((m = open.exec(source)) !== null) {
    let depth = 0;
    let i = m.index + m[0].length - 1;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
      else if (ch === '>' && depth === 0) break;
    }
    spans.push(source.slice(m.index, i));
  }
  return spans;
}

describe('MUI v9 slotProps guardrails', () => {
  it('never passes `inputProps` to a component that silently drops it', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const source = readFileSync(file, 'utf8');
      if (!source.includes('inputProps')) continue;
      for (const component of SLOT_PROPS_ONLY_COMPONENTS) {
        for (const span of openingTagSpans(source, component)) {
          if (/(^|[\s{])inputProps\s*=/.test(span)) {
            offenders.push(`${path.relative(path.resolve(__dirname, '..'), file)} → <${component} inputProps=...>`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
