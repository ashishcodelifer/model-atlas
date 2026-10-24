import type { Model } from '../types';

export function fmtPrice(value: number | null | undefined, freeLabel = 'Free'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value === 0) return freeLabel;
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  if (value < 10) {
    const precise = value.toFixed(3);
    return `$${precise.endsWith('0') ? value.toFixed(2) : precise}`;
  }
  if (value < 100) return `$${value.toFixed(2)}`;
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

export function fmtModelPrice(model: Model, value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return priceUnavailableLabel(model);
  }
  return fmtPrice(value);
}

export function priceUnavailableLabel(model: Model): string {
  return model.pricing.isVariable ? 'Variable' : 'Unlisted';
}

export function fmtDownloads(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) return '—';
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

export function fmtMoney(value: number | null | undefined): string {  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  if (value === 0) return '$0';
  if (value < 0.01) return '<$0.01';
  if (value < 1) return `$${value.toFixed(2)}`;
  if (value < 1000) return `$${value.toFixed(2)}`;
  if (value < 999_500) return `$${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`;
  return `$${(value / 1_000_000).toFixed(1)}M`;
}

export function fmtContext(tokens: number | null | undefined): string {
  if (!tokens || !Number.isFinite(tokens)) return '—';
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (tokens >= 1000) {
    const thousands = tokens / 1000;
    return `${thousands >= 100 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(tokens);
}

export function fmtMonth(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'unknown';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 45) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86_400)}d ago`;
}

export function shortName(model: Model): string {
  const prefix = `${model.providerName}: `;
  return model.name.startsWith(prefix) ? model.name.slice(prefix.length) : model.name;
}

export function capabilityTags(model: Model): string[] {
  const tags: string[] = [];
  if (model.inputModalities.includes('image')) tags.push('vision');
  if (model.outputModalities.includes('image')) tags.push('image-gen');
  if (model.inputModalities.includes('audio') || model.outputModalities.includes('audio')) tags.push('audio');
  if (model.inputModalities.includes('video')) tags.push('video');
  if (model.reasoning) tags.push('reasoning');
  if (model.inputModalities.includes('file')) tags.push('files');
  return tags;
}

export function monthlyCost(model: Model, inputMillions: number, outputMillions: number): number | null {
  const input = model.pricing.input;
  const output = model.pricing.output;
  if (input === null || output === null) return null;
  return input * inputMillions + output * outputMillions;
}

export function downloadCsv(models: Model[], filename: string): void {
  const header = [
    'id',
    'name',
    'provider',
    'input_usd_per_1m',
    'output_usd_per_1m',
    'cache_read_usd_per_1m',
    'blended_3_1_usd_per_1m',
    'pricing_known',
    'context_tokens',
    'max_output_tokens',
    'free',
    'variable_pricing',
    'input_modalities',
    'output_modalities',
    'reasoning',
    'moderated',
    'sources',
    'source_links',
    'downloads',
    'likes',
    'open_weights',
    'license',
  ];

  const escape = (value: unknown): string => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const rows = models.map((model) =>
    [
      model.id,
      model.name,
      model.providerName,
      model.pricing.input ?? '',
      model.pricing.output ?? '',
      model.pricing.cacheRead ?? '',
      model.pricing.blended ?? '',
      model.pricing.known ? 'yes' : 'no',
      model.contextLength,
      model.maxOutput ?? '',
      model.pricing.isFree ? 'yes' : 'no',
      model.pricing.isVariable ? 'yes' : 'no',
      model.inputModalities.join('+'),
      model.outputModalities.join('+'),
      model.reasoning ? 'yes' : 'no',
      model.isModerated ? 'yes' : 'no',
      model.sources.join('+'),
      model.sourceLinks.map((link) => link.url).join(' '),
      model.downloads ?? '',
      model.likes ?? '',
      model.openWeights ? 'yes' : 'no',
      model.license ?? '',
    ]
      .map(escape)
      .join(','),
  );

  const csv = [header.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
