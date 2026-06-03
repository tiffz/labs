#!/usr/bin/env sh
# Validate agent guidance: repo skills frontmatter, rules index, key cross-links.
# Usage: npm run check:agent-docs

set -e

ROOT="$(CDPATH= cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

failures=0

fail() {
  echo "check:agent-docs: $1" >&2
  failures=$((failures + 1))
}

echo "== check:agent-docs: skills =="

for skill_dir in .cursor/skills/labs-*/; do
  [ -d "$skill_dir" ] || continue
  skill_name=$(basename "$skill_dir")
  skill_md="${skill_dir}SKILL.md"

  if [ ! -f "$skill_md" ]; then
    fail "missing SKILL.md in ${skill_name}"
    continue
  fi

  frontmatter=$(awk 'BEGIN{f=0} /^---$/{f++; next} f==1{print} f==2{exit}' "$skill_md")

  yaml_name=$(printf '%s\n' "$frontmatter" | sed -n 's/^name:[[:space:]]*//p' | head -1 | tr -d '\r')
  yaml_desc=$(printf '%s\n' "$frontmatter" | sed -n 's/^description:[[:space:]]*//p' | head -1 | tr -d '\r')

  if [ -z "$yaml_name" ]; then
    fail "${skill_name}: missing name in frontmatter"
  elif [ "$yaml_name" != "$skill_name" ]; then
    fail "${skill_name}: name '${yaml_name}' must match directory"
  fi

  if [ -z "$yaml_desc" ]; then
    fail "${skill_name}: missing description in frontmatter"
  elif [ "${#yaml_desc}" -gt 1024 ]; then
    fail "${skill_name}: description exceeds 1024 characters"
  fi

  case "$yaml_name" in
    *[!a-z0-9-]*|-*|*-) fail "${skill_name}: invalid name characters (use lowercase a-z, 0-9, hyphens)" ;;
  esac
done

skills_readme=".cursor/skills/README.md"
if [ -f "$skills_readme" ]; then
  for skill_dir in .cursor/skills/labs-*/; do
    skill_name=$(basename "$skill_dir")
    if ! grep -q "\`${skill_name}\`" "$skills_readme" 2>/dev/null; then
      fail "${skills_readme} missing row for ${skill_name}"
    fi
  done
else
  fail "missing ${skills_readme}"
fi

echo "== check:agent-docs: cursor rules index =="

rules_readme=".cursor/rules/README.md"
for mdc in .cursor/rules/*.mdc; do
  base=$(basename "$mdc")
  if ! grep -q "${base}" "$rules_readme" 2>/dev/null; then
    fail "${rules_readme} missing entry for ${base}"
  fi
done

echo "== check:agent-docs: AGENTS.md task routing skills =="

for skill_dir in .cursor/skills/labs-*/; do
  skill_name=$(basename "$skill_dir")
  if ! grep -q "${skill_name}" AGENTS.md 2>/dev/null; then
    fail "AGENTS.md task routing missing reference to ${skill_name}"
  fi
done

echo "== check:agent-docs: optional skills-ref validate =="

if command -v npx >/dev/null 2>&1; then
  for skill_dir in .cursor/skills/labs-*/; do
    skill_name=$(basename "$skill_dir")
    if npx --yes skills-ref validate "$skill_dir" >/dev/null 2>&1; then
      echo "  skills-ref ok: ${skill_name}"
    else
      echo "  skills-ref skipped or failed for ${skill_name} (non-blocking)"
    fi
  done
fi

if [ "$failures" -gt 0 ]; then
  echo "check:agent-docs failed with ${failures} error(s)" >&2
  exit 1
fi

echo "check:agent-docs: ok"
