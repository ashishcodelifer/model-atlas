import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickModelsDevVendors } from '../server/normalize.mjs';

const DATA_DIR = fileURLToPath(new URL('../server/data', import.meta.url));

const SOURCES = [
  {
    id: 'openrouter',
    url: 'https://openrouter.ai/api/v1/models',
    file: 'openrouter-models.json',
    shape: (json) => json,
    describe: (json) => {
      if (!Array.isArray(json?.data) || json.data.length === 0) {
        throw new Error('response contained no data array');
      }
      return `${json.data.length} models`;
    },
  },
  {
    id: 'modelsdev',
    url: 'https://models.dev/api.json',
    file: 'modelsdev-models.json',
    shape: (json) => {
      const providers = pickModelsDevVendors(json);
      if (Object.keys(providers).length === 0) {
        throw new Error('response contained no first-party vendor providers');
      }
      return { updatedAt: new Date().toISOString(), providers };
    },
    describe: (json) => {
      const providers = pickModelsDevVendors(json);
      const models = Object.values(providers).reduce(
        (total, provider) => total + Object.keys(provider.models ?? {}).length,
        0,
      );
      return `${models} models across ${Object.keys(providers).length} vendors`;
    },
  },
  {
    id: 'huggingface',
    url: 'https://huggingface.co/api/models?sort=downloads&direction=-1&limit=500&filter=text-generation',
    file: 'huggingface-models.json',
    shape: (json) => {
      const models = Array.isArray(json) ? json : json?.data;
      if (!Array.isArray(models) || models.length === 0) {
        throw new Error('response contained no model array');
      }
      return { updatedAt: new Date().toISOString(), data: models };
    },
    describe: (json) => {
      const models = Array.isArray(json) ? json : json?.data;
      if (!Array.isArray(models) || models.length === 0) {
        throw new Error('response contained no model array');
      }
      return `${models.length} repositories`;
    },
  },
];

async function writeSnapshot(source) {
  const response = await fetch(source.url, {
    headers: { accept: 'application/json', 'user-agent': 'model-atlas/1.0' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`.trim());
  }

  const json = await response.json();
  const summary = source.describe(json);
  const output = path.join(DATA_DIR, source.file);
  const temp = path.join(DATA_DIR, `.${source.file}.${process.pid}.tmp`);

  try {
    await writeFile(temp, JSON.stringify(source.shape(json)), 'utf8');
    await rename(temp, output);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }

  return summary;
}

await mkdir(DATA_DIR, { recursive: true });

const results = await Promise.allSettled(SOURCES.map(writeSnapshot));

let failed = false;
results.forEach((result, index) => {
  const source = SOURCES[index];
  if (result.status === 'fulfilled') {
    console.log(`Snapshot written: ${source.id} - ${result.value} -> ${source.file}`);
  } else {
    failed = true;
    console.error(`Snapshot failed: ${source.id} - ${result.reason?.message ?? result.reason}`);
  }
});

console.log(`Snapshots completed at ${new Date().toISOString()}`);
if (failed) process.exitCode = 1;
