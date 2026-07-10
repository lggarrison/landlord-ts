/**
 * Maximum bipartite matching — port of lib/src/bipartite.rs
 */
export function maximumBipartiteMatching(
  edges: number[],
  mCount: number,
  nCount: number,
  seen: boolean[],
  matches: number[],
): number {
  let matchCount = 0;
  for (let i = 0; i < matches.length; i++) matches[i] = -1;

  for (let m = 0; m < mCount; m++) {
    for (let i = 0; i < seen.length; i++) seen[i] = false;
    if (recursiveFindMatch(edges, nCount, m, seen, matches)) {
      matchCount += 1;
    }
  }
  return matchCount;
}

function recursiveFindMatch(
  edges: number[],
  nCount: number,
  m: number,
  seen: boolean[],
  matches: number[],
): boolean {
  for (let n = 0; n < nCount; n++) {
    const i = nCount * m + n;
    if (edges[i]! !== 0 && !seen[n]) {
      seen[n] = true;
      const prior = matches[n]!;
      const available =
        prior < 0 || recursiveFindMatch(edges, nCount, prior, seen, matches);
      if (available) {
        matches[n] = m;
        return true;
      }
    }
  }
  return false;
}
