---
type: concept
title: Streaming progress
last_updated: 2026-07-11T01:20:00Z
tags: [api, nextjs]
related: [concepts/mtgoncurve-api.md, entities/run.md, concepts/monte-carlo-simulation.md]
status: active
summary: Next.js SSE Pattern A using runAsync on_progress for live trial percent.
code_refs: [src/run.ts, src/simulation.ts]
---

# Streaming progress

Use [`runAsync`](mtgoncurve-api.md) when a host needs live trial progress (e.g. a Next.js UI). Sync [`run()`](mtgoncurve-api.md) cannot emit mid-run updates.

## Constraints

- Call from a **Node.js** runtime (`export const runtime = 'nodejs'`). Do not use the Edge runtime — parallel workers and card data assume Node.
- `runAsync` always generates hands in **sequential batches** so each `on_progress` tick can flush to a stream.
- Progress is `{ completed, total }` trial counts, not wall-clock time.

## Next.js SSE (Pattern A)

Route Handler opens a `ReadableStream`, runs `runAsync`, and writes SSE events:

```ts
// app/api/simulate/route.ts
import { NextRequest } from 'next/server';
import { runAsync } from '@lggarrison/landlord-ts';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        const result = await runAsync({
          code: body.code,
          runs: body.runs ?? 10_000,
          on_the_play: body.on_the_play ?? true,
          mulligan_down_to: body.mulligan_down_to ?? 5,
          mulligan_on_lands: body.mulligan_on_lands ?? [0, 1, 6, 7],
          acceptable_hand_list: body.acceptable_hand_list ?? [],
          seed: body.seed,
          epsilon: body.epsilon,
          batch_size: body.batch_size ?? 500,
          on_progress: (p) => send({ type: 'progress', ...p }),
        });
        send({ type: 'done', result });
      } catch (e) {
        send({ type: 'error', message: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

Client reader:

```ts
const res = await fetch('/api/simulate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(input),
});
const reader = res.body!.getReader();
const dec = new TextDecoder();
let buf = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  const parts = buf.split('\n');
  buf = parts.pop() ?? '';
  for (const line of parts) {
    if (!line.startsWith('data: ')) continue;
    const msg = JSON.parse(line.slice(6));
    if (msg.type === 'progress') setPct(msg.completed / msg.total);
    if (msg.type === 'done') setResult(msg.result);
  }
}
```

## See also

- [mtgoncurve API](mtgoncurve-api.md)
- [Run](../entities/run.md)
- [Monte Carlo simulation](monte-carlo-simulation.md)
