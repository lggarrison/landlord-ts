import type { ManaCost } from './mana-cost.js';

export type ManaColorCount = {
  total: number;
  c: number;
  w: number;
  u: number;
  b: number;
  r: number;
  g: number;
  wu: number;
  wb: number;
  ub: number;
  ur: number;
  br: number;
  bg: number;
  rg: number;
  rw: number;
  gw: number;
  gu: number;
};

export function newManaColorCount(): ManaColorCount {
  return {
    total: 0,
    b: 0,
    u: 0,
    g: 0,
    r: 0,
    w: 0,
    c: 0,
    wu: 0,
    wb: 0,
    ub: 0,
    ur: 0,
    br: 0,
    bg: 0,
    rg: 0,
    rw: 0,
    gw: 0,
    gu: 0,
  };
}

export function countManaColor(mcc: ManaColorCount, card: ManaCost): void {
  mcc.total += 1;
  mcc.u += card.u;
  mcc.r += card.r;
  mcc.b += card.b;
  mcc.g += card.g;
  mcc.w += card.w;
  mcc.c += card.c;
  const key = `${card.r},${card.g},${card.b},${card.u},${card.w}`;
  switch (key) {
    case '1,1,0,0,0':
      mcc.rg += 1;
      break;
    case '1,0,1,0,0':
      mcc.br += 1;
      break;
    case '1,0,0,1,0':
      mcc.ur += 1;
      break;
    case '1,0,0,0,1':
      mcc.rw += 1;
      break;
    case '0,1,1,0,0':
      mcc.bg += 1;
      break;
    case '0,1,0,1,0':
      mcc.gu += 1;
      break;
    case '0,1,0,0,1':
      mcc.gw += 1;
      break;
    case '0,0,1,1,0':
      mcc.ub += 1;
      break;
    case '0,0,1,0,1':
      mcc.wb += 1;
      break;
    case '0,0,0,1,1':
      mcc.wu += 1;
      break;
  }
}
