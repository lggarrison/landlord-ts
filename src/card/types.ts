import type { ManaCost } from "./mana-cost.js";
import { emptyManaCost, manaCostCmc } from "./mana-cost.js";

/** Internal card type — port of CardKind in lib/src/card/card.rs */
export enum CardKind {
  BasicLand = "BasicLand",
  TapLand = "TapLand",
  CheckLand = "CheckLand",
  ShockLand = "ShockLand",
  OtherLand = "OtherLand",
  ForcedLand = "ForcedLand",
  Creature = "Creature",
  Spell = "Spell",
  Enchantment = "Enchantment",
  Instant = "Instant",
  Planeswalker = "Planeswalker",
  Sorcery = "Sorcery",
  Artifact = "Artifact",
  Unknown = "Unknown",
}

export enum Rarity {
  Common = "common",
  Uncommon = "uncommon",
  Rare = "rare",
  Mythic = "mythic",
  Special = "special",
  Bonus = "bonus",
  Other = "other",
}

export enum GameFormat {
  Standard = "standard",
  Other = "other",
}

/** Set code stored as a string (Rust uses a large enum). */
export type SetCode = string;

export type Card = {
  name: string;
  oracleId: string;
  manaCostString: string;
  imageUri: string;
  kind: CardKind;
  /** Stable hash of the card name (FNV-1a 64-bit). */
  hash: number;
  turn: number;
  manaCost: ManaCost;
  allManaCosts: ManaCost[];
  arenaId: number;
  rarity: Rarity;
  set: SetCode;
  isFace: boolean;
};

export function emptyCard(): Card {
  return {
    name: "",
    oracleId: "",
    manaCostString: "",
    imageUri: "",
    kind: CardKind.Unknown,
    hash: 0,
    turn: 0,
    manaCost: emptyManaCost(),
    allManaCosts: [],
    arenaId: 0,
    rarity: Rarity.Common,
    set: "",
    isFace: false,
  };
}

export function cloneCard(card: Card): Card {
  return {
    ...card,
    manaCost: { ...card.manaCost },
    allManaCosts: card.allManaCosts.map((c) => ({ ...c })),
  };
}

export function isLandKind(kind: CardKind): boolean {
  return (
    kind === CardKind.BasicLand ||
    kind === CardKind.ShockLand ||
    kind === CardKind.CheckLand ||
    kind === CardKind.TapLand ||
    kind === CardKind.OtherLand ||
    kind === CardKind.ForcedLand
  );
}

export function isLand(card: Card): boolean {
  return isLandKind(card.kind);
}

export function cardCmc(card: Card): number {
  return manaCostCmc(card.manaCost);
}

/** FNV-1a 64-bit — stable across runs (unlike Rust DefaultHasher). */
export function hashCardName(name: string): number {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < name.length; i++) {
    hash ^= BigInt(name.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * prime);
  }
  // JS number loses precision above 2^53; keep as unsigned 53-bit for Set keys.
  // For equality we only need consistency within this process — use full via string if needed.
  // SimCard compares hashes with ===; FNV truncated to safe integer is fine.
  return Number(hash & 0x1fffffffffffffn);
}

export function parseRarity(raw: string): Rarity {
  switch (raw.toLowerCase()) {
    case "common":
      return Rarity.Common;
    case "uncommon":
      return Rarity.Uncommon;
    case "rare":
      return Rarity.Rare;
    case "mythic":
      return Rarity.Mythic;
    case "special":
      return Rarity.Special;
    case "bonus":
      return Rarity.Bonus;
    default:
      return Rarity.Other;
  }
}

export function parseSetCode(raw: string): SetCode {
  return raw.toLowerCase();
}
