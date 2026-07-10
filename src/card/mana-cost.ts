/** Mana cost and color helpers — port of lib/src/card/mana_cost.rs */

export type ManaCost = {
  bits: number;
  r: number;
  w: number;
  b: number;
  u: number;
  g: number;
  c: number;
};

export enum ManaColor {
  Red = 0,
  Green = 1,
  Black = 2,
  Blue = 3,
  White = 4,
  Colorless = 5,
}

export const R_BITS = 0b0000_0001;
export const G_BITS = 0b0000_0010;
export const B_BITS = 0b0000_0100;
export const U_BITS = 0b0000_1000;
export const W_BITS = 0b0001_0000;
export const C_BITS = 0b0010_0000;

export function emptyManaCost(): ManaCost {
  return { bits: 0, r: 0, w: 0, b: 0, u: 0, g: 0, c: 0 };
}

export function manaCostFromRgbuwc(
  r: number,
  g: number,
  b: number,
  u: number,
  w: number,
  c: number,
): ManaCost {
  return {
    bits: calculateSignature(r, g, b, u, w, c),
    r,
    w,
    b,
    u,
    g,
    c,
  };
}

export function manaCostCmc(cost: ManaCost): number {
  return cost.r + cost.w + cost.b + cost.u + cost.g + cost.c;
}

export function updateManaCostBits(cost: ManaCost): ManaCost {
  return {
    ...cost,
    bits: calculateSignature(cost.r, cost.g, cost.b, cost.u, cost.w, cost.c),
  };
}

function calculateSignature(
  r: number,
  g: number,
  b: number,
  u: number,
  w: number,
  c: number,
): number {
  return (
    ((Math.min(1, r) << 0) & R_BITS) |
    ((Math.min(1, g) << 1) & G_BITS) |
    ((Math.min(1, b) << 2) & B_BITS) |
    ((Math.min(1, u) << 3) & U_BITS) |
    ((Math.min(1, w) << 4) & W_BITS) |
    ((Math.min(1, c) << 5) & C_BITS)
  );
}

export function manaColorFromStr(color: string): ManaColor {
  switch (color.charAt(0)) {
    case 'B':
      return ManaColor.Black;
    case 'U':
      return ManaColor.Blue;
    case 'G':
      return ManaColor.Green;
    case 'R':
      return ManaColor.Red;
    case 'W':
      return ManaColor.White;
    default:
      return ManaColor.Colorless;
  }
}

function applyColor(cost: ManaCost, color: ManaColor, count: number): void {
  switch (color) {
    case ManaColor.Black:
      cost.b += count;
      break;
    case ManaColor.Blue:
      cost.u += count;
      break;
    case ManaColor.Green:
      cost.g += count;
      break;
    case ManaColor.Red:
      cost.r += count;
      break;
    case ManaColor.White:
      cost.w += count;
      break;
    case ManaColor.Colorless:
      cost.c += count;
      break;
  }
}

function manaCostKey(cost: ManaCost): string {
  return `${cost.r},${cost.g},${cost.b},${cost.u},${cost.w},${cost.c},${cost.bits}`;
}

function compareManaCost(a: ManaCost, b: ManaCost): number {
  if (a.bits !== b.bits) return a.bits - b.bits;
  if (a.r !== b.r) return a.r - b.r;
  if (a.w !== b.w) return a.w - b.w;
  if (a.b !== b.b) return a.b - b.b;
  if (a.u !== b.u) return a.u - b.u;
  if (a.g !== b.g) return a.g - b.g;
  return a.c - b.c;
}

/** Expand a mana cost string like "{2}{R/G}" into all concrete ManaCost combinations. */
export function manaCostsFromStr(manaCostStr: string): ManaCost[] {
  const symbolStack = manaCostSymbolsFromStr(manaCostStr);
  const results = new Map<string, ManaCost>();
  manaCostsFromStrRecur(results, emptyManaCost(), symbolStack, 0);
  return [...results.values()].sort(compareManaCost);
}

function manaCostsFromStrRecur(
  results: Map<string, ManaCost>,
  current: ManaCost,
  symbolStack: Array<[ManaCost, ManaCost | null]>,
  idx: number,
): void {
  if (symbolStack.length <= idx) {
    const updated = updateManaCostBits(current);
    results.set(manaCostKey(updated), updated);
    return;
  }
  const [leftSym, rightSym] = symbolStack[idx]!;
  const left: ManaCost = {
    bits: 0,
    r: leftSym.r + current.r,
    g: leftSym.g + current.g,
    b: leftSym.b + current.b,
    u: leftSym.u + current.u,
    w: leftSym.w + current.w,
    c: leftSym.c + current.c,
  };
  manaCostsFromStrRecur(results, left, symbolStack, idx + 1);
  if (rightSym) {
    const right: ManaCost = {
      bits: 0,
      r: rightSym.r + current.r,
      g: rightSym.g + current.g,
      b: rightSym.b + current.b,
      u: rightSym.u + current.u,
      w: rightSym.w + current.w,
      c: rightSym.c + current.c,
    };
    manaCostsFromStrRecur(results, right, symbolStack, idx + 1);
  }
}

function manaCostSymbolsFromStr(manaCostStr: string): Array<[ManaCost, ManaCost | null]> {
  let sigil = '';
  const symbolStack: Array<[ManaCost, ManaCost | null]> = [];
  let shouldPushRight = false;
  let idx = 0;

  for (const ch of manaCostStr) {
    switch (ch) {
      case '{': {
        sigil = '';
        symbolStack.push([emptyManaCost(), null]);
        idx = symbolStack.length - 1;
        shouldPushRight = false;
        break;
      }
      case '/':
      case '\\': {
        const color = manaColorFromStr(sigil);
        const count = Number.parseInt(sigil, 10);
        const n = Number.isFinite(count) ? count : 1;
        const cost = emptyManaCost();
        applyColor(cost, color, n);
        symbolStack[idx]![0] = cost;
        shouldPushRight = true;
        sigil = '';
        break;
      }
      case '}': {
        const color = manaColorFromStr(sigil);
        const count = Number.parseInt(sigil, 10);
        const n = Number.isFinite(count) ? count : 1;
        const cost = emptyManaCost();
        applyColor(cost, color, n);
        if (shouldPushRight) {
          symbolStack[idx]![1] = cost;
        } else {
          symbolStack[idx]![0] = cost;
        }
        sigil = '';
        break;
      }
      default:
        sigil += ch;
        break;
    }
  }
  return symbolStack;
}
