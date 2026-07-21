import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SHARED_ROOT = import.meta.dirname;

/**
 * Directory-level dependency-cycle guardrail for `src/shared`.
 *
 * Two snapshots, both exact:
 *
 * 1. **Cyclic clusters** (strongly connected components with >1 module) —
 *    the tangled audio cluster is known debt (docs/TECH_DEBT_ROADMAP.md).
 *    A module joining a cluster, or two clusters merging, fails this test.
 * 2. **Mutual pairs** (a imports b and b imports a) — the tightest cycles;
 *    new ones fail even inside an existing cluster.
 *
 * When you break a cycle, shrink the snapshot so it cannot regress. Do not
 * grow the snapshots to land a feature — extract the shared piece into a
 * leaf module instead.
 */
const ALLOWLISTED_CLUSTERS: string[][] = [
  ['audio', 'beat', 'components', 'hooks', 'music', 'notation', 'playback', 'rhythm'],
  ['drive', 'google', 'session'],
];

const ALLOWLISTED_MUTUAL_PAIRS = new Set<string>([
  'audio↔beat',
  'audio↔components',
  'audio↔music',
  'audio↔playback',
  'audio↔rhythm',
  'components↔notation',
  'drive↔google',
  'google↔session',
  'music↔playback',
  'playback↔rhythm',
]);

function listModules(): string[] {
  return readdirSync(SHARED_ROOT).filter((name) => {
    const full = join(SHARED_ROOT, name);
    return statSync(full).isDirectory() && name !== 'templates' && name !== 'test';
  });
}

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** module -> set of sibling shared modules it imports from. */
function buildGraph(modules: string[]): Map<string, Set<string>> {
  const moduleSet = new Set(modules);
  const graph = new Map<string, Set<string>>(modules.map((m) => [m, new Set<string>()]));
  for (const mod of modules) {
    const edges = graph.get(mod)!;
    for (const file of walkFiles(join(SHARED_ROOT, mod))) {
      const src = readFileSync(file, 'utf8');
      for (const match of src.matchAll(/from\s+'((?:\.\.\/)+)([\w-]+)\//g)) {
        const target = match[2];
        if (target !== mod && moduleSet.has(target)) edges.add(target);
      }
    }
  }
  return graph;
}

/** Tarjan SCC — returns components with more than one member, members sorted. */
function findCyclicClusters(graph: Map<string, Set<string>>): string[][] {
  let index = 0;
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const clusters: string[][] = [];

  function strongconnect(node: string) {
    indices.set(node, index);
    lowlinks.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of graph.get(node) ?? []) {
      if (!indices.has(next)) {
        strongconnect(next);
        lowlinks.set(node, Math.min(lowlinks.get(node)!, lowlinks.get(next)!));
      } else if (onStack.has(next)) {
        lowlinks.set(node, Math.min(lowlinks.get(node)!, indices.get(next)!));
      }
    }

    if (lowlinks.get(node) === indices.get(node)) {
      const component: string[] = [];
      let member: string;
      do {
        member = stack.pop()!;
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      if (component.length > 1) clusters.push(component.sort());
    }
  }

  for (const node of graph.keys()) {
    if (!indices.has(node)) strongconnect(node);
  }
  return clusters.sort((a, b) => a[0].localeCompare(b[0]));
}

function findMutualPairs(graph: Map<string, Set<string>>): Set<string> {
  const pairs = new Set<string>();
  for (const [mod, edges] of graph) {
    for (const target of edges) {
      if (graph.get(target)?.has(mod)) {
        pairs.add([mod, target].sort().join('↔'));
      }
    }
  }
  return pairs;
}

describe('sharedModuleCycles', () => {
  const graph = buildGraph(listModules());

  it('cyclic clusters match the allowlist exactly (no new members, no merges)', () => {
    const clusters = findCyclicClusters(graph);
    expect(clusters).toEqual(
      ALLOWLISTED_CLUSTERS.map((c) => [...c].sort()).sort((a, b) => a[0].localeCompare(b[0])),
    );
  });

  it('mutual import pairs match the allowlist exactly', () => {
    const pairs = findMutualPairs(graph);
    const added = [...pairs].filter((p) => !ALLOWLISTED_MUTUAL_PAIRS.has(p));
    const removed = [...ALLOWLISTED_MUTUAL_PAIRS].filter((p) => !pairs.has(p));
    expect(added, `New mutual import pairs: ${added.join(', ')} — break the cycle instead.`).toEqual(
      [],
    );
    expect(
      removed,
      `Broken cycles still allowlisted (nice!): ${removed.join(', ')} — remove them so they cannot regress.`,
    ).toEqual([]);
  });
});
