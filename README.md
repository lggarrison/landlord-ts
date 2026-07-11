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

const input = {
  code: `
1 Llanowar Elves
1 Forest
  `,
  runs,
  onThePlay: true,
  mulliganDownTo: 5,
  mulliganOnLands: [0, 1, 6, 7],
  acceptableHandList: [],
};

const output = run(input);

console.log({
  deckSize: output.deckSize,
  deckAverageCmc: output.deckAverageCmc,
  totalSimulations: output.totalSimulations,
  // Often < 7: London mulligans put cards on the bottom
  avgOpeningHandSize: output.avgOpeningHandSize,
  avgOpeningLandCount: output.avgOpeningLandCount,
});

for (const row of output.cards) {
  console.log({
    name: row.name,
    manaCost: row.manaCost,
    copies: row.copies,
    playedOnCurve: row.playedOnCurve,
    notPlayedOnCurve: row.notPlayedOnCurve,
    totalSimulations: row.totalSimulations,
    pCastOnCurve: row.pCastOnCurve,
    pManaGivenCmc: row.pManaGivenCmc,
    notEnoughLands: row.notEnoughLands,
    colorOrTimingFail: row.colorOrTimingFail,
    manaOkUndrawn: row.manaOkUndrawn,
  });
}

for (const land of output.landCounts) {
  console.log({
    name: land.name,
    kind: land.kind,
    copies: land.copies,
  });
}
```

`RunInput` / `RunOutput` use camelCase field names. `RunOutput` is a single flattened on-curve report (`cards`, ranked insights, land tallies).

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
