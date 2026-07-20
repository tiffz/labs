import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const scriptFilePath = decodeURIComponent(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(path.dirname(scriptFilePath), '..');
const checkMode = process.argv.includes('--check');

const CURSOR_RULES_DIR = path.join(repoRoot, '.cursor/rules');
const CURSOR_SKILLS_DIR = path.join(repoRoot, '.cursor/skills');
const CLAUDE_RULES_DIR = path.join(repoRoot, '.claude/rules');
const CLAUDE_SKILLS_DIR = path.join(repoRoot, '.claude/skills');

const GENERATED_NOTE =
  '<!-- AUTO-GENERATED from .cursor/{source} — do not edit directly. ' +
  'Edit the source and run `npm run generate:claude-guidance`. -->';

function toRelative(absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join('/');
}

function fileExists(absPath) {
  try {
    fs.accessSync(absPath);
    return true;
  } catch {
    return false;
  }
}

/** Splits a `.mdc`/`.md` file into {frontmatter: Map, body: string}. */
function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0].trim() !== '---') return { frontmatter: new Map(), body: content };

  const frontmatter = new Map();
  let i = 1;
  let currentListKey = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') {
      i++;
      break;
    }
    const listItemMatch = line.match(/^\s*-\s*(.+)$/);
    if (listItemMatch && currentListKey) {
      frontmatter.get(currentListKey).push(listItemMatch[1].trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyMatch) continue;
    const [, key, rest] = keyMatch;
    if (rest.trim() === '') {
      frontmatter.set(key, []);
      currentListKey = key;
    } else {
      frontmatter.set(key, rest.trim().replace(/^["']|["']$/g, ''));
      currentListKey = null;
    }
  }
  const body = lines.slice(i).join('\n').replace(/^\n+/, '');
  return { frontmatter, body };
}

function rewriteMdcLinks(body) {
  // Same-directory sibling rule links, e.g. (flaky-tests.mdc) -> (flaky-tests.md)
  // and any relative path ending in rules/<name>.mdc, e.g. (../../rules/x.mdc).
  return body.replace(/((?:\.\.\/)*(?:rules\/)?[A-Za-z0-9_-]+)\.mdc\b/g, '$1.md');
}

function generateRuleFile(mdcFileName) {
  const sourceRel = `rules/${mdcFileName}`;
  const sourceAbs = path.join(CURSOR_RULES_DIR, mdcFileName);
  const content = fs.readFileSync(sourceAbs, 'utf8');
  const { frontmatter, body } = parseFrontmatter(content);

  const description = frontmatter.get('description');
  const globs = Array.isArray(frontmatter.get('globs')) ? frontmatter.get('globs') : null;
  const alwaysApply = frontmatter.get('alwaysApply') === 'true';
  const hasPaths = globs && globs.length > 0 && !alwaysApply;

  const parts = [];
  if (hasPaths) {
    parts.push('---', 'paths:');
    for (const glob of globs) parts.push(`  - "${glob}"`);
    parts.push('---', '');
  }
  parts.push(GENERATED_NOTE.replace('{source}', sourceRel));
  if (description) parts.push('', `> ${description}`);
  parts.push('', rewriteMdcLinks(body).trimEnd(), '');

  const outName = mdcFileName.replace(/\.mdc$/, '.md');
  return { outName, content: parts.join('\n') };
}

function generateRules() {
  const mdcFiles = fs
    .readdirSync(CURSOR_RULES_DIR)
    .filter((name) => name.endsWith('.mdc'))
    .sort();

  const generated = new Map();
  for (const mdcFileName of mdcFiles) {
    const { outName, content } = generateRuleFile(mdcFileName);
    generated.set(outName, content);
  }
  return generated;
}

function copySkillTree(skillName) {
  const sourceDir = path.join(CURSOR_SKILLS_DIR, skillName);
  const generated = new Map(); // relPath within skill dir -> content (string) or Buffer

  function walk(dirAbs, dirRel) {
    for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
      const entryAbs = path.join(dirAbs, entry.name);
      const entryRel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(entryAbs, entryRel);
        continue;
      }
      if (entry.name.endsWith('.md')) {
        const raw = fs.readFileSync(entryAbs, 'utf8');
        const isSkillMd = entryRel === 'SKILL.md';
        const rewritten = rewriteMdcLinks(raw);
        const withNote = isSkillMd
          ? insertNoteAfterFrontmatter(rewritten, `skills/${skillName}/SKILL.md`)
          : rewritten;
        generated.set(entryRel, withNote);
      } else {
        generated.set(entryRel, fs.readFileSync(entryAbs));
      }
    }
  }

  walk(sourceDir, '');
  return generated;
}

