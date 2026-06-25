/** Count mesh boundary edges (edges belonging to exactly one triangle). Open seams inflate this count. */
export function countBoundaryEdges(indices: Uint32Array): number {
  const edgeCounts = new Map<string, number>();
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const tri = [indices[i]!, indices[i + 1]!, indices[i + 2]!];
    for (let e = 0; e < 3; e += 1) {
      const a = tri[e]!;
      const b = tri[(e + 1) % 3]!;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }
  let boundary = 0;
  for (const count of edgeCounts.values()) {
    if (count === 1) boundary += 1;
  }
  return boundary;
}
