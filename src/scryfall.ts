/**
 * Scryfall → landlord Card conversion.
 * Port of landlord lib/src/scryfall.rs (feat/enters-tapped-lands)
 * and flatten/filter from bins/scryfall2landlord (feat/jsonl-bulk-data-support).
 */
import {
  CardKind,
  basicLandTypeCount,
  basicLandTypesFromTypeLine,
  checkTypesFromOracleText,
  emptyManaCost,
  hashCardName,
  manaCostCmc,
  manaCostFromRgbuwc,
  manaCostsFromStr,
  ManaColor,
  normalizeOracleForEtb,
  parseRarity,
  type Card,
  type ManaCost,
  type SetCode,
} from './card/index.js';

export type ScryfallLegality = 'legal' | 'not_legal' | 'banned' | 'restricted' | string;

export type ScryfallCard = {
  name?: string;
  id?: string;
  oracle_id?: string;
  mana_cost?: string;
  oracle_text?: string;
  collector_number?: string;
  type_line?: string;
  color_identity?: string[];
  legalities?: Record<string, ScryfallLegality>;
  image_uris?: Record<string, string>;
  cmc?: number;
  arena_id?: number;
  card_faces?: ScryfallCard[];
  set?: string;
  set_type?: string;
  rarity?: string;
  object?: string;
  released_at?: string;
  lang?: string | null;
  promo?: boolean;
};

