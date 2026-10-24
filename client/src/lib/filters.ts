import type { Model, SourceId } from '../types';

export type Capability = 'all' | 'vision' | 'image' | 'audio' | 'video' | 'reasoning';

export interface Filters {
  q: string;
  capability: Capability;
  providers: string[];
  sources: SourceId[];
  priceMax: number | null;
  minContext: number;
  freeOnly: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  q: '',
  capability: 'all',
  providers: [],
  sources: [],
  priceMax: null,
  minContext: 0,
  freeOnly: false,
};

export const SOURCE_OPTIONS: { value: SourceId; label: string }[] = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'modelsdev', label: 'models.dev' },
  { value: 'huggingface', label: 'Hugging Face' },
];

export const CAPABILITY_OPTIONS: { value: Capability; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'vision', label: 'Vision' },
  { value: 'image', label: 'Image gen' },
  { value: 'audio', label: 'Audio' },
  { value: 'video', label: 'Video' },
  { value: 'reasoning', label: 'Reasoning' },
];

export const PRICE_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Any' },
  { value: 1, label: '≤ $1' },
  { value: 5, label: '≤ $5' },
  { value: 20, label: '≤ $20' },
  { value: 80, label: '≤ $80' },
];

export const CONTEXT_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Any' },
  { value: 32_000, label: '32K+' },
  { value: 131_072, label: '128K+' },
  { value: 262_144, label: '256K+' },
  { value: 1_000_000, label: '1M+' },
];

export function countActiveFilters(filters: Filters): number {
  let count = 0;
  if (filters.q.trim()) count += 1;
  if (filters.capability !== 'all') count += 1;
  if (filters.providers.length) count += 1;
  if (filters.sources.length) count += 1;
  if (filters.priceMax !== null) count += 1;
  if (filters.minContext > 0) count += 1;
  if (filters.freeOnly) count += 1;
  return count;
}

export function applyFilters(models: Model[], filters: Filters): Model[] {
  const query = filters.q.trim().toLowerCase();
  return models.filter((model) => {
    if (filters.freeOnly && !model.pricing.isFree) return false;
    if (filters.priceMax !== null) {
      const price = model.pricing.blended;
      if (price === null || price > filters.priceMax) return false;
    }
    if (model.contextLength < filters.minContext) return false;
    if (filters.providers.length && !filters.providers.includes(model.provider)) return false;
    if (filters.sources.length && !filters.sources.some((source) => model.sources.includes(source))) {
      return false;
    }

    switch (filters.capability) {
      case 'vision':
        if (!model.inputModalities.includes('image')) return false;
        break;
      case 'image':
        if (!model.outputModalities.includes('image')) return false;
        break;
      case 'audio':
        if (
          !model.inputModalities.includes('audio') &&
          !model.outputModalities.includes('audio')
        ) {
          return false;
        }
        break;
      case 'video':
        if (!model.inputModalities.includes('video')) return false;
        break;
      case 'reasoning':
        if (!model.reasoning) return false;
        break;
      default:
        break;
    }

    if (query) {
      const haystack =
        `${model.name} ${model.id} ${model.providerName} ${model.sources.join(' ')}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export interface PriceTier {
  key: string;
  label: string;
  color: string;
}

const TIERS: PriceTier[] = [
  { key: 'free', label: 'Free', color: '#34d399' },
  { key: 'tier-1', label: '≤ $1', color: '#22d3ee' },
  { key: 'tier-2', label: '≤ $5', color: '#38bdf8' },
  { key: 'tier-3', label: '≤ $20', color: '#a78bfa' },
  { key: 'tier-4', label: '≤ $80', color: '#fbbf24' },
  { key: 'tier-5', label: '> $80', color: '#fb7185' },
  { key: 'variable', label: 'Variable', color: '#64748b' },
  { key: 'unlisted', label: 'Unlisted', color: '#475569' },
];

export const PRICE_TIERS = TIERS;

export function priceTier(model: Model): PriceTier {
  if (model.pricing.isFree) return TIERS[0];
  const price = model.pricing.blended;
  if (price === null) return model.pricing.isVariable ? TIERS[6] : TIERS[7];
  if (price <= 1) return TIERS[1];
  if (price <= 5) return TIERS[2];
  if (price <= 20) return TIERS[3];
  if (price <= 80) return TIERS[4];
  return TIERS[5];
}

export function tierCounts(models: Model[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tier of TIERS) counts[tier.key] = 0;
  for (const model of models) counts[priceTier(model).key] += 1;
  return counts;
}

export function nodeSize(contextLength: number): number {
  const ratio = Math.min(1, Math.sqrt(Math.max(0, contextLength) / 1_000_000));
  return Math.round(13 + 19 * ratio);
}
