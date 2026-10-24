import { useEffect, useMemo, useState } from 'react';
import type { Model, SourceId } from '../types';
import {
  capabilityTags,
  downloadCsv,
  fmtContext,
  fmtModelPrice,
  shortName,
} from '../lib/format';
import { priceTier } from '../lib/filters';
import { Icon } from './Icons';

type SortKey = 'name' | 'provider' | 'input' | 'output' | 'blended' | 'context';

interface ModelsTableProps {
  models: Model[];
  totalModels: number;
  compareIds: string[];
  activeFilterCount: number;
  query: string;
  onQuery: (query: string) => void;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onEditFilters: () => void;
}

const PAGE_SIZE = 40;

const SOURCE_LABELS: Record<SourceId, string> = {
  openrouter: 'OpenRouter',
  modelsdev: 'models.dev',
  huggingface: 'HF',
};

const COLUMNS: { key: SortKey | null; label: string; numeric?: boolean }[] = [
  { key: 'name', label: 'Model' },
  { key: 'input', label: 'Input $/1M', numeric: true },
  { key: 'output', label: 'Output $/1M', numeric: true },
  { key: 'blended', label: 'Blend $/1M', numeric: true },
  { key: 'context', label: 'Context', numeric: true },
  { key: null, label: 'Sources' },
  { key: null, label: 'Capabilities' },
];

export function ModelsTable({
  models,
  totalModels,
  compareIds,
  activeFilterCount,
  query,
  onQuery,
  onToggle,
  onOpen,
  onEditFilters,
}: ModelsTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'blended',
    dir: 'asc',
  });
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const direction = sort.dir === 'asc' ? 1 : -1;
    const numericValue = (model: Model): number | null => {
      switch (sort.key) {
        case 'input':
          return model.pricing.input;
        case 'output':
          return model.pricing.output;
        case 'blended':
          return model.pricing.blended;
        case 'context':
          return model.contextLength;
        default:
          return null;
      }
    };

    return [...models].sort((a, b) => {
      if (sort.key === 'name') return direction * a.name.localeCompare(b.name);
      if (sort.key === 'provider') return direction * a.providerName.localeCompare(b.providerName);
      const av = numericValue(a);
      const bv = numericValue(b);
      if (av === null && bv === null) return a.name.localeCompare(b.name);
      if (av === null) return 1;
      if (bv === null) return -1;
      return direction * (av - bv) || a.name.localeCompare(b.name);
    });
  }, [models, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const visible = sorted.slice(start, start + PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [models, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((previous) =>
      previous.key === key
        ? { key, dir: previous.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
  };

  const sortIndicator = (key: SortKey) => {
    if (sort.key !== key) return null;
    return <span className="sort-arrow">{sort.dir === 'asc' ? '↑' : '↓'}</span>;
  };

  const exportCsv = () => {
    downloadCsv(sorted, `model-atlas-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <section className="directory-view">
      <div className="section-head">
        <div>
          <span className="eyebrow">Directory</span>
          <h1>Every model, side by side</h1>
          <p>
            {models.length} of {totalModels} models in view ·{' '}
            {models.filter((model) => model.pricing.blended !== null).length} priced ·{' '}
            {models.filter((model) => model.openWeights).length} open-weight · USD per 1M tokens.
          </p>
        </div>
        <div className="section-actions">
          <button type="button" className="btn ghost small" onClick={onEditFilters}>
            <Icon name="sliders" size={14} /> Filters
            {activeFilterCount > 0 && <span className="dot-badge">{activeFilterCount}</span>}
          </button>
          <button type="button" className="btn primary small" onClick={exportCsv} disabled={!sorted.length}>
            <Icon name="download" size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="table-toolbar">
          <label className="search-field">
            <Icon name="search" size={15} />
            <input
              type="search"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Search models, providers, ids"
              aria-label="Search directory"
            />
            {query && (
              <button type="button" className="search-clear" onClick={() => onQuery('')} aria-label="Clear search">
                <Icon name="x" size={13} />
              </button>
            )}
          </label>
          <div className="table-toolbar-meta">
            <span className="mono">{sorted.length}</span> results
            {activeFilterCount > 0 && <span className="filter-chip">filters on</span>}
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table directory-table">
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column.label}
                    scope="col"
                    className={column.numeric ? 'num' : undefined}
                    aria-sort={
                      column.key && sort.key === column.key
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    {column.key ? (
                      <button
                        type="button"
                        className={`th-sort${sort.key === column.key ? ' is-active' : ''}`}
                        onClick={() => toggleSort(column.key as SortKey)}
                      >
                        {column.label}
                        {sortIndicator(column.key as SortKey)}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
                <th scope="col" aria-label="Add to compare" />
              </tr>
            </thead>
            <tbody>
              {visible.map((model) => {
                const tier = priceTier(model);
                const compared = compareIds.includes(model.id);
                const tags = capabilityTags(model);
                return (
                  <tr
                    key={model.id}
                    className="is-clickable"
                    tabIndex={0}
                    onClick={() => onOpen(model.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') onOpen(model.id);
                    }}
                  >
                    <td>
                      <span className="model-cell">
                        <span className="color-dot" style={{ background: model.providerColor }} />
                        <span>
                          <span className="model-name">{shortName(model)}</span>
                          <span className="model-provider">{model.providerName}</span>
                        </span>
                      </span>
                    </td>
                    <td className="num mono">{fmtModelPrice(model, model.pricing.input)}</td>
                    <td className="num mono">{fmtModelPrice(model, model.pricing.output)}</td>
                    <td className="num mono">
                      <span className="tier-dot" style={{ background: tier.color }} />
                      {fmtModelPrice(model, model.pricing.blended)}
                    </td>
                    <td className="num mono">{fmtContext(model.contextLength)}</td>
                    <td>
                      <div className="chip-row chip-row-tight">
                        {model.sources.map((source) => (
                          <span
                            className={`source-badge source-badge--${source}`}
                            key={source}
                            title={model.sourceLinks.find((link) => link.id === source)?.url}
                          >
                            {SOURCE_LABELS[source]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="chip-row chip-row-tight">
                        {tags.length === 0 && <span className="tag tag-small">text</span>}
                        {tags.slice(0, 3).map((tag) => (
                          <span className="tag tag-small" key={tag}>
                            {tag}
                          </span>
                        ))}
                        {tags.length > 3 && (
                          <span className="tag tag-small">+{tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className={`compare-toggle${compared ? ' is-on' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggle(model.id);
                        }}
                        aria-label={compared ? `Remove ${model.name} from compare` : `Add ${model.name} to compare`}
                        aria-pressed={compared}
                        title={compared ? 'Remove from compare' : 'Add to compare'}
                      >
                        <Icon name={compared ? 'check' : 'plus'} size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty">
                      <h3>Nothing matches</h3>
                      <p>Try a different search, or reset the filters from the atlas.</p>
                      <button type="button" className="btn ghost small" onClick={onEditFilters}>
                        Adjust filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="pagination-info">
            {sorted.length === 0
              ? 'No models'
              : `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, sorted.length)} of ${sorted.length}`}
          </span>
          <div className="pagination-controls">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={safePage === 0}
              aria-label="Previous page"
            >
              <Icon name="chevron-left" size={15} />
            </button>
            <span className="page-indicator mono">
              {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
              disabled={safePage >= pageCount - 1}
              aria-label="Next page"
            >
              <Icon name="chevron-right" size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
