# @lggarrison/landlord-ts

Pure TypeScript Monte Carlo simulator for Magic: The Gathering on-curve probabilities. Port of the Rust [landlord](https://github.com/mtgoncurve/landlord) engine used by [mtgoncurve.com](https://mtgoncurve.com).

## Requirements

- Node.js **24** recommended (see `.nvmrc`); `engines.node` is `>=22`

## Install

```bash
npm install @lggarrison/landlord-ts
```

## Usage

```ts
import { run } from '@lggarrison/landlord-ts';

const runs = 10_000;
const output = run({
  code: `
1 Llanowar Elves
1 Forest
  `,
  runs,
  on_the_play: true,
  mulligan_down_to: 5,
  mulligan_on_lands: [0, 1, 6, 7],
  acceptable_hand_list: [],
});

console.log({
  deck_size: output.deck_size,
  deck_average_cmc: output.deck_average_cmc,
  total_simulations: output.total_simulations,
  // Often < 7: London mulligans put cards on the bottom
  avg_opening_hand_size: output.avg_opening_hand_size,
  avg_opening_land_count: output.avg_opening_land_count,
});

for (const row of output.cards) {
  console.log({
    name: row.name,
    mana_cost: row.mana_cost,
    copies: row.copies,
    played_on_curve: row.played_on_curve,
    not_played_on_curve: row.not_played_on_curve,
    total_simulations: row.total_simulations,
    p_cast_on_curve: row.p_cast_on_curve,
    p_mana_given_cmc: row.p_mana_given_cmc,
    not_enough_lands: row.not_enough_lands,
    color_or_timing_fail: row.color_or_timing_fail,
    mana_ok_undrawn: row.mana_ok_undrawn,
  });
}

for (const land of output.land_counts) {
  console.log({
    name: land.name,
    kind: land.kind,
    copies: land.copies,
  });
}
```

`RunInput` uses snake_case field names (mtgoncurve-inspired). `RunOutput` is a single flattened on-curve report (`cards`, ranked insights, land tallies).

For the full `RunInput` / `RunOutput` contract, `runAsync` (progress callbacks), and Next.js SSE streaming, see the wiki:

- [mtgoncurve API](https://github.com/lggarrison/landlord-ts/blob/develop/wiki/concepts/mtgoncurve-api.md)
- [Streaming progress](https://github.com/lggarrison/landlord-ts/blob/develop/wiki/concepts/streaming-progress.md)

## Development

```bash
npm install
npm run card-update   # fetch Scryfall bulk data → data/all_cards.json.gz
npm test
npm run build
npm run release:check
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the branch model, hooks, and PR checklist. Maintainers: [RELEASING.md](./RELEASING.md).

### Branching

- **`develop`** — integration branch; open feature PRs here
- **`main`** — releases only (`develop` → `main`)

### Wiki

This repo uses [llm-wiki-manager](https://github.com/lggarrison/llm-wiki-manager). See [`AGENTS.md`](./AGENTS.md) and [`wiki/AGENTS.md`](./wiki/AGENTS.md).

```bash
npm run wiki:help
npm run wiki:lint
```

## Card data

Shipped card data in `data/all_cards.json.gz` is derived from [Scryfall](https://scryfall.com/docs/api) bulk oracle data. This project is not affiliated with Scryfall. Regenerate with `npm run card-update`.

## License

[MIT](./LICENSE) — see also [SECURITY.md](./SECURITY.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
