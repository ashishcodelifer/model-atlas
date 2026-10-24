import { useMemo, useState } from 'react';
import type { CatalogSourceInfo, ProviderSummary, SourceId } from '../types';
import type { Filters } from '../lib/filters';
import {
  CAPABILITY_OPTIONS,
  CONTEXT_OPTIONS,
  PRICE_OPTIONS,
  countActiveFilters,
} from '../lib/filters';
import { Icon } from './Icons';

interface FilterPanelProps {
  providers: ProviderSummary[];
  sources: CatalogSourceInfo[];
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onToggleProvider: (id: string) => void;
  onToggleSource: (id: SourceId) => void;
  onReset: () => void;
  onClose: () => void;
}

const PROVIDER_PREVIEW = 12;

export function FilterPanel({
  providers,
  sources,
  filters,
  onChange,
  onToggleProvider,
  onToggleSource,
  onReset,
  onClose,
}: FilterPanelProps) {
  const [showAllProviders, setShowAllProviders] = useState(false);
  const [providerQuery, setProviderQuery] = useState('');
  const activeCount = countActiveFilters(filters);

  const sortedProviders = useMemo(
    () =>
      [...providers].sort(
        (a, b) => b.count - a.count || a.name.localeCompare(b.name),
      ),
    [providers],
  );

  const visibleProviders = useMemo(() => {
    const base = showAllProviders
      ? sortedProviders
      : sortedProviders.slice(0, PROVIDER_PREVIEW);
    const query = providerQuery.trim().toLowerCase();
    const list = query
      ? sortedProviders.filter((provider) => provider.name.toLowerCase().includes(query))
      : base;
    const selectedMissing = sortedProviders.filter(
      (provider) => filters.providers.includes(provider.id) && !list.includes(provider),
    );
    return [...selectedMissing, ...list];
  }, [sortedProviders, showAllProviders, providerQuery, filters.providers]);

  return (
    <aside className="filters-panel" aria-label="Filters">
      <div className="filters-head">
        <div>
          <span className="eyebrow">Refine atlas</span>
          <h2 className="filters-title">
            Filters
            {activeCount > 0 && <span className="active-pill">{activeCount}</span>}
          </h2>
        </div>
        <button type="button" className="icon-btn filters-close" onClick={onClose} aria-label="Close filters">
          <Icon name="x" />
        </button>
      </div>

      <label className="search-field">
        <Icon name="search" size={15} />
        <input
          type="search"
          value={filters.q}
          onChange={(event) => onChange({ q: event.target.value })}
          placeholder="Search models, providers, ids"
          aria-label="Search models"
        />
        {filters.q && (
          <button type="button" className="search-clear" onClick={() => onChange({ q: '' })} aria-label="Clear search">
            <Icon name="x" size={13} />
          </button>
        )}
      </label>

      <section className="filter-section">
        <div className="filter-label">Capability</div>
        <div className="segmented segmented-wrap" role="group" aria-label="Capability filter">
          {CAPABILITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`seg${filters.capability === option.value ? ' is-active' : ''}`}
              onClick={() => onChange({ capability: option.value })}
              aria-pressed={filters.capability === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <div className="filter-label filter-label-row">
          <span>Data sources</span>
          <span className="filter-hint">{filters.sources.length || 'all'}</span>
        </div>
        <div className="source-filter-list" role="group" aria-label="Source filter">
          {sources.map((source) => {
            const checked = filters.sources.includes(source.id);
            const unavailable = source.mode === 'unavailable';
            return (
              <button
                key={source.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                className={`source-filter${checked ? ' is-checked' : ''}`}
                onClick={() => onToggleSource(source.id)}
                disabled={unavailable}
                title={`${source.label}: ${source.mode} · ${source.models} models discovered`}
              >
                <span className={`source-mode-dot is-${source.mode}`} aria-hidden="true" />
                <span className="provider-name">{source.label}</span>
                <span className="provider-count">{unavailable ? 'offline' : source.models}</span>
                <span className={`provider-check${checked ? ' is-on' : ''}`} aria-hidden="true">
                  {checked && <Icon name="check" size={11} />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="source-filter-note">
          Models merge across sources; a model can carry several source links.
        </p>
      </section>

      <section className="filter-section">
        <div className="filter-label">
          Max blended price <span className="filter-hint">per 1M tokens</span>
        </div>
        <div className="segmented" role="group" aria-label="Maximum blended price">
          {PRICE_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              className={`seg${filters.priceMax === option.value ? ' is-active' : ''}`}
              onClick={() => onChange({ priceMax: option.value })}
              aria-pressed={filters.priceMax === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <div className="filter-label">Context window</div>
        <div className="segmented" role="group" aria-label="Minimum context window">
          {CONTEXT_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              className={`seg${filters.minContext === option.value ? ' is-active' : ''}`}
              onClick={() => onChange({ minContext: option.value })}
              aria-pressed={filters.minContext === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <div className="filter-label filter-label-row">
          <span>Providers</span>
          <span className="filter-hint">{filters.providers.length || 'all'}</span>
        </div>

        {showAllProviders && (
          <label className="search-field search-field-sm">
            <Icon name="search" size={14} />
            <input
              type="search"
              value={providerQuery}
              onChange={(event) => setProviderQuery(event.target.value)}
              placeholder="Find a provider"
              aria-label="Find a provider"
            />
          </label>
        )}

        <div className="provider-list" role="group" aria-label="Provider filter">
          {visibleProviders.map((provider) => {
            const checked = filters.providers.includes(provider.id);
            return (
              <button
                key={provider.id}
                type="button"
                role="checkbox"
                aria-checked={checked}
                className={`provider-item${checked ? ' is-checked' : ''}`}
                onClick={() => onToggleProvider(provider.id)}
              >
                <span className="color-dot" style={{ background: provider.color }} />
                <span className="provider-name">{provider.name}</span>
                <span className="provider-count">{provider.count}</span>
                <span className={`provider-check${checked ? ' is-on' : ''}`} aria-hidden="true">
                  {checked && <Icon name="check" size={11} />}
                </span>
              </button>
            );
          })}
          {visibleProviders.length === 0 && (
            <p className="provider-empty">No providers match “{providerQuery}”.</p>
          )}
        </div>

        {sortedProviders.length > PROVIDER_PREVIEW && (
          <button
            type="button"
            className="link-btn"
            onClick={() => setShowAllProviders((value) => !value)}
          >
            {showAllProviders ? 'Show top 12' : `Show all ${sortedProviders.length}`}
            <Icon name={showAllProviders ? 'chevron-left' : 'chevron-right'} size={13} />
          </button>
        )}
      </section>

      <section className="filter-section">
        <div className="switch-row">
          <span className="switch-copy">
            <span className="filter-label">Free models only</span>
            <span className="filter-hint">$0 input and $0 output</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={filters.freeOnly}
            className={`switch${filters.freeOnly ? ' is-on' : ''}`}
            onClick={() => onChange({ freeOnly: !filters.freeOnly })}
          >
            <span className="switch-thumb" />
          </button>
        </div>
      </section>

      <div className="filter-footer">
        <button
          type="button"
          className="btn ghost small"
          onClick={onReset}
          disabled={activeCount === 0}
        >
          Reset filters
        </button>
        <span className="filter-note">USD per 1M tokens</span>
      </div>
    </aside>
  );
}