function insertNoteAfterFrontmatter(content, sourceRel) {
  const lines = content.split('\n');
  if (lines[0].trim() !== '---') {
    return `${GENERATED_NOTE.replace('{source}', sourceRel)}\n\n${content}`;
  }
  const closeIdx = lines.slice(1).findIndex((line) => line.trim() === '---') + 1;
  const before = lines.slice(0, closeIdx + 1);
  const after = lines.slice(closeIdx + 1);
  return [...before, '', GENERATED_NOTE.replace('{source}', sourceRel), ...after].join('\n');
}

function generateSkills() {
  const skillNames = fs
    .readdirSync(CURSOR_SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const generated = new Map(); // skillName -> Map(relPath -> content)
  for (const skillName of skillNames) {
    generated.set(skillName, copySkillTree(skillName));
  }
  return generated;
}

function readExistingTree(rootDir) {
  const existing = new Map();
  if (!fileExists(rootDir)) return existing;

  function walk(dirAbs, dirRel) {
    for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
      const entryAbs = path.join(dirAbs, entry.name);
      const entryRel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(entryAbs, entryRel);
        continue;
      }
      existing.set(entryRel, fs.readFileSync(entryAbs));
    }
  }
  walk(rootDir, '');
  return existing;
}

function diffAndWrite(rootDir, desired, { check }) {
  const existing = readExistingTree(rootDir);
  const mismatches = [];

  for (const [relPath, content] of desired) {
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const existingBuf = existing.get(relPath);
    if (!existingBuf || !existingBuf.equals(buf)) {
      mismatches.push(relPath);
      if (!check) {
        const outAbs = path.join(rootDir, relPath);
        fs.mkdirSync(path.dirname(outAbs), { recursive: true });
        fs.writeFileSync(outAbs, buf);
      }
    }
    existing.delete(relPath);
  }

  // Anything left in `existing` is stale (source was removed/renamed).
  for (const staleRelPath of existing.keys()) {
    mismatches.push(`${staleRelPath} (stale)`);
    if (!check) fs.rmSync(path.join(rootDir, staleRelPath));
  }

  return mismatches;
}

const desiredRules = generateRules();
const desiredSkillTrees = generateSkills();
const desiredSkillFiles = new Map();
for (const [skillName, files] of desiredSkillTrees) {
  for (const [relPath, content] of files) {
    desiredSkillFiles.set(`${skillName}/${relPath}`, content);
  }
}

const ruleMismatches = diffAndWrite(CLAUDE_RULES_DIR, desiredRules, { check: checkMode });
const skillMismatches = diffAndWrite(CLAUDE_SKILLS_DIR, desiredSkillFiles, { check: checkMode });
const allMismatches = [...ruleMismatches, ...skillMismatches];

if (checkMode) {
  if (allMismatches.length > 0) {
    console.error('.claude/rules and/or .claude/skills are out of date with .cursor/. Out of date:');
    for (const m of allMismatches) console.error(`  - ${m}`);
    console.error('Run: npm run generate:claude-guidance');
    process.exit(1);
  }
  console.log('.claude/rules and .claude/skills are up to date.');
  process.exit(0);
}

if (allMismatches.length > 0) {
  console.log(
    `Generated ${desiredRules.size} rule file(s) and ${desiredSkillTrees.size} skill(s) (${allMismatches.length} file(s) changed).`
  );
} else {
  console.log('.claude/rules and .claude/skills already up to date.');
}
