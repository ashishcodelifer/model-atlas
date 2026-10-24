const BRAND_NAMES = {
  openai: 'OpenAI',
  'openai-community': 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  'meta-llama': 'Meta',
  meta: 'Meta',
  mistralai: 'Mistral AI',
  mistral: 'Mistral AI',
  deepseek: 'DeepSeek',
  'deepseek-ai': 'DeepSeek',
  qwen: 'Qwen',
  alibaba: 'Qwen',
  'x-ai': 'xAI',
  xai: 'xAI',
  moonshotai: 'Moonshot AI',
  cohere: 'Cohere',
  amazon: 'Amazon',
  microsoft: 'Microsoft',
  nvidia: 'NVIDIA',
  perplexity: 'Perplexity',
  ai21: 'AI21 Labs',
  minimax: 'MiniMax',
  minimaxai: 'MiniMax',
  'z-ai': 'Z.AI',
  zhipuai: 'Z.AI',
  'zai-org': 'Z.AI',
  '01-ai': '01.AI',
  bytedance: 'ByteDance',
  baidu: 'Baidu',
  'ibm-granite': 'IBM',
  liquid: 'Liquid AI',
  liquidai: 'Liquid AI',
  nousresearch: 'Nous Research',
  openrouter: 'OpenRouter',
  thudm: 'THUDM',
  cognitivecomputations: 'Cognitive Computations',
  tngtech: 'TNG Technology',
  gryphe: 'Gryphe',
  undi95: 'Undi95',
  neversleep: 'NeverSleep',
  alpindale: 'Alpindale',
  deepinfra: 'DeepInfra',
  fireworks: 'Fireworks',
  groq: 'Groq',
  together: 'Together AI',
  togetherai: 'Together AI',
  lambda: 'Lambda',
  inflection: 'Inflection',
  rekatai: 'Reka',
  rekaai: 'Reka',
  upstage: 'Upstage',
  sonoma: 'Sonoma',
  switchpoint: 'Switchpoint',
  agentica: 'Agentica',
  'aion-labs': 'AION Labs',
  'arcee-ai': 'Arcee AI',
  'bytedance-seed': 'ByteDance Seed',
  'dots-studio': 'Dots Studio',
  inclusionai: 'InclusionAI',
  'inference-net': 'Inference.net',
  'nex-agi': 'Nex AGI',
  'prism-ml': 'Prism ML',
  'scaledown': 'ScaleDown',
  stepfun: 'StepFun',
  'thinkingmachines': 'Thinking Machines',
  'xingchen-agi': 'Xingchen AGI',
  thedrummer: 'TheDrummer',
  typesafe: 'TypeSafe',
  'anthracite-org': 'Anthracite',
  inception: 'Inception',
  eleutherai: 'EleutherAI',
  openbmb: 'OpenBMB',
  redhatai: 'Red Hat',
  huggingfacetb: 'Hugging Face',
  'allenai': 'Allen AI',
};

const BRAND_COLORS = {
  anthropic: '#d97757',
  openai: '#10a37f',
  'openai-community': '#10a37f',
  google: '#4285f4',
  'meta-llama': '#4a8cff',
  meta: '#4a8cff',
  mistralai: '#fa520f',
  mistral: '#fa520f',
  deepseek: '#4d6bfe',
  'deepseek-ai': '#4d6bfe',
  qwen: '#8b5cf6',
  alibaba: '#8b5cf6',
  'x-ai': '#d4d4d8',
  xai: '#d4d4d8',
  moonshotai: '#14b8a6',
  cohere: '#22c55e',
  amazon: '#f59e0b',
  microsoft: '#38bdf8',
  nvidia: '#76b900',
  perplexity: '#2dd4bf',
  minimax: '#f472b6',
  minimaxai: '#f472b6',
  'z-ai': '#a78bfa',
  zhipuai: '#a78bfa',
  'zai-org': '#a78bfa',
  ai21: '#f87171',
  inflection: '#e879f9',
  upstage: '#60a5fa',
  rekatai: '#fb923c',
  rekaai: '#fb923c',
  openrouter: '#94a3b8',
  liquid: '#0ea5e9',
  liquidai: '#0ea5e9',
  stepfun: '#6366f1',
  thinkingmachines: '#e11d48',
  inception: '#f59e0b',
  eleutherai: '#22d3ee',
  openbmb: '#f97316',
  redhatai: '#ef4444',
  huggingfacetb: '#fbbf24',
  allenai: '#3b82f6',
};