/** Override land color sources when Scryfall color_identity is wrong. */
export const SPECIAL_LANDS: ReadonlyMap<string, ManaCost> = new Map([
  ["Slayers' Stronghold", manaCostFromRgbuwc(0, 0, 0, 0, 0, 1)],
  ["Alchemist's Refuge", manaCostFromRgbuwc(0, 0, 0, 0, 0, 1)],
  ['Desolate Lighthouse', manaCostFromRgbuwc(0, 0, 0, 0, 0, 1)],
  ['Command Tower', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Opal Palace', manaCostFromRgbuwc(1, 1, 1, 1, 1, 1)],
  ['Path of Ancestry', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Arid Mesa', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Bloodstained Mire', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Flooded Strand', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Marsh Flats', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Misty Rainforest', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Polluted Delta', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Scalding Tarn', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Verdant Catacombs', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Windswept Heath', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Wooded Foothills', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Fabled Passage', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Evolving Wilds', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Axgard Armory', manaCostFromRgbuwc(0, 0, 0, 0, 1, 0)],
  ['Bretagard Stronghold', manaCostFromRgbuwc(0, 1, 0, 0, 0, 0)],
  ['Gates of Istfell', manaCostFromRgbuwc(0, 0, 0, 0, 1, 0)],
  ['Gnottvold Slumbermound', manaCostFromRgbuwc(1, 0, 0, 0, 0, 0)],
  ['Great Hall of Starnheim', manaCostFromRgbuwc(0, 0, 1, 0, 0, 0)],
  ['Immersturm Skullcairn', manaCostFromRgbuwc(0, 0, 1, 0, 0, 0)],
  ['Littjara Mirrorlake', manaCostFromRgbuwc(0, 0, 0, 1, 0, 0)],
  ['Port of Karfell', manaCostFromRgbuwc(0, 0, 0, 1, 0, 0)],
  ['Skemfar Elderhall', manaCostFromRgbuwc(0, 1, 0, 0, 0, 0)],
  ['Surtland Frostpyre', manaCostFromRgbuwc(1, 0, 0, 0, 0, 0)],
  ['Terramorphic Expanse', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Prismatic Vista', manaCostFromRgbuwc(1, 1, 1, 1, 1, 0)],
  ['Barkchannel Pathway // Tidechannel Pathway', manaCostFromRgbuwc(0, 1, 0, 1, 0, 0)],
  ['Barkchannel Pathway', manaCostFromRgbuwc(0, 1, 0, 0, 0, 0)],
  ['Tidechannel Pathway', manaCostFromRgbuwc(0, 0, 0, 1, 0, 0)],
  ['Blightstep Pathway // Searstep Pathway', manaCostFromRgbuwc(1, 0, 1, 0, 0, 0)],
  ['Blightstep Pathway', manaCostFromRgbuwc(0, 0, 1, 0, 0, 0)],
  // Matches Rust SPECIAL_LANDS (historical quirk: U instead of R)
  ['Searstep Pathway', manaCostFromRgbuwc(0, 0, 0, 1, 0, 0)],
  ['Branchloft Pathway // Boulderloft Pathway', manaCostFromRgbuwc(0, 1, 0, 0, 1, 0)],
  ['Branchloft Pathway', manaCostFromRgbuwc(0, 1, 0, 0, 0, 0)],
  ['Boulderloft Pathway', manaCostFromRgbuwc(0, 0, 0, 0, 1, 0)],
  ['Brightclimb Pathway // Grimclimb Pathway', manaCostFromRgbuwc(0, 0, 1, 0, 1, 0)],
  ['Brightclimb Pathway', manaCostFromRgbuwc(0, 0, 0, 0, 1, 0)],
  ['Grimclimb Pathway', manaCostFromRgbuwc(0, 0, 1, 0, 0, 0)],
  ['Clearwater Pathway // Murkwater Pathway', manaCostFromRgbuwc(0, 0, 1, 1, 0, 0)],
  ['Clearwater Pathway', manaCostFromRgbuwc(0, 0, 0, 1, 0, 0)],
  ['Murkwater Pathway', manaCostFromRgbuwc(0, 0, 1, 0, 0, 0)],
  ['Cragcrown Pathway // Timbercrown Pathway', manaCostFromRgbuwc(1, 1, 0, 0, 0, 0)],
  ['Cragcrown Pathway', manaCostFromRgbuwc(1, 0, 0, 0, 0, 0)],
  ['Timbercrown Pathway', manaCostFromRgbuwc(0, 1, 0, 0, 0, 0)],
  ['Darkbore Pathway // Slitherbore Pathway', manaCostFromRgbuwc(0, 1, 1, 0, 0, 0)],
  ['Darkbore Pathway', manaCostFromRgbuwc(0, 0, 1, 0, 0, 0)],
  ['Slitherbore Pathway', manaCostFromRgbuwc(0, 1, 0, 0, 0, 0)],
  ['Hengegate Pathway // Mistgate Pathway', manaCostFromRgbuwc(0, 0, 0, 1, 1, 0)],
  ['Hengegate Pathway', manaCostFromRgbuwc(0, 0, 0, 0, 1, 0)],
  ['Mistgate Pathway', manaCostFromRgbuwc(0, 0, 0, 1, 0, 0)],
  ['Needleverge Pathway // Pillarverge Pathway', manaCostFromRgbuwc(0, 0, 0, 0, 1, 0)],
  ['Needleverge Pathway', manaCostFromRgbuwc(1, 0, 0, 0, 0, 0)],
  ['Pillarverge Pathway', manaCostFromRgbuwc(0, 0, 0, 0, 1, 0)],
  ['Riverglide Pathway // Lavaglide Pathway', manaCostFromRgbuwc(1, 0, 0, 1, 0, 0)],
  ['Riverglide Pathway', manaCostFromRgbuwc(0, 0, 0, 1, 0, 0)],
  ['Lavaglide Pathway', manaCostFromRgbuwc(1, 0, 0, 0, 0, 0)],
  ['Kor Haven', manaCostFromRgbuwc(0, 0, 0, 0, 0, 1)],
]);

/**
 * Classify land ETB / nickname cycle from oracle text.
 * Order matters: conditional ETB matchers before bare TapLand; specialty untapped before Other.
 */
export function landKindFromOracleText(oracleText: string, typeLine: string, name = ''): CardKind {
  const text = normalizeOracleForEtb(oracleText);
  const isShock = text.includes('you may pay 2 life') && text.includes('enters tapped');
  const isCheck = text.includes('enters tapped unless you control a');
  const isFast = text.includes('two or fewer other lands');
  const isSlow = text.includes('two or more other lands');
  const isBattle = text.includes('two or more basic lands');
  const isTurn = text.includes('first, second, or third turn');
  const isBounce = text.includes('enters tapped') && text.includes('return a land you control');
  const isSurveil = text.includes('enters tapped') && text.includes('surveil');
  const isTriome = text.includes('enters tapped') && basicLandTypeCount(typeLine) >= 3;
  const isCycling = text.includes('enters tapped') && text.includes('cycling');
  const isTap = text.includes('enters tapped');
  const isFetch =
    text.includes('search your library') &&
    (text.includes('sacrifice') || text.includes('sac ')) &&
    (text.includes('basic land') ||
      text.includes('plains') ||
      text.includes('island') ||
      text.includes('swamp') ||
      text.includes('mountain') ||
      text.includes('forest'));
  const isCanopy =
    text.includes('draw a card') &&
    (text.includes('sacrifice this land') || text.includes('sacrifice ~'));
  const isPain =
    text.includes('deals 1 damage to you') && !text.includes('enters tapped') && !isCanopy;
  const isPathway = name.toLowerCase().includes('pathway');
  const isBasic = typeLine.includes('Basic Land');

  if (isShock) return CardKind.ShockLand;
  if (isCheck) return CardKind.CheckLand;
  if (isFast) return CardKind.FastLand;
  if (isSlow) return CardKind.SlowLand;
  if (isBattle) return CardKind.BattleLand;
  if (isTurn) return CardKind.TurnLand;
  if (isBounce) return CardKind.BounceLand;
  if (isSurveil) return CardKind.SurveilLand;
  if (isTriome) return CardKind.TriomeLand;
  if (isCycling) return CardKind.CyclingLand;
  if (isTap) return CardKind.TapLand;
  if (isFetch) return CardKind.FetchLand;
  if (isCanopy) return CardKind.CanopyLand;
  if (isPain) return CardKind.PainLand;
  if (isPathway) return CardKind.PathwayLand;
  if (isBasic) return CardKind.BasicLand;
  return CardKind.OtherLand;
}

/** Extract the ETB clause after "enters tapped" for mining / diagnostics. */
export function etbClauseFromOracle(oracleText: string): string | null {
  const text = normalizeOracleForEtb(oracleText);
  const idx = text.indexOf('enters tapped');
  if (idx === -1) return null;
  let clause = text.slice(idx);
  const end = clause.search(/[.\n]/);
  if (end !== -1) clause = clause.slice(0, end + 1);
  return clause.trim();
}

function colorLetter(color: ManaColor): string {
  switch (color) {
    case ManaColor.Red:
      return 'R';
    case ManaColor.Green:
      return 'G';
    case ManaColor.Black:
      return 'B';
    case ManaColor.Blue:
      return 'U';
    case ManaColor.White:
      return 'W';
    default:
      return '';
  }
}

function isColor01(
  colorIdentity: ReadonlySet<string>,
  oracleText: string,
  color: ManaColor,
): number {
  const letter = colorLetter(color);
  if (
    (letter !== '' && colorIdentity.has(letter)) ||
    (color === ManaColor.Colorless && colorIdentity.size === 0) ||
    (oracleText.includes('Add one mana of any color.') &&
      !oracleText.includes('Add one mana of any color. Spend this mana only'))
  ) {
    return 1;
  }
  return 0;
}

function resolveImageUri(card: ScryfallCard): string {
  const normal = card.image_uris?.['normal'];
  if (normal) return normal;
  return card.card_faces?.[0]?.image_uris?.['normal'] ?? '';
}

export function scryfallCardToCard(raw: ScryfallCard): Card {
  const name = raw.name ?? '';
  const oracleText = raw.oracle_text ?? '';
  const typeLine = raw.type_line ?? '';
  const manaCostStr = raw.mana_cost ?? '';
  const colorIdentity = new Set(raw.color_identity ?? []);
  const isLand = typeLine.includes('Land');

  let kind: CardKind;
  let manaCost: ManaCost;
  let allManaCosts: ManaCost[];
  let basicLandTypes = 0;
  let checkTypes = 0;

  if (isLand) {
    const special = SPECIAL_LANDS.get(name);
    manaCost =
      special ??
      manaCostFromRgbuwc(
        isColor01(colorIdentity, oracleText, ManaColor.Red),
        isColor01(colorIdentity, oracleText, ManaColor.Green),
        isColor01(colorIdentity, oracleText, ManaColor.Black),
        isColor01(colorIdentity, oracleText, ManaColor.Blue),
        isColor01(colorIdentity, oracleText, ManaColor.White),
        isColor01(colorIdentity, oracleText, ManaColor.Colorless),
      );
    kind = landKindFromOracleText(oracleText, typeLine, name);
    allManaCosts = [manaCost];
    basicLandTypes = basicLandTypesFromTypeLine(typeLine);
    checkTypes = kind === CardKind.CheckLand ? checkTypesFromOracleText(oracleText) : 0;
  } else {
    kind = CardKind.Unknown;
    allManaCosts = manaCostsFromStr(manaCostStr);
    const first = allManaCosts[0] ?? emptyManaCost();
    manaCost = manaCostFromRgbuwc(first.r, first.g, first.b, first.u, first.w, first.c);
  }

  const turn = Math.max(1, manaCostCmc(manaCost));
  const set: SetCode = (raw.set ?? '').toLowerCase();

  return {
    name,
    oracleId: raw.oracle_id ?? '',
    manaCostString: manaCostStr,
    imageUri: resolveImageUri(raw),
    kind,
    hash: hashCardName(name),
    turn,
    manaCost,
    allManaCosts,
    arenaId: raw.arena_id ?? 0,
    rarity: parseRarity(raw.rarity ?? ''),
    set,
    isFace: raw.object === 'card_face',
    basicLandTypes,
    checkTypes,
  };
}

export function isLegalInSomeFormat(card: ScryfallCard): boolean {
  const values = Object.values(card.legalities ?? {});
  // Rust: !legalities.values().all(|l| l == NotLegal); empty all() is true → filtered out
  return !values.every((l) => l === 'not_legal');
}

export function flattenScryfallCardFaces(cards: readonly ScryfallCard[]): ScryfallCard[] {
  const out: ScryfallCard[] = [...cards];
  for (const card of cards) {
    for (const face of card.card_faces ?? []) {
      const flattened: ScryfallCard = { ...face };
      const faceImages = face.image_uris ?? {};
      if (Object.keys(faceImages).length === 0) {
        flattened.image_uris = card.image_uris ? { ...card.image_uris } : {};
      }
      flattened.set = card.set;
      flattened.oracle_id = card.oracle_id;
      flattened.id = card.id;
      flattened.rarity = card.rarity;
      flattened.collector_number = card.collector_number;
      flattened.object = 'card_face';
      out.push(flattened);
    }
  }
  return out;
}

export function scryfallCardsToCards(cards: readonly ScryfallCard[]): Card[] {
  const filtered = cards.filter(isLegalInSomeFormat);
  const flattened = flattenScryfallCardFaces(filtered);
  return flattened.map(scryfallCardToCard);
}
