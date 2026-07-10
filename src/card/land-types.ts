/** Bitmask for basic land types (Plains / Island / Swamp / Mountain / Forest). */
export const BasicLandType = {
  Plains: 1 << 0,
  Island: 1 << 1,
  Swamp: 1 << 2,
  Mountain: 1 << 3,
  Forest: 1 << 4,
} as const;

const TYPE_NAME_TO_BIT: ReadonlyArray<[string, number]> = [
  ['plains', BasicLandType.Plains],
  ['island', BasicLandType.Island],
  ['swamp', BasicLandType.Swamp],
  ['mountain', BasicLandType.Mountain],
  ['forest', BasicLandType.Forest],
];

/** Parse Plains/Island/Swamp/Mountain/Forest subtypes from a type line. */
export function basicLandTypesFromTypeLine(typeLine: string): number {
  const lower = typeLine.toLowerCase();
  let bits = 0;
  for (const [name, bit] of TYPE_NAME_TO_BIT) {
    if (lower.includes(name)) bits |= bit;
  }
  return bits;
}

/** Count how many distinct basic land types appear on a type line (0–5). */
export function basicLandTypeCount(typeLine: string): number {
  const bits = basicLandTypesFromTypeLine(typeLine);
  let n = 0;
  for (let b = bits; b !== 0; b >>= 1) n += b & 1;
  return n;
}

/**
 * Parse check-land requirements from oracle text after "unless you control".
 * e.g. "enters tapped unless you control a Plains or an Island."
 */
export function checkTypesFromOracleText(oracleText: string): number {
  const lower = oracleText.toLowerCase();
  const idx = lower.indexOf('unless you control');
  if (idx === -1) return 0;
  const clause = lower.slice(idx);
  let bits = 0;
  for (const [name, bit] of TYPE_NAME_TO_BIT) {
    if (clause.includes(name)) bits |= bit;
  }
  return bits;
}

/** Normalize oracle for ETB clause mining / matching. */
export function normalizeOracleForEtb(oracleText: string): string {
  return oracleText
    .toLowerCase()
    .replace(/enters the battlefield tapped/g, 'enters tapped')
    .replace(/\s+/g, ' ')
    .trim();
}