const ACRONYMS = new Set(['ai', 'ml', 'api', 'llm', 'gpt', 'nlp', 'tts', 'asr', 'glm', 'hq', 'io', 'oss']);

const MODELS_DEV_VENDORS = new Set([
  'openai',
  'anthropic',
  'google',
  'xai',
  'deepseek',
  'mistral',
  'cohere',
  'meta',
  'nvidia',
  'alibaba',
  'moonshotai',
  'zhipuai',
  'minimax',
  'ai21',
  'perplexity',
  'stepfun',
  'inception',
  'liquid',
  'thinkingmachines',
]);

const HF_BLOCKED_ORGS = new Set([
  'unsloth',
  'bartowski',
  'lmstudio-community',
  'thebloke',
  'ggml-org',
  'trl-internal-testing',
  'mradermacher',
  'prunaai',
  'maziyarpanahi',
  'mlx-community',
  'quanttrio',
  'cyankiwi',
  'hugging-quants',
  'ankitai',
  'farbodtavakkoli',
  'final-bench',
]);

const HF_MODEL_CAP = 240;
const HF_ORG_MIN = 3;

const MODELS_DEV_NON_TEXT = new Set([
  'embedding',
  'image',
  'speech',
  'video',
  'transcription',
  'reranking',
  'realtime',
]);

const round = (value, digits) => {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  const result = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(result, -0) ? 0 : result;
};

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const nameCompare = (a, b) => compare(a.toLowerCase(), b.toLowerCase()) || compare(a, b);

