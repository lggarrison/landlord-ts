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

const output = run({
  code: `
1 Llanowar Elves
1 Forest
  `,
  runs: 10000,
  on_the_play: true,
  mulligan_down_to: 5,
  mulligan_on_lands: [0, 1, 6, 7],
  acceptable_hand_list: [],
});

console.log(output.card_observations);
```

Input/Output field names match the mtgoncurve.com contract (`snake_case`).

For the full `RunInput` / `RunOutput` contract, `runAsync` (progress callbacks), and Next.js SSE streaming, see the wiki:

- [mtgoncurve API](./wiki/concepts/mtgoncurve-api.md)
- [Streaming progress](./wiki/concepts/streaming-progress.md)

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
