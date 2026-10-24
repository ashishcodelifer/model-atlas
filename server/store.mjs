import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  finalizeCatalog,
  mergeModels,
  normalizeHuggingFace,
  normalizeModelsDev,
  normalizeOpenRouter,
} from './normalize.mjs';

const LIVE_TTL = 10 * 60 * 1000;
const SNAPSHOT_TTL = 60 * 1000;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(HERE, 'data');

const SOURCES = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/models',
    file: 'openrouter-models.json',
    extract: (json) => {
      if (!Array.isArray(json?.data)) throw new Error('response contained no data array');
      return json.data;
    },
    normalize: normalizeOpenRouter,
  },
  {
    id: 'modelsdev',
    label: 'models.dev',
    url: 'https://models.dev/api.json',
    file: 'modelsdev-models.json',
    extract: (json) => {
      const raw = json?.providers ?? json;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error('response contained no provider map');
      }
      return raw;
    },
    normalize: normalizeModelsDev,
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    url: 'https://huggingface.co/api/models?sort=downloads&direction=-1&limit=500&filter=text-generation',
    file: 'huggingface-models.json',
    extract: (json) => {
      const raw = Array.isArray(json) ? json : json?.data;
      if (!Array.isArray(raw)) throw new Error('response contained no model array');
      return raw;
    },
    normalize: normalizeHuggingFace,
  },
];

let cache = null;
let inflight = null;

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'model-atlas/1.0' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`.trim());
  }
  return response.json();
}

async function readSnapshot(source) {
  const file = path.join(DATA_DIR, source.file);
  const [text, info] = await Promise.all([readFile(file, 'utf8'), stat(file)]);
  const models = source.normalize(source.extract(JSON.parse(text)));
  if (models.length === 0) throw new Error('snapshot contained no usable models');
  return { models, fetchedAt: info.mtime.toISOString() };
}

async function loadSource(source) {
  try {
    const json = await fetchJson(source.url);
    const models = source.normalize(source.extract(json));
    if (models.length === 0) throw new Error('returned no usable models');
    return { ...source, mode: 'live', models, fetchedAt: new Date().toISOString(), error: null };
  } catch (error) {
    const liveError = error instanceof Error ? error.message : String(error);
    console.warn(`[catalog] ${source.id} live failed: ${liveError}`);
    try {
      const snapshot = await readSnapshot(source);
      return { ...source, mode: 'snapshot', ...snapshot, error: liveError };
    } catch (snapshotError) {
      const snapshotMessage = snapshotError instanceof Error ? snapshotError.message : String(snapshotError);
      console.warn(`[catalog] ${source.id} snapshot failed: ${snapshotMessage}`);
      return {
        ...source,
        mode: 'unavailable',
        models: [],
        fetchedAt: null,
        error: `${liveError} · ${snapshotMessage}`,
      };
    }
  }
}

function catalogMode(statuses) {
  const live = statuses.filter((status) => status.mode === 'live').length;
  if (live === statuses.length) return 'live';
  if (live === 0) return 'snapshot';
  return 'partial';
}

export async function getCatalog({ force = false } = {}) {
  if (!force && cache && Date.now() < cache.expiresAt) return cache.catalog;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const results = await Promise.all(SOURCES.map(loadSource));
      const usable = results.filter((result) => result.models.length > 0);
      if (usable.length === 0) {
        throw new Error(
          `No model source was reachable (${results.map((result) => `${result.id}: ${result.error}`).join('; ')})`,
        );
      }

      const content = finalizeCatalog(mergeModels(usable.map((result) => result.models)));
      const source = catalogMode(results);
      const catalog = {
        source,
        fetchedAt: new Date().toISOString(),
        sources: results.map((result) => ({
          id: result.id,
          label: result.label,
          url: result.url,
          mode: result.mode,
          models: result.models.length,
          fetchedAt: result.fetchedAt,
          error: result.error,
        })),
        ...content,
      };

      cache = {
        catalog,
        expiresAt: Date.now() + (source === 'live' ? LIVE_TTL : SNAPSHOT_TTL),
      };
      console.log(
        `[catalog] ${source}: ${catalog.models.length} models, ${catalog.providers.length} providers ` +
          `(${results.map((result) => `${result.id}=${result.mode}:${result.models.length}`).join(', ')})`,
      );
      return catalog;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export async function getHealth() {
  const catalog = await getCatalog();
  return {
    ok: true,
    models: catalog.models.length,
    providers: catalog.providers.length,
    source: catalog.source,
    sources: catalog.sources,
    snapshots: Object.fromEntries(
      SOURCES.map((source) => [source.id, existsSync(path.join(DATA_DIR, source.file))]),
    ),
    fetchedAt: catalog.fetchedAt,
    expiresAt: new Date(cache.expiresAt).toISOString(),
  };
}

export function invalidateCatalog() {
  cache = null;
}