function titleize(value) {
  return value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((token) => {
      const lower = token.toLowerCase();
      if (ACRONYMS.has(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function stripTilde(provider) {
  return provider.startsWith('~') ? provider.slice(1) : provider;
}

function displayName(provider) {
  const base = stripTilde(provider);
  const known = BRAND_NAMES[base.toLowerCase()];
  const name = known || titleize(base) || provider;
  return provider.startsWith('~') ? `${name} (latest)` : name;
}

function canonicalProviderId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hslToHex(hue, saturation, lightness) {
  const amplitude = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n) => {
    const k = (n + hue / 30) % 12;
    const color = lightness - amplitude * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function color(provider) {
  const base = stripTilde(provider).toLowerCase();
  return BRAND_COLORS[base] || hslToHex(hashString(base) % 360, 0.68, 0.66);
}

function toNumber(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? NaN : Number(trimmed);
  }
  return typeof value === 'number' ? value : NaN;
}

function perMillion(value) {
  const tokens = toNumber(value);
  if (!Number.isFinite(tokens) || tokens < 0) return null;
  return round(tokens * 1_000_000, 6);
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function finiteNonNegative(value) {
  const number = finiteNumber(value);
  return number !== null && number >= 0 ? number : null;
}

function parseModality(modality) {
  if (typeof modality !== 'string' || !modality.includes('->')) return null;
  const [input, output] = modality.split('->');
  return {
    input: input.split('+').map((part) => part.trim()).filter(Boolean),
    output: output.split('+').map((part) => part.trim()).filter(Boolean),
  };
}

function modalityString(input, output) {
  return input.length || output.length ? `${input.join('+')}->${output.join('+')}` : '';
}

function normalizedSlug(value) {
  return value
    .toLowerCase()
    .replace(/^[^/]+\//, '')
    .replace(/[-_\s.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-(?:20\d{2}-\d{2}-\d{2}|20\d{6}|2[4-6]\d{2})$/, '');
}

function mergeKey(model) {
  return `${model.provider}|${normalizedSlug(model.id)}`;
}

function median(values, digits = 6) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const result = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return round(result, digits);
}

function highlight(models, direction) {
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
  if (!best) return null;
  const { id, name, providerName, pricing } = best;
  return { id, name, providerName, input: pricing.input, output: pricing.output, blended: pricing.blended };
}

function pricingSummary({ input, output, cacheRead, isVariable = false, known }) {
  const blended = input !== null && output !== null ? round((3 * input + output) / 4, 6) : null;
  const isFree = !isVariable && input === 0 && output === 0;
  return { input, output, cacheRead, blended, isFree, isVariable, known };
}

function openRouterSourceLink(id) {
  return { id: 'openrouter', label: 'OpenRouter', url: `https://openrouter.ai/${encodeURI(id)}` };
}

function modelsDevSourceLink(provider) {
  const url = typeof provider.doc === 'string' && provider.doc ? provider.doc : 'https://models.dev';
  return { id: 'modelsdev', label: 'models.dev', url };
}

function huggingFaceSourceLink(id) {
  return { id: 'huggingface', label: 'Hugging Face', url: `https://huggingface.co/${id}` };
}

export function normalizeOpenRouter(rawModels) {
  const seen = new Set();
  const models = [];

  for (const raw of Array.isArray(rawModels) ? rawModels : []) {
    if (!raw || typeof raw !== 'object') continue;
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const slash = id.indexOf('/');
    const provider = slash > 0 ? id.slice(0, slash) : id;
    const providerName = displayName(provider);
    const providerId = canonicalProviderId(providerName);
    const providerColor = color(provider);

    const pricing = raw.pricing && typeof raw.pricing === 'object' ? raw.pricing : {};
    const priceValues = Object.values(pricing).map(toNumber).filter(Number.isFinite);
    const isVariable = priceValues.some((value) => value < 0);

    const input = perMillion(pricing.prompt);
    const output = perMillion(pricing.completion);
    const cacheRead = perMillion(pricing.input_cache_read);
    const hasPaidRate = Object.values(pricing).some((value) => {
      const price = perMillion(value);
      return price !== null && price > 0;
    });
    const known = input !== null || output !== null || isVariable || hasPaidRate;
    const summary = pricingSummary({ input, output, cacheRead, isVariable, known });
    summary.isFree = !isVariable && input === 0 && output === 0 && !hasPaidRate;

    const architecture = raw.architecture && typeof raw.architecture === 'object' ? raw.architecture : {};
    const rawInput = Array.isArray(architecture.input_modalities)
      ? architecture.input_modalities.filter((item) => typeof item === 'string')
      : [];
    const rawOutput = Array.isArray(architecture.output_modalities)
      ? architecture.output_modalities.filter((item) => typeof item === 'string')
      : [];
    const parsed = parseModality(architecture.modality);
    const inputModalities = rawInput.length ? rawInput : parsed?.input ?? [];
    const outputModalities = rawOutput.length ? rawOutput : parsed?.output ?? [];
    const modality =
      (typeof architecture.modality === 'string' && architecture.modality.trim()) ||
      modalityString(inputModalities, outputModalities);

    const parameters = Array.isArray(raw.supported_parameters)
      ? raw.supported_parameters.filter((item) => typeof item === 'string')
      : [];
    const reasoningConfig = raw.reasoning;
    const hasReasoningConfig =
      reasoningConfig === true ||
      (reasoningConfig &&
        typeof reasoningConfig === 'object' &&
        (reasoningConfig.mandatory === true ||
          reasoningConfig.default_enabled === true ||
          (Array.isArray(reasoningConfig.supported_efforts) && reasoningConfig.supported_efforts.length > 0)));

    const contextLength = finiteNumber(raw.context_length);
    const maxOutputRaw = finiteNumber(raw.top_provider?.max_completion_tokens);
    const aa = raw.benchmarks && typeof raw.benchmarks === 'object' ? raw.benchmarks.artificial_analysis : null;

    models.push({
      id,
      name: (typeof raw.name === 'string' && raw.name.trim()) || id,
      provider: providerId,
      providerName,
      providerColor,
      created: finiteNumber(raw.created) ?? 0,
      description: typeof raw.description === 'string' ? raw.description.trim().slice(0, 1200) : '',
      contextLength: contextLength !== null && contextLength > 0 ? contextLength : 0,
      maxOutput: maxOutputRaw !== null && maxOutputRaw >= 0 ? maxOutputRaw : null,
      pricing: summary,
      inputModalities,
      outputModalities,
      modality,
      isModerated: Boolean(raw.top_provider?.is_moderated),
      reasoning: Boolean(hasReasoningConfig) || parameters.includes('reasoning'),
      benchmarks: {
        intelligence: finiteNumber(aa?.intelligence_index),
        coding: finiteNumber(aa?.coding_index),
        agentic: finiteNumber(aa?.agentic_index),
      },
      supportedParameters: parameters,
      sources: ['openrouter'],
      sourceLinks: [openRouterSourceLink(id)],
      downloads: null,
      likes: null,
      openWeights: false,
      license: null,
    });
  }

  return models;
}

export function pickModelsDevVendors(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const picked = {};
  for (const providerId of MODELS_DEV_VENDORS) {
    const provider = raw[providerId];
    if (provider && typeof provider === 'object' && provider.models && typeof provider.models === 'object') {
      picked[providerId] = provider;
    }
  }
  return picked;
}

export function normalizeModelsDev(raw) {
  const models = [];
  const seen = new Set();

  for (const [providerKey, provider] of Object.entries(pickModelsDevVendors(raw))) {
    const providerName = displayName(providerKey);
    const providerId = canonicalProviderId(providerName);
    const providerColor = color(providerKey);
    const link = modelsDevSourceLink(provider);

    for (const [modelKey, rawModel] of Object.entries(provider.models)) {
      if (!rawModel || typeof rawModel !== 'object') continue;
      if (MODELS_DEV_NON_TEXT.has(rawModel.type)) continue;
      const slug = normalizedSlug(modelKey);
      if (!slug) continue;
      const id = `${providerId}/${slug}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const cost = rawModel.cost && typeof rawModel.cost === 'object' ? rawModel.cost : {};
      const input = finiteNonNegative(cost.input);
      const output = finiteNonNegative(cost.output);
      const cacheRead = finiteNonNegative(cost.cache_read ?? cost.cacheRead);
      const known = input !== null || output !== null || cacheRead !== null;
      const summary = pricingSummary({ input, output, cacheRead, known });

      const modalities = rawModel.modalities && typeof rawModel.modalities === 'object' ? rawModel.modalities : {};
      const inputModalities = Array.isArray(modalities.input)
        ? modalities.input.filter((item) => typeof item === 'string')
        : [];
      const outputModalities = Array.isArray(modalities.output)
        ? modalities.output.filter((item) => typeof item === 'string')
        : [];
      const limit = rawModel.limit && typeof rawModel.limit === 'object' ? rawModel.limit : {};
      const contextLength = finiteNonNegative(limit.context);
      const maxOutput = finiteNonNegative(limit.output);
      const release = Date.parse(rawModel.release_date);
      const parameters = [];
      if (rawModel.tool_call) parameters.push('tools');
      if (rawModel.reasoning) parameters.push('reasoning');
      if (rawModel.structured_output) parameters.push('structured_outputs');
      if (rawModel.temperature) parameters.push('temperature');

      models.push({
        id,
        name:
          (typeof rawModel.name === 'string' && rawModel.name.trim()) ||
          titleize(slug) ||
          id,
        provider: providerId,
        providerName,
        providerColor,
        created: Number.isFinite(release) ? Math.floor(release / 1000) : 0,
        description:
          typeof rawModel.description === 'string' ? rawModel.description.trim().slice(0, 1200) : '',
        contextLength: contextLength !== null && contextLength > 0 ? contextLength : 0,
        maxOutput,
        pricing: summary,
        inputModalities,
        outputModalities,
        modality: modalityString(inputModalities, outputModalities),
        isModerated: false,
        reasoning: Boolean(rawModel.reasoning) || parameters.includes('tools'),
        benchmarks: { intelligence: null, coding: null, agentic: null },
        supportedParameters: parameters,
        sources: ['modelsdev'],
        sourceLinks: [link],
        downloads: null,
        likes: null,
        openWeights: Boolean(rawModel.open_weights),
        license: null,
      });
    }
  }

  return models;
}

export function normalizeHuggingFace(rawModels) {
  if (!Array.isArray(rawModels)) return [];

  const eligible = new Map();
  for (const raw of rawModels) {
    if (!raw || typeof raw !== 'object') continue;
    const id = typeof raw.id === 'string' ? raw.id.trim() : '';
    if (!id || raw.private === true) continue;
    const org = id.split('/')[0];
    if (!org || HF_BLOCKED_ORGS.has(org.toLowerCase())) continue;
    eligible.set(org.toLowerCase(), (eligible.get(org.toLowerCase()) ?? 0) + 1);
  }

  const scoped = rawModels
    .filter((raw) => {
      if (!raw || typeof raw.id !== 'string') return false;
      if (raw.private === true) return false;
      const org = raw.id.split('/')[0];
      return org && !HF_BLOCKED_ORGS.has(org.toLowerCase()) && (eligible.get(org.toLowerCase()) ?? 0) >= HF_ORG_MIN;
    })
    .sort((a, b) => (finiteNumber(b.downloads) ?? 0) - (finiteNumber(a.downloads) ?? 0))
    .slice(0, HF_MODEL_CAP);

  const seen = new Set();
  const models = [];

  for (const raw of scoped) {
    const id = raw.id.trim();
    if (seen.has(id)) continue;
    seen.add(id);

    const [org, ...rest] = id.split('/');
    const repo = rest.join('/');
    const providerName = displayName(org);
    const providerId = canonicalProviderId(providerName);
    const tags = Array.isArray(raw.tags) ? raw.tags.filter((tag) => typeof tag === 'string') : [];
    const licenseTag = tags.find((tag) => tag.startsWith('license:'));
    const created = Date.parse(raw.createdAt);
    const downloads = finiteNonNegative(raw.downloads);
    const likes = finiteNonNegative(raw.likes);

    models.push({
      id,
      name: `${providerName}: ${repo}`,
      provider: providerId,
      providerName,
      providerColor: color(org),
      created: Number.isFinite(created) ? Math.floor(created / 1000) : 0,
      description: `Open-weight ${repo} repository from ${providerName}, discovered through the Hugging Face Hub.`,
      contextLength: 0,
      maxOutput: null,
      pricing: pricingSummary({ input: null, output: null, cacheRead: null, known: false }),
      inputModalities: ['text'],
      outputModalities: ['text'],
      modality: 'text->text',
      isModerated: false,
      reasoning: tags.includes('reasoning'),
      benchmarks: { intelligence: null, coding: null, agentic: null },
      supportedParameters: [],
      sources: ['huggingface'],
      sourceLinks: [huggingFaceSourceLink(id)],
      downloads,
      likes,
      openWeights: true,
      license: licenseTag ? licenseTag.slice('license:'.length) : null,
    });
  }

  return models;
}

function mergeInto(target, extra) {
  target.sources = [...new Set([...target.sources, ...extra.sources])];
  const links = new Map(target.sourceLinks.map((link) => [link.id, link]));
  for (const link of extra.sourceLinks) {
    if (!links.has(link.id)) links.set(link.id, link);
  }
  target.sourceLinks = [...links.values()];

  if (!target.pricing.known && extra.pricing.known) {
    target.pricing = { ...extra.pricing };
  } else if (target.pricing.known && extra.pricing.known) {
    const input = target.pricing.input ?? extra.pricing.input;
    const output = target.pricing.output ?? extra.pricing.output;
    const cacheRead = target.pricing.cacheRead ?? extra.pricing.cacheRead;
    target.pricing = pricingSummary({ input, output, cacheRead, known: true });
  }

  if (!target.description) target.description = extra.description;
  if (!target.contextLength) target.contextLength = extra.contextLength;
  if (target.maxOutput === null) target.maxOutput = extra.maxOutput;
  if (!target.created) target.created = extra.created;
  target.inputModalities = [...new Set([...target.inputModalities, ...extra.inputModalities])];
  target.outputModalities = [...new Set([...target.outputModalities, ...extra.outputModalities])];
  if (!target.modality) target.modality = extra.modality;
  target.reasoning = target.reasoning || extra.reasoning;
  target.isModerated = target.isModerated || extra.isModerated;
  target.supportedParameters = [...new Set([...target.supportedParameters, ...extra.supportedParameters])];

  for (const key of ['intelligence', 'coding', 'agentic']) {
    if (target.benchmarks[key] === null) target.benchmarks[key] = extra.benchmarks[key];
  }

  if (extra.downloads !== null && (target.downloads === null || extra.downloads > target.downloads)) {
    target.downloads = extra.downloads;
  }
  if (extra.likes !== null && (target.likes === null || extra.likes > target.likes)) {
    target.likes = extra.likes;
  }
  target.openWeights = target.openWeights || extra.openWeights;
  if (!target.license) target.license = extra.license;
}

export function mergeModels(lists) {
  const byKey = new Map();
  const merged = [];
  const ids = new Set();

  for (const list of lists) {
    for (const model of list) {
      const key = mergeKey(model);
      const existing = byKey.get(key);
      if (existing) {
        mergeInto(existing, model);
        continue;
      }
      if (ids.has(model.id)) continue;
      ids.add(model.id);
      byKey.set(key, model);
      merged.push(model);
    }
  }

  return merged;
}

export function finalizeCatalog(models) {
  models.sort(
    (a, b) =>
      nameCompare(a.providerName, b.providerName) || nameCompare(a.name, b.name) || compare(a.id, b.id),
  );

  const providerMap = new Map();
  for (const model of models) {
    let summary = providerMap.get(model.provider);
    if (!summary) {
      summary = {
        id: model.provider,
        name: model.providerName,
        color: model.providerColor,
        count: 0,
        freeCount: 0,
        paidCount: 0,
        inputSum: 0,
        inputCount: 0,
        outputSum: 0,
        outputCount: 0,
        minBlended: null,
        maxContext: 0,
      };
      providerMap.set(model.provider, summary);
    }
    summary.count += 1;
    if (model.pricing.isFree) summary.freeCount += 1;
    if (model.pricing.known) summary.paidCount += 1;
    if (model.pricing.input !== null) {
      summary.inputSum += model.pricing.input;
      summary.inputCount += 1;
    }
    if (model.pricing.output !== null) {
      summary.outputSum += model.pricing.output;
      summary.outputCount += 1;
    }
    if (model.pricing.blended !== null && (summary.minBlended === null || model.pricing.blended < summary.minBlended)) {
      summary.minBlended = model.pricing.blended;
    }
    if (model.contextLength > summary.maxContext) summary.maxContext = model.contextLength;
  }

  const providers = [...providerMap.values()]
    .map((summary) => ({
      id: summary.id,
      name: summary.name,
      color: summary.color,
      count: summary.count,
      freeCount: summary.freeCount,
      avgInput: summary.inputCount ? round(summary.inputSum / summary.inputCount, 4) : null,
      avgOutput: summary.outputCount ? round(summary.outputSum / summary.outputCount, 4) : null,
      minBlended: summary.minBlended === null ? null : round(summary.minBlended, 6),
      maxContext: summary.maxContext,
    }))
    .sort((a, b) => nameCompare(a.name, b.name) || compare(a.id, b.id));

  for (const model of models) {
    const summary = providerMap.get(model.provider);
    if (summary) {
      model.providerName = summary.name;
      model.providerColor = summary.color;
    }
  }

  const nonFree = models.filter((model) => !model.pricing.isFree);
  const pluck = (list, value) => list.map(value).filter((item) => item !== null);
  const maxContext = models.reduce((max, model) => Math.max(max, model.contextLength), 0);

  const stats = {
    totalModels: models.length,
    totalProviders: providers.length,
    freeModels: models.filter((model) => model.pricing.isFree).length,
    variablePricing: models.filter((model) => model.pricing.isVariable).length,
    reasoningModels: models.filter((model) => model.reasoning).length,
    openWeightModels: models.filter((model) => model.openWeights).length,
    pricedModels: models.filter((model) => model.pricing.blended !== null).length,
    unpricedModels: models.filter((model) => !model.pricing.known).length,
    medianInput: median(pluck(nonFree, (model) => model.pricing.input)),
    medianOutput: median(pluck(nonFree, (model) => model.pricing.output)),
    medianBlended: median(pluck(nonFree, (model) => model.pricing.blended)),
    maxContext,
    cheapest: highlight(models, -1),
    priciest: highlight(models, 1),
    updatedAt: new Date().toISOString(),
  };

  return { models, providers, stats };
}
