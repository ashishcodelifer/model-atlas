export type CatalogSource = 'live' | 'partial' | 'snapshot';

export type SourceId = 'openrouter' | 'modelsdev' | 'huggingface';
export type SourceMode = 'live' | 'snapshot' | 'unavailable';

export type TabId = 'atlas' | 'compare' | 'directory';

export interface ModelSourceLink {
  id: SourceId;
  label: string;
  url: string;
}

export interface CatalogSourceInfo {
  id: SourceId;
  label: string;
  url: string;
  mode: SourceMode;
  models: number;
  fetchedAt: string | null;
  error: string | null;
}

export interface ModelPricing {
  /** USD per 1M input tokens. Null when the price is variable or unavailable. */
  input: number | null;
  /** USD per 1M output tokens. Null when the price is variable or unavailable. */
  output: number | null;
  /** USD per 1M cached input tokens, when published. */
  cacheRead: number | null;
  /** OpenRouter-style 3:1 input/output blend, USD per 1M tokens. */
  blended: number | null;
  isFree: boolean;
  isVariable: boolean;
  /** False when no source published a list price for this model. */
  known: boolean;
}

export interface Benchmarks {
  intelligence: number | null;
  coding: number | null;
  agentic: number | null;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  providerColor: string;
  created: number;
  description: string;
  contextLength: number;
  maxOutput: number | null;
  pricing: ModelPricing;
  inputModalities: string[];
  outputModalities: string[];
  modality: string;
  isModerated: boolean;
  reasoning: boolean;
  benchmarks: Benchmarks;
  supportedParameters: string[];
  sources: SourceId[];
  sourceLinks: ModelSourceLink[];
  downloads: number | null;
  likes: number | null;
  openWeights: boolean;
  license: string | null;
}

export interface ProviderSummary {
  id: string;
  name: string;
  color: string;
  count: number;
  freeCount: number;
  avgInput: number | null;
  avgOutput: number | null;
  minBlended: number | null;
  maxContext: number;
}

export interface PriceHighlight {
  id: string;
  name: string;
  providerName: string;
  input: number;
  output: number;
  blended: number;
}

export interface CatalogStats {
  totalModels: number;
  totalProviders: number;
  freeModels: number;
  variablePricing: number;
  reasoningModels: number;
  openWeightModels: number;
  pricedModels: number;
  unpricedModels: number;
  medianInput: number | null;
  medianOutput: number | null;
  medianBlended: number | null;
  maxContext: number;
  cheapest: PriceHighlight | null;
  priciest: PriceHighlight | null;
  updatedAt: string;
}

export interface CatalogResponse {
  source: CatalogSource;
  fetchedAt: string;
  sources: CatalogSourceInfo[];
  models: Model[];
  providers: ProviderSummary[];
  stats: CatalogStats;
}
