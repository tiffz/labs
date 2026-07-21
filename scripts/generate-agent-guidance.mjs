import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Fans out the tool-agnostic .agents/rules and .agents/skills (the source
// of truth) into .cursor/rules + .cursor/skills (Cursor's native format)
// and .claude/rules + .claude/skills (Claude Code's native format). Edit
// .agents/, never the generated .cursor/ or .claude/ copies directly.

const scriptFilePath = decodeURIComponent(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(path.dirname(scriptFilePath), '..');
const checkMode = process.argv.includes('--check');

const AGENTS_RULES_DIR = path.join(repoRoot, '.agents/rules');
const AGENTS_SKILLS_DIR = path.join(repoRoot, '.agents/skills');
const CURSOR_RULES_DIR = path.join(repoRoot, '.cursor/rules');
const CURSOR_SKILLS_DIR = path.join(repoRoot, '.cursor/skills');
const CLAUDE_RULES_DIR = path.join(repoRoot, '.claude/rules');
const CLAUDE_SKILLS_DIR = path.join(repoRoot, '.claude/skills');

const GENERATED_NOTE =
  '<!-- AUTO-GENERATED from .agents/{source} — do not edit directly. ' +
  'Edit the source and run `npm run generate:agent-guidance`. -->';

function fileExists(absPath) {
  try {
    fs.accessSync(absPath);
    return true;
  } catch {
    return false;
  }
}

/** Splits a markdown file into {frontmatter: Map, body: string}. */
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

function ruleNameSet() {
  return new Set(
    fs
      .readdirSync(AGENTS_RULES_DIR)
      .filter((name) => name.endsWith('.md') && name !== 'README.md')
      .map((name) => name.replace(/\.md$/, ''))
  );
}

/** Rewrites links to known rule files from .md to .mdc, for the Cursor target only. */
function rewriteRuleLinksForCursor(body, knownRuleNames) {
  return body.replace(
    /((?:\.\.\/)*(?:rules\/)?)([A-Za-z0-9_-]+)\.md\b/g,
    (match, prefix, name) => (knownRuleNames.has(name) ? `${prefix}${name}.mdc` : match)
  );
}

// ---- Rules ----

function generateRuleForCursor(baseName, frontmatter, body, knownRuleNames) {
  const description = frontmatter.get('description');
  const globs = Array.isArray(frontmatter.get('globs')) ? frontmatter.get('globs') : null;
  const alwaysApply = frontmatter.has('alwaysApply') ? frontmatter.get('alwaysApply') : null;

  const parts = ['---'];
  if (description) parts.push(`description: ${description}`);
  if (alwaysApply !== null) parts.push(`alwaysApply: ${alwaysApply}`);
  if (globs && globs.length > 0) {
    parts.push('globs:');
    for (const glob of globs) parts.push(`  - ${glob}`);
  }
  parts.push('---', '');
  parts.push(GENERATED_NOTE.replace('{source}', `rules/${baseName}.md`));
  parts.push('', rewriteRuleLinksForCursor(body, knownRuleNames).trimEnd(), '');
  return parts.join('\n');
}

function generateRuleForClaude(baseName, frontmatter, body) {
  const description = frontmatter.get('description');
  const globs = Array.isArray(frontmatter.get('globs')) ? frontmatter.get('globs') : null;
  const alwaysApply = frontmatter.get('alwaysApply') === 'true';
  const hasPaths = globs && globs.length > 0 && !alwaysApply;

  const parts = [];
  if (hasPaths) {
    parts.push('---', 'paths:');
    // Single quotes match what prettier rewrites YAML frontmatter to. Emitting
    // double quotes here made `check:agent-guidance` unwinnable: the pre-commit
    // prettier pass reformatted the generated files, so a regenerate-and-commit
    // never matched a fresh generate. Globs never contain single quotes.
    for (const glob of globs) parts.push(`  - '${glob}'`);
    parts.push('---', '');
  }
  parts.push(GENERATED_NOTE.replace('{source}', `rules/${baseName}.md`));
  if (description) parts.push('', `> ${description}`);
  parts.push('', body.trimEnd(), '');
  return parts.join('\n');
}

function generateRules() {
  const knownRuleNames = ruleNameSet();
  const baseNames = [...knownRuleNames].sort();

  const cursorFiles = new Map();
  const claudeFiles = new Map();

  for (const baseName of baseNames) {
    const sourceAbs = path.join(AGENTS_RULES_DIR, `${baseName}.md`);
    const content = fs.readFileSync(sourceAbs, 'utf8');
    const { frontmatter, body } = parseFrontmatter(content);

    cursorFiles.set(`${baseName}.mdc`, generateRuleForCursor(baseName, frontmatter, body, knownRuleNames));
    claudeFiles.set(`${baseName}.md`, generateRuleForClaude(baseName, frontmatter, body));
  }

  return { cursorFiles, claudeFiles };
}

// ---- Skills ----

function walkSkillTree(sourceDir) {
  const files = new Map(); // relPath -> Buffer

  function walk(dirAbs, dirRel) {
    for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
      const entryAbs = path.join(dirAbs, entry.name);
      const entryRel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(entryAbs, entryRel);
        continue;
      }
      files.set(entryRel, fs.readFileSync(entryAbs));
    }
  }
  walk(sourceDir, '');
  return files;
}

