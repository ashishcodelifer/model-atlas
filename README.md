# Model Atlas

An interactive atlas of AI model pricing. Explore hundreds of text models in a Cytoscape.js graph, compare input and output prices on a logarithmic scatter plot, estimate monthly spend, and export the full catalog.

**Live demo:** [model-atlas-xi.vercel.app](https://model-atlas-xi.vercel.app)
**Source:** [github.com/ashishcodelifer/model-atlas](https://github.com/ashishcodelifer/model-atlas)

The catalog is assembled at runtime from three public sources and merged into one normalized model list with per-model provenance. Typical builds contain **800+ models from ~75 providers**.

## Features

- **Atlas** — provider constellations, force-directed, concentric, and grid layouts powered by Cytoscape.js. Zoom-adaptive labels, keyboard navigation, and a detail drawer with source links.
- **Compare** — input-vs-output price scatter (log scale), multi-model selection, and a monthly bill calculator with workload presets.
- **Directory** — sortable table of every model with source badges, open-weight and pricing coverage, plus CSV export.
- **Filters** — capability, max blended price, context window, provider, and data source. Filters apply across all three views.
- **Provenance** — each model records which sources it came from, with links back to the original listing.
- **Honest pricing** — models with no published rate are labeled `Unlisted` (not `$0`) and excluded from rankings and cost estimates. Router/auction pricing is labeled `Variable`.
- **Resilient data** — live fetches with per-source snapshot fallback. The API reports `live`, `partial`, or `snapshot` mode.
- **Accessible and responsive** — keyboard-operable graph, skip link, reduced-motion support, and mobile layouts for the graph, table, and filter drawer.

## Data sources

| Source | Endpoint | What it contributes |
| --- | --- | --- |
| OpenRouter | `https://openrouter.ai/api/v1/models` | Verified listing pricing (input, output, cache read), context limits, capabilities, moderation |
| models.dev | `https://models.dev/api.json` | Pricing, limits, modalities, and metadata for 19 first-party vendors (OpenAI, Anthropic, Google, xAI, DeepSeek, Mistral, Meta, Alibaba, and others) |
| Hugging Face Hub | `https://huggingface.co/api/models?sort=downloads&direction=-1&limit=500&filter=text-generation` | Open-weight discovery, downloads, likes, license, repository links |

The API is fetched server-side; the browser only talks to this app's own `/api` routes.

### How the catalog is built

1. Each source is normalized into a common model shape (`server/normalize.mjs`).
2. models.dev is scoped to first-party vendor providers and filtered to text models; embeddings, image, speech, video, transcription, reranking, and realtime models are excluded.
3. Hugging Face is scoped to text-generation repositories from organizations with at least three models, excluding repackagers/quantizers, and capped at the top 240 by downloads.
4. Records are merged on `provider | normalized-slug` (`server/normalize.mjs`). Provenance, downloads, context, capabilities, and pricing are combined.
5. Pricing precedence is **OpenRouter → models.dev → Hugging Face**. Hugging Face publishes no prices, so HF-only models are marked unlisted.
6. Statistics (provider counts, medians, free/reasoning/open-weight counts) are recomputed after merging.

### Pricing definitions

- All prices are USD per 1M tokens. Per-token API values are multiplied by 1,000,000.
- Blended price is weighted 3:1 input:output: `(3 × input + output) / 4`.
- A model is **free** only when both input and output are exactly zero.
- `Unlisted` means no source publishes a rate; `Variable` means the provider uses dynamic/auction pricing.
- Cost estimates use list prices only. Batch discounts, caching, negotiated rates, and taxes are not included.

## Tech stack

- **Frontend:** React 19, TypeScript (strict), Vite 7, Cytoscape.js 3.33
- **Backend:** Node.js 20+, Express 5
- **Deployment:** Vercel (static build + one serverless function), or any Node host

## Project structure

```
.
├── api/
│   └── index.mjs            # Vercel serverless entry (re-exports the Express app)
├── client/
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── components/      # GraphView, PriceScatter, CompareView, ModelsTable, DetailDrawer, ...
│       ├── hooks/
│       ├── lib/             # filters, formatting, constellation layout
│       ├── styles.css
│       └── types.ts
├── server/
│   ├── app.mjs              # Express app shared by local and serverless runtimes
│   ├── index.mjs            # Local listener
│   ├── normalize.mjs        # Source normalizers, merge, stats
│   ├── store.mjs            # Live fetch, cache, snapshot fallback
│   └── data/                # Committed fallback snapshots
├── scripts/
│   ├── snapshot.mjs         # Refresh the fallback snapshots
│   └── check-normalize.mjs  # Validate the merge pipeline
├── .opencode/agent/         # opencode subagent definitions used during development
├── vercel.json
└── package.json
```

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

- Web app: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:8787](http://localhost:8787)

`npm run dev` runs the API with `node --watch` and Vite with a proxy from `/api` to port 8787.

To run the production build locally:

```bash
npm run build
npm start
```

This serves the built client and API together at http://localhost:8787.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the API and Vite dev server together |
| `npm run dev:api` | API only, with file watching |
| `npm run dev:web` | Vite dev server only |
| `npm run build` | Production build into `dist/` |
| `npm start` | Serve `dist/` and the API from the Express server |
| `npm run typecheck` | TypeScript check, no emit |
| `npm run snapshot` | Fetch all three sources and rewrite `server/data/*.json` |
| `npm run check:normalize` | Normalize and merge the snapshots, then validate counts and fields |

## API

### `GET /api/models`

Returns the merged catalog:

```json
{
  "source": "live",
  "sources": [
    { "id": "openrouter", "mode": "live", "models": 469, "fetchedAt": "..." }
  ],
  "models": [],
  "providers": [],
  "stats": {}
}
```

Use `?refresh=1` to force a fresh upstream fetch.

### `GET /api/health`

Returns model/provider counts, per-source status, catalog mode, and whether each fallback snapshot is present. Useful for uptime checks:

```json
{
  "ok": true,
  "models": 833,
  "providers": 76,
  "source": "live",
  "snapshots": { "openrouter": true, "modelsdev": true, "huggingface": true }
}
```

## Data freshness and fallback

- Live responses are cached in memory for 10 minutes. Partial or snapshot results are cached for 60 seconds.
- If a source is unreachable, the server reads its committed snapshot from `server/data/`.
- If some sources are live and others fall back, the catalog reports `partial`. If none are live, it reports `snapshot`.
- Requests are deduplicated while a refresh is in flight.
- Upstream failures never take the whole app down as long as one source or snapshot is readable.

Refresh the committed snapshots with:

```bash
npm run snapshot
```

The script writes all three files atomically and exits nonzero if any source fails, so it can run in CI.

## Deployment

### Vercel

The repository is ready to deploy as a single Vercel project:

- `vercel.json` sets the build command, `dist` output, and rewrites `/api/*` to one function.
- `api/index.mjs` exports the same Express app used locally.
- `server/data/**` is bundled into the function via `includeFiles`, so snapshot fallback works in production. `/api/health` reports `snapshots` availability for verification.
- No environment variables or external database are required.

Deploy from the CLI:

```bash
vercel link --project model-atlas
vercel deploy --prod
```

Or import the GitHub repository in the Vercel dashboard; the detected settings work as-is.

### Any Node host

```bash
npm install
npm run build
PORT=8080 npm start
```

Serve the process behind a reverse proxy if you need TLS. The Express app already serves `dist/` with immutable caching for hashed assets and a no-cache fallback to `index.html`.

## Notes and limitations

- The catalog reflects publicly listed text-model pricing. It is not an exhaustive registry of every private or fine-tuned model.
- Provider pricing can change at any time; use `?refresh=1` or wait for the 10-minute cache to expire.
- Source data remains subject to each provider's terms of use. Links back to the original listings are included in the UI and CSV export.
- Median and cheapest-model figures are computed over currently priced, non-free models unless stated otherwise.

## Development subagents

The `opencode` subagent definitions used while building this project live in [`.opencode/agent/`](.opencode/agent):

- `catalog-auditor` — reviews source coverage, merge collisions, and provenance gaps.
- `pricing-analyst` — audits price units, blending, and unlisted/variable classification.
- `graph-reviewer` — reviews Cytoscape layout, filtering, and interaction behavior.
