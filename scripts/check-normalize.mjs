import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  finalizeCatalog,
  mergeModels,
  normalizeHuggingFace,
  normalizeModelsDev,
  normalizeOpenRouter,
} from '../server/normalize.mjs';

const SNAPSHOT_DIR = new URL('../server/data/', import.meta.url);
const loadSnapshot = async (file) => JSON.parse(await readFile(fileURLToPath(new URL(file, SNAPSHOT_DIR)), 'utf8'));
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const round = (value, digits) => {
  const factor = 10 ** digits;
  const result = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(result, -0) ? 0 : result;
};
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const nameCompare = (a, b) => compare(a.toLowerCase(), b.toLowerCase()) || compare(a, b);
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isNumberOrNull = (value) => value === null || isNumber(value);

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return round(sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid], 6);
}

function findHighlight(models, direction) {
  let best = null;
  for (const model of models) {
    const blend = model.pricing.blended;
    if (blend === null || !(blend > 0)) continue;
    if (best === null) {
      best = model;
      continue;
    }
    const delta = direction < 0 ? blend - best.pricing.blended : best.pricing.blended - blend;
    if (delta < -1e-9) best = model;
    else if (Math.abs(delta) <= 1e-9 && nameCompare(model.name, best.name) < 0) best = model;
  }
  return best;
}