function generateSkills() {
  const knownRuleNames = ruleNameSet();
  const skillNames = fs
    .readdirSync(AGENTS_SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const cursorFiles = new Map();
  const claudeFiles = new Map();

  for (const skillName of skillNames) {
    const tree = walkSkillTree(path.join(AGENTS_SKILLS_DIR, skillName));
    for (const [relPath, buf] of tree) {
      const isMd = relPath.endsWith('.md');
      const isSkillMd = relPath === 'SKILL.md';
      const outKey = `${skillName}/${relPath}`;

      if (!isMd) {
        cursorFiles.set(outKey, buf);
        claudeFiles.set(outKey, buf);
        continue;
      }

      const raw = buf.toString('utf8');
      const noted = isSkillMd ? insertNoteAfterFrontmatter(raw, `skills/${skillName}/SKILL.md`) : raw;

      claudeFiles.set(outKey, noted);
      cursorFiles.set(outKey, rewriteRuleLinksForCursor(noted, knownRuleNames));
    }
  }

  return { cursorFiles, claudeFiles };
}

// ---- Diff + write ----

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

function pointerReadme(kind, agentsPath) {
  return (
    `<!-- AUTO-GENERATED — do not edit directly. Edit ${agentsPath} and run \`npm run generate:agent-guidance\`. -->\n\n` +
    `# Generated ${kind}\n\n` +
    `This directory is generated from [\`${agentsPath}\`](../../${agentsPath}), the tool-agnostic source of truth. ` +
    `Do not hand-edit files here — edit the source and run \`npm run generate:agent-guidance\`.\n`
  );
}

const rules = generateRules();
const skills = generateSkills();

rules.cursorFiles.set('README.md', pointerReadme('Cursor rules', '.agents/rules/README.md'));
rules.claudeFiles.set('README.md', pointerReadme('Claude Code rules', '.agents/rules/README.md'));
skills.cursorFiles.set('README.md', pointerReadme('Cursor skills', '.agents/skills/README.md'));
skills.claudeFiles.set('README.md', pointerReadme('Claude Code skills', '.agents/skills/README.md'));

const mismatches = [
  ...diffAndWrite(CURSOR_RULES_DIR, rules.cursorFiles, { check: checkMode }),
  ...diffAndWrite(CLAUDE_RULES_DIR, rules.claudeFiles, { check: checkMode }),
  ...diffAndWrite(CURSOR_SKILLS_DIR, skills.cursorFiles, { check: checkMode }),
  ...diffAndWrite(CLAUDE_SKILLS_DIR, skills.claudeFiles, { check: checkMode }),
];

if (checkMode) {
  if (mismatches.length > 0) {
    console.error('.cursor/ and/or .claude/ are out of date with .agents/. Out of date:');
    for (const m of mismatches) console.error(`  - ${m}`);
    console.error('Run: npm run generate:agent-guidance');
    process.exit(1);
  }
  console.log('.cursor/ and .claude/ are up to date with .agents/.');
  process.exit(0);
}

if (mismatches.length > 0) {
  console.log(`Generated .cursor/ and .claude/ from .agents/ (${mismatches.length} file(s) changed).`);
} else {
  console.log('.cursor/ and .claude/ already up to date with .agents/.');
}
