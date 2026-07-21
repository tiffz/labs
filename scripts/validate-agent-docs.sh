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

for skill_dir in .agents/skills/labs-*/; do
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

  if [ -d "${skill_dir}references" ]; then
    for ref in "${skill_dir}"references/*.md; do
      [ -f "$ref" ] || continue
      target=$(sed -n 's/.*(\(\.\.\/[^)]*\)).*/\1/p' "$ref" | head -1)
      if [ -n "$target" ]; then
        ref_dir=$(dirname "$ref")
        if [ ! -f "${ref_dir}/${target}" ]; then
          fail "${ref}: reference target missing (${target})"
        fi
      fi
    done
  fi
done

skills_readme=".agents/skills/README.md"
if [ -f "$skills_readme" ]; then
  for skill_dir in .agents/skills/labs-*/; do
    skill_name=$(basename "$skill_dir")
    if ! grep -q "\`${skill_name}\`" "$skills_readme" 2>/dev/null; then
      fail "${skills_readme} missing row for ${skill_name}"
    fi
  done
else
  fail "missing ${skills_readme}"
fi

echo "== check:agent-docs: agent rules index =="

rules_readme=".agents/rules/README.md"
for rule_file in .agents/rules/*.md; do
  base=$(basename "$rule_file")
  [ "$base" = "README.md" ] && continue
  if ! git ls-files --error-unmatch "$rule_file" >/dev/null 2>&1; then
    continue
  fi
  if ! grep -q "${base}" "$rules_readme" 2>/dev/null; then
    fail "${rules_readme} missing entry for ${base}"
  fi
done

echo "== check:agent-docs: AGENTS.md task routing skills =="

for skill_dir in .agents/skills/labs-*/; do
  skill_name=$(basename "$skill_dir")
  if ! grep -q "${skill_name}" AGENTS.md 2>/dev/null; then
    fail "AGENTS.md task routing missing reference to ${skill_name}"
  fi
done

echo "== check:agent-docs: nested AGENTS.md in root AGENTS.md =="

for agents_md in src/*/AGENTS.md; do
  [ -f "$agents_md" ] || continue
  if ! git ls-files --error-unmatch "$agents_md" >/dev/null 2>&1; then
    continue
  fi
  app_dir=$(dirname "$agents_md")
  app_name=$(basename "$app_dir")
  if ! grep -q "${app_dir}/AGENTS.md" AGENTS.md 2>/dev/null; then
    fail "AGENTS.md § Nested AGENTS.md missing link for ${app_dir}/AGENTS.md"
  fi
done

echo "== check:agent-docs: guidance evals artifact names =="

evals_doc="docs/GUIDANCE_EVALS.md"
if [ -f "$evals_doc" ]; then
  # Every labs-* skill named in a golden scenario must exist on disk.
  for skill in $(grep -o 'labs-[a-z0-9-]*' "$evals_doc" | sort -u); do
    if [ ! -d ".agents/skills/${skill}" ]; then
      fail "${evals_doc} references missing skill ${skill}"
    fi
  done
  # Every rule named in a golden scenario must exist on disk. Bare
  # backtick-wrapped names only (`flaky-tests.md`), not path-qualified doc
  # links (`docs/FLAKY_TESTS.md`) or fragments (CUJs.md).
  for rule in $(grep -oE '`[a-z0-9-]+\.md`' "$evals_doc" | tr -d '`' | sort -u); do
    if [ ! -f ".agents/rules/${rule}" ]; then
      fail "${evals_doc} references missing rule ${rule}"
    fi
  done
else
  fail "missing ${evals_doc}"
fi

echo "== check:agent-docs: process backlog root-cause labels =="

backlog_doc="docs/PROCESS_BACKLOG.md"
cpi_doc="docs/CONTINUOUS_PROCESS_IMPROVEMENT.md"
if [ -f "$backlog_doc" ] && [ -f "$cpi_doc" ]; then
  # Backlog rows: | P1 | `label` | proposal | status | — labels must exist in the
  # canonical root-cause class list (lines beginning "- `label`").
  labels_tmp=$(mktemp)
  grep -E '^\| P[0-9]' "$backlog_doc" | awk -F'|' '{print $3}' | sed -n 's/.*`\([^`]*\)`.*/\1/p' | sort -u > "$labels_tmp"
  while IFS= read -r label; do
    [ -n "$label" ] || continue
    if ! grep -qF -- "- \`${label}\`" "$cpi_doc"; then
      fail "${backlog_doc} uses root-cause label '${label}' missing from ${cpi_doc} canonical list"
    fi
  done < "$labels_tmp"
  rm -f "$labels_tmp"
else
  fail "missing ${backlog_doc} or ${cpi_doc}"
fi

echo "== check:agent-docs: mandatory feature-test matrix =="

strategy_doc="docs/TEST_STRATEGY.md"
if [ -f "$strategy_doc" ]; then
  if ! grep -q '^## Mandatory feature-test matrix' "$strategy_doc"; then
    fail "${strategy_doc} missing '## Mandatory feature-test matrix' section"
  fi
  if ! grep -q 'Mandatory feature-test matrix' AGENTS.md; then
    fail "AGENTS.md editing checklist must link TEST_STRATEGY.md § Mandatory feature-test matrix"
  fi
else
  fail "missing ${strategy_doc}"
fi

echo "== check:agent-docs: skills-ref validate =="

if command -v npx >/dev/null 2>&1; then
  for skill_dir in .agents/skills/labs-*/; do
    skill_name=$(basename "$skill_dir")
    if ! npx --yes skills-ref validate "$skill_dir"; then
      fail "skills-ref validate failed for ${skill_name}"
    fi
  done
else
  fail "npx not available for skills-ref validate"
fi

if [ "$failures" -gt 0 ]; then
  echo "check:agent-docs failed with ${failures} error(s)" >&2
  exit 1
fi

echo "check:agent-docs: ok"