function walkNumbers(value, path) {
  if (typeof value === 'number') {
    check(Number.isFinite(value), `${path} is not finite (${value})`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkNumbers(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) walkNumbers(item, `${path}.${key}`);
  }
}

const [openrouter, modelsdev, huggingface] = await Promise.all([
  loadSnapshot('openrouter-models.json'),
  loadSnapshot('modelsdev-models.json'),
  loadSnapshot('huggingface-models.json'),
]);
check(Array.isArray(openrouter?.data) && openrouter.data.length > 0, 'OpenRouter snapshot must contain a non-empty data array');
check(
  modelsdev?.providers && Object.keys(modelsdev.providers).length > 0,
  'models.dev snapshot must contain a non-empty providers map',
);
check(Array.isArray(huggingface?.data) && huggingface.data.length > 0, 'Hugging Face snapshot must contain a non-empty data array');

const normalized = [
  normalizeOpenRouter(openrouter.data),
  normalizeModelsDev(modelsdev.providers),
  normalizeHuggingFace(huggingface.data),
];
const sourceModelCounts = normalized.map((list) => list.length);
check(sourceModelCounts.every((count) => count > 0), `every source must normalize to models (${sourceModelCounts.join(', ')})`);

const { models, providers, stats } = finalizeCatalog(mergeModels(normalized));

walkNumbers({ models, providers, stats }, 'catalog');

check(models.length > 0, 'models must not be empty');
check(providers.length > 0, 'providers must not be empty');

const MODEL_FIELDS = [
  'id', 'name', 'provider', 'providerName', 'providerColor', 'created', 'description',
  'contextLength', 'maxOutput', 'pricing', 'inputModalities', 'outputModalities',
  'modality', 'isModerated', 'reasoning', 'benchmarks', 'supportedParameters',
  'sources', 'sourceLinks', 'downloads', 'likes', 'openWeights', 'license',
];
const PRICE_FIELDS = ['input', 'output', 'cacheRead', 'blended', 'isFree', 'isVariable', 'known'];
const PROVIDER_FIELDS = ['id', 'name', 'color', 'count', 'freeCount', 'avgInput', 'avgOutput', 'minBlended', 'maxContext'];
const STATS_FIELDS = [
  'totalModels', 'totalProviders', 'freeModels', 'variablePricing', 'reasoningModels',
  'openWeightModels', 'pricedModels', 'unpricedModels',
  'medianInput', 'medianOutput', 'medianBlended', 'maxContext', 'cheapest', 'priciest', 'updatedAt',
];

const ids = new Set();
const providerIds = new Set(providers.map((provider) => provider.id));
const providerById = new Map(providers.map((provider) => [provider.id, provider]));
const priceScale = [];

for (const model of models) {
  const label = `model ${model?.id ?? '<unknown>'}`;
  for (const field of MODEL_FIELDS) check(field in (model ?? {}), `${label}: missing ${field}`);

  check(typeof model.id === 'string' && model.id.length > 0, `${label}: invalid id`);
  check(!ids.has(model.id), `${label}: duplicate id`);
  ids.add(model.id);
  check(typeof model.name === 'string' && model.name.trim().length > 0, `${label}: invalid name`);
  check(typeof model.provider === 'string' && model.provider.length > 0, `${label}: invalid provider`);
  check(typeof model.providerName === 'string' && model.providerName.length > 0, `${label}: invalid providerName`);
  check(/^#[0-9a-f]{6}$/i.test(model.providerColor ?? ''), `${label}: invalid providerColor ${model.providerColor}`);
  check(isNumber(model.created), `${label}: created is not finite`);
  check(typeof model.description === 'string' && model.description.length <= 1200, `${label}: description invalid or over 1200 chars`);
  check(isNumber(model.contextLength) && model.contextLength >= 0, `${label}: invalid contextLength`);
  check(model.maxOutput === null || (isNumber(model.maxOutput) && model.maxOutput >= 0), `${label}: invalid maxOutput`);
  check(Array.isArray(model.inputModalities) && model.inputModalities.every((item) => typeof item === 'string'), `${label}: invalid inputModalities`);
  check(Array.isArray(model.outputModalities) && model.outputModalities.every((item) => typeof item === 'string'), `${label}: invalid outputModalities`);
  check(typeof model.modality === 'string', `${label}: invalid modality`);
  check(typeof model.isModerated === 'boolean', `${label}: invalid isModerated`);
  check(typeof model.reasoning === 'boolean', `${label}: invalid reasoning`);
  check(Array.isArray(model.supportedParameters) && model.supportedParameters.every((item) => typeof item === 'string'), `${label}: invalid supportedParameters`);
  check(
    Array.isArray(model.sources) && model.sources.length > 0 && model.sources.every((item) => ['openrouter', 'modelsdev', 'huggingface'].includes(item)),
    `${label}: invalid sources`,
  );
  check(new Set(model.sources).size === model.sources.length, `${label}: duplicate sources`);
  check(
    Array.isArray(model.sourceLinks) &&
      model.sourceLinks.length > 0 &&
      model.sourceLinks.every((link) => link && typeof link.id === 'string' && typeof link.label === 'string' && /^https?:\/\//.test(link.url)),
    `${label}: invalid sourceLinks`,
  );
  check(model.downloads === null || (isNumber(model.downloads) && model.downloads >= 0), `${label}: invalid downloads`);
  check(model.likes === null || (isNumber(model.likes) && model.likes >= 0), `${label}: invalid likes`);
  check(typeof model.openWeights === 'boolean', `${label}: invalid openWeights`);
  check(model.license === null || typeof model.license === 'string', `${label}: invalid license`);

  const pricing = model.pricing;
  check(pricing && typeof pricing === 'object', `${label}: missing pricing object`);
  for (const field of PRICE_FIELDS) check(pricing && field in pricing, `${label}: missing pricing.${field}`);
  for (const field of ['input', 'output', 'cacheRead']) {
    const value = pricing?.[field];
    check(isNumberOrNull(value), `${label}: pricing.${field} is not finite/null`);
    check(value === null || value >= 0, `${label}: pricing.${field} is negative`);
    check(value === null || value < 1000, `${label}: pricing.${field} looks un-scaled (${value})`);
    if (value !== null) priceScale.push(value);
  }
  check(pricing?.blended === null || (isNumber(pricing?.blended) && pricing.blended >= 0), `${label}: invalid blended`);
  check(pricing?.blended === null || pricing.blended < 1000, `${label}: blended looks un-scaled`);
  if (pricing?.blended !== null && isNumber(pricing?.blended)) priceScale.push(pricing.blended);
  check(typeof pricing?.isFree === 'boolean', `${label}: invalid isFree`);
  check(typeof pricing?.isVariable === 'boolean', `${label}: invalid isVariable`);
  check(typeof pricing?.known === 'boolean', `${label}: invalid known`);
  check(
    pricing?.known || (pricing?.input === null && pricing?.output === null && pricing?.cacheRead === null),
    `${label}: known is false but prices are present`,
  );

  if (pricing && pricing.input !== null && pricing.output !== null) {
    const expected = round((3 * pricing.input + pricing.output) / 4, 6);
    check(pricing.blended !== null, `${label}: blended should not be null`);
    check(Math.abs((pricing.blended ?? NaN) - expected) <= 1e-6, `${label}: blended ${pricing.blended} != expected ${expected}`);
  } else {
    check(pricing?.blended === null, `${label}: blended must be null when input/output are missing`);
  }

  if (pricing?.isFree) {
    check(pricing.input === 0 && pricing.output === 0, `${label}: free model must be 0/0`);
    check(pricing.blended === 0, `${label}: free model blended must be 0`);
  }

  const benchmarks = model.benchmarks;
  check(benchmarks && typeof benchmarks === 'object', `${label}: missing benchmarks`);
  for (const field of ['intelligence', 'coding', 'agentic']) {
    check(benchmarks && isNumberOrNull(benchmarks[field]), `${label}: benchmarks.${field} invalid`);
  }

  check(providerIds.has(model.provider), `${label}: provider ${model.provider} missing from providers`);
  const provider = providerById.get(model.provider);
  if (provider) {
    check(provider.name === model.providerName && provider.color === model.providerColor, `${label}: provider name/color mismatch`);
  }
}

check(priceScale.some((value) => value > 1), 'no price above $1/1M tokens; pricing scale looks wrong');
check(priceScale.every((value) => value < 1000), 'some prices exceed $1000/1M tokens; pricing scale looks wrong');

for (const provider of providers) {
  const label = `provider ${provider.id}`;
  for (const field of PROVIDER_FIELDS) check(field in provider, `${label}: missing ${field}`);
  check(/^#[0-9a-f]{6}$/i.test(provider.color ?? ''), `${label}: invalid color ${provider.color}`);
  check(typeof provider.name === 'string' && provider.name.length > 0, `${label}: invalid name`);
  check(Number.isInteger(provider.count) && provider.count > 0, `${label}: count must be > 0`);
  check(Number.isInteger(provider.freeCount) && provider.freeCount >= 0 && provider.freeCount <= provider.count, `${label}: invalid freeCount`);
  check(isNumberOrNull(provider.avgInput), `${label}: invalid avgInput`);
  check(isNumberOrNull(provider.avgOutput), `${label}: invalid avgOutput`);
  check(isNumberOrNull(provider.minBlended), `${label}: invalid minBlended`);
  check(isNumber(provider.maxContext) && provider.maxContext >= 0, `${label}: invalid maxContext`);

  const owned = models.filter((model) => model.provider === provider.id);
  check(owned.length === provider.count, `${label}: count ${provider.count} != ${owned.length} models`);
  check(owned.filter((model) => model.pricing.isFree).length === provider.freeCount, `${label}: freeCount mismatch`);
  const inputs = owned.map((model) => model.pricing.input).filter((value) => value !== null);
  const outputs = owned.map((model) => model.pricing.output).filter((value) => value !== null);
  const blends = owned.map((model) => model.pricing.blended).filter((value) => value !== null);
  const expectedAvgInput = inputs.length ? round(inputs.reduce((sum, value) => sum + value, 0) / inputs.length, 4) : null;
  const expectedAvgOutput = outputs.length ? round(outputs.reduce((sum, value) => sum + value, 0) / outputs.length, 4) : null;
  const expectedMin = blends.length ? round(Math.min(...blends), 6) : null;
  check(provider.avgInput === expectedAvgInput, `${label}: avgInput ${provider.avgInput} != ${expectedAvgInput}`);
  check(provider.avgOutput === expectedAvgOutput, `${label}: avgOutput ${provider.avgOutput} != ${expectedAvgOutput}`);
  check(provider.minBlended === expectedMin, `${label}: minBlended ${provider.minBlended} != ${expectedMin}`);
  check(provider.maxContext === Math.max(...owned.map((model) => model.contextLength)), `${label}: maxContext mismatch`);
  check(provider.color === owned[0].providerColor, `${label}: color differs from models`);
}

for (const field of STATS_FIELDS) check(field in stats, `stats: missing ${field}`);
check(stats.totalModels === models.length, `stats.totalModels ${stats.totalModels} != ${models.length}`);
check(stats.totalProviders === providers.length, `stats.totalProviders ${stats.totalProviders} != ${providers.length}`);
check(stats.freeModels === models.filter((model) => model.pricing.isFree).length, 'stats.freeModels mismatch');
check(stats.variablePricing === models.filter((model) => model.pricing.isVariable).length, 'stats.variablePricing mismatch');
check(stats.reasoningModels === models.filter((model) => model.reasoning).length, 'stats.reasoningModels mismatch');
check(stats.openWeightModels === models.filter((model) => model.openWeights).length, 'stats.openWeightModels mismatch');
check(stats.pricedModels === models.filter((model) => model.pricing.blended !== null).length, 'stats.pricedModels mismatch');
check(stats.unpricedModels === models.filter((model) => !model.pricing.known).length, 'stats.unpricedModels mismatch');
check(stats.maxContext === Math.max(...models.map((model) => model.contextLength)), 'stats.maxContext mismatch');
check(!Number.isNaN(Date.parse(stats.updatedAt)), 'stats.updatedAt is not an ISO timestamp');

const nonFree = models.filter((model) => !model.pricing.isFree);
const pluck = (field) => nonFree.map((model) => model.pricing[field]).filter((value) => value !== null);
const medians = {
  medianInput: median(pluck('input')),
  medianOutput: median(pluck('output')),
  medianBlended: median(pluck('blended')),
};
for (const [field, value] of Object.entries(medians)) {
  check(stats[field] === value, `stats.${field} ${stats[field]} != ${value}`);
}

const countSum = providers.reduce((sum, provider) => sum + provider.count, 0);
const freeSum = providers.reduce((sum, provider) => sum + provider.freeCount, 0);
check(countSum === models.length, `provider counts sum to ${countSum}, expected ${models.length}`);
check(freeSum === stats.freeModels, `provider freeCounts sum to ${freeSum}, expected ${stats.freeModels}`);

const cheapest = findHighlight(models, -1);
const priciest = findHighlight(models, 1);
check(stats.cheapest?.id === cheapest?.id, `stats.cheapest ${stats.cheapest?.id} != ${cheapest?.id}`);
check(stats.priciest?.id === priciest?.id, `stats.priciest ${stats.priciest?.id} != ${priciest?.id}`);
for (const [key, expected] of [['cheapest', cheapest], ['priciest', priciest]]) {
  const item = stats[key];
  if (!expected) {
    check(item === null, `stats.${key} should be null`);
    continue;
  }
  check(item && typeof item.name === 'string' && typeof item.providerName === 'string', `stats.${key} missing name/providerName`);
  check(item?.input === expected.pricing.input, `stats.${key}.input mismatch`);
  check(item?.output === expected.pricing.output, `stats.${key}.output mismatch`);
  check(item?.blended === expected.pricing.blended, `stats.${key}.blended mismatch`);
  check(isNumber(item?.input) && isNumber(item?.output) && isNumber(item?.blended), `stats.${key} prices must be numbers`);
}
check(!stats.cheapest || !stats.priciest || stats.cheapest.blended <= stats.priciest.blended, 'cheapest blended exceeds priciest');

for (let index = 1; index < models.length; index += 1) {
  const prev = models[index - 1];
  const current = models[index];
  const byProvider = nameCompare(prev.providerName, current.providerName);
  const ordered = byProvider < 0 || (byProvider === 0 && nameCompare(prev.name, current.name) <= 0);
  check(ordered, `models not sorted at index ${index}: ${prev.id} before ${current.id}`);
}
for (let index = 1; index < providers.length; index += 1) {
  check(nameCompare(providers[index - 1].name, providers[index].name) <= 0, `providers not sorted at index ${index}`);
}

const formatPrice = (value) => (value === null ? 'n/a' : `$${value}/1M`);
const payloadBytes = Buffer.byteLength(JSON.stringify({ source: 'snapshot', fetchedAt: stats.updatedAt, models, providers, stats }));

if (failures.length > 0) {
  for (const failure of failures.slice(0, 40)) console.error(`FAIL: ${failure}`);
  if (failures.length > 40) console.error(`FAIL: ...and ${failures.length - 40} more`);
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}

console.log(
  [
    `models ${models.length}`,
    `providers ${providers.length}`,
    `free ${stats.freeModels}`,
    `median blended ${formatPrice(stats.medianBlended)}`,
    `cheapest ${stats.cheapest.name} (${formatPrice(stats.cheapest.blended)})`,
    `priciest ${stats.priciest.name} (${formatPrice(stats.priciest.blended)})`,
    `max context ${stats.maxContext.toLocaleString('en-US')}`,
    `payload ${(payloadBytes / 1024).toFixed(0)}KB`,
  ].join(' | '),
);
