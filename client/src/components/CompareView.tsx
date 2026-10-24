import { useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { Model } from '../types';
import {
  capabilityTags,
  fmtContext,
  fmtModelPrice,
  fmtMoney,
  monthlyCost,
  priceUnavailableLabel,
  shortName,
} from '../lib/format';
import { priceTier } from '../lib/filters';
import PriceScatter from './PriceScatter';
import { Icon } from './Icons';

interface CompareViewProps {
  models: Model[];
  totalModels: number;
  compareModels: Model[];
  compareIds: string[];
  activeFilterCount: number;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onClear: () => void;
  onEditFilters: () => void;
}

const PRESETS = [
  { label: 'Chat assistant', input: 10, output: 2 },
  { label: 'Coding agent', input: 50, output: 5 },
  { label: 'RAG pipeline', input: 100, output: 10 },
  { label: 'Prototype', input: 1, output: 0.2 },
];

export function CompareView({
  models,
  totalModels,
  compareModels,
  compareIds,
  activeFilterCount,
  onToggle,
  onOpen,
  onClear,
  onEditFilters,
}: CompareViewProps) {
  const [inputM, setInputM] = useState(10);
  const [outputM, setOutputM] = useState(2);

  const leaderboard = useMemo(() => {
    const pool = compareModels.length
      ? compareModels
      : [...models]
          .filter((model) => model.pricing.blended !== null)
          .sort((a, b) => (a.pricing.blended ?? 0) - (b.pricing.blended ?? 0))
          .slice(0, 8);

    return pool
      .map((model) => ({ model, cost: monthlyCost(model, inputM, outputM) }))
      .sort((a, b) => {
        if (a.cost === null && b.cost === null) return a.model.name.localeCompare(b.model.name);
        if (a.cost === null) return 1;
        if (b.cost === null) return -1;
        return a.cost - b.cost || a.model.name.localeCompare(b.model.name);
      });
  }, [compareModels, models, inputM, outputM]);

  const maxCost = Math.max(0.000001, ...leaderboard.map((row) => row.cost ?? 0));

  const inputValues = compareModels
    .map((model) => model.pricing.input)
    .filter((value): value is number => value !== null);
  const outputValues = compareModels
    .map((model) => model.pricing.output)
    .filter((value): value is number => value !== null);
  const costValues = compareModels
    .map((model) => monthlyCost(model, inputM, outputM))
    .filter((value): value is number => value !== null);
  const bestInput = inputValues.length ? Math.min(...inputValues) : null;
  const bestOutput = outputValues.length ? Math.min(...outputValues) : null;
  const bestCost = costValues.length ? Math.min(...costValues) : null;
  const bestContext = compareModels.length
    ? Math.max(...compareModels.map((model) => model.contextLength))
    : 0;

  const updateNumber =
    (setter: (value: number) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      const next = Number(event.target.value);
      setter(Number.isFinite(next) ? Math.min(1_000_000, Math.max(0, next)) : 0);
    };

  const openRow = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(id);
    }
  };

  return (
    <section className="compare-view">
      <div className="section-head">
        <div>
          <span className="eyebrow">Compare</span>
          <h1>Price space</h1>
          <p>
            Input against output pricing for {models.length} of {totalModels} models. Click a dot
            to add it to the lineup; shift-click for full details.
          </p>
        </div>
        <div className="section-actions">
          {compareModels.length > 0 && (
            <button type="button" className="btn ghost small" onClick={onClear}>
              <Icon name="trash" size={14} /> Clear lineup
            </button>
          )}
          <button type="button" className="btn ghost small" onClick={onEditFilters}>
            <Icon name="sliders" size={14} /> Filters
            {activeFilterCount > 0 && <span className="dot-badge">{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      <div className="compare-grid">
        <div className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h2>Input vs output</h2>
              <p>USD per 1M tokens · logarithmic scale</p>
            </div>
            <span className="pill">{models.length} in view</span>
          </div>
          <PriceScatter
            models={models}
            selectedIds={compareIds}
            onToggle={onToggle}
            onOpen={onOpen}
          />
        </div>

        <div className="compare-side">
          <div className="panel scenario-panel">
            <div className="panel-head">
              <div>
                <h2>Monthly bill</h2>
                <p>Estimate a real workload</p>
              </div>
              <span className="pill">per month</span>
            </div>
            <div className="scenario-inputs">
              <label className="scenario-field">
                <span>
                  Input tokens <em>millions</em>
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={inputM}
                  onChange={updateNumber(setInputM)}
                  aria-label="Monthly input tokens in millions"
                />
              </label>
              <label className="scenario-field">
                <span>
                  Output tokens <em>millions</em>
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={outputM}
                  onChange={updateNumber(setOutputM)}
                  aria-label="Monthly output tokens in millions"
                />
              </label>
            </div>
            <div className="preset-row">
              {PRESETS.map((preset) => {
                const active = preset.input === inputM && preset.output === outputM;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className={`preset${active ? ' is-active' : ''}`}
                    onClick={() => {
                      setInputM(preset.input);
                      setOutputM(preset.output);
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <p className="scenario-note">
              Cost = input price × input volume + output price × output volume. List rates only —
              caching and batch discounts are not included.
            </p>
          </div>

          <div className="panel leader-panel">
            <div className="panel-head">
              <div>
                <h2>{compareModels.length ? 'Your lineup' : 'Cheapest in view'}</h2>
                <p>
                  {compareModels.length
                    ? 'Monthly estimate, lowest first'
                    : 'Lowest blended price under current filters'}
                </p>
              </div>
              <span className="pill">{leaderboard.length}</span>
            </div>
            <div className="leaderboard">
              {leaderboard.map((row, index) => {
                const tier = priceTier(row.model);
                const selected = compareIds.includes(row.model.id);
                return (
                  <div
                    key={row.model.id}
                    className="leader-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpen(row.model.id)}
                    onKeyDown={(event) => openRow(event, row.model.id)}
                  >
                    <span className="leader-rank">{String(index + 1).padStart(2, '0')}</span>
                    <span className="leader-main">
                      <span className="leader-name">
                        <span className="color-dot" style={{ background: tier.color }} />
                        {shortName(row.model)}
                      </span>
                      <span className="leader-sub">
                        {row.model.providerName} ·{' '}
                        {fmtModelPrice(row.model, row.model.pricing.blended)} blend ·{' '}
                        {fmtContext(row.model.contextLength)}
                      </span>
                      <span className="leader-bar">
                        <span
                          style={{
                            width: `${Math.max(2, ((row.cost ?? 0) / maxCost) * 100)}%`,
                            background: tier.color,
                          }}
                        />
                      </span>
                    </span>
                    <span className="leader-cost">
                      {row.cost === null ? priceUnavailableLabel(row.model) : fmtMoney(row.cost)}
                    </span>
                    <button
                      type="button"
                      className={`leader-add${selected ? ' is-on' : ''}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggle(row.model.id);
                      }}
                      aria-label={selected ? `Remove ${row.model.name} from lineup` : `Add ${row.model.name} to lineup`}
                      aria-pressed={selected}
                    >
                      <Icon name={selected ? 'check' : 'plus'} size={12} />
                    </button>
                  </div>
                );
              })}
              {leaderboard.length === 0 && (
                <p className="empty-copy">No priced models in view. Adjust the filters to see a ranking.</p>
              )}
            </div>
            <p className="leader-note">Tap a row for full specs · use + to add to the lineup.</p>
          </div>
        </div>
      </div>

      {compareModels.length > 0 ? (
        <section className="panel lineup-panel">
          <div className="panel-head">
            <div>
              <h2>Head-to-head</h2>
              <p>
                {compareModels.length} selected · {inputM}M input + {outputM}M output per month
              </p>
            </div>
            <button type="button" className="link-btn" onClick={onClear}>
              Clear lineup
            </button>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col" className="num">
                    Input /1M
                  </th>
                  <th scope="col" className="num">
                    Output /1M
                  </th>
                  <th scope="col" className="num">
                    3:1 blend /1M
                  </th>
                  <th scope="col" className="num">
                    Monthly
                  </th>
                  <th scope="col" className="num">
                    Context
                  </th>
                  <th scope="col">Capabilities</th>
                  <th scope="col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {compareModels.map((model) => {
                  const tier = priceTier(model);
                  const cost = monthlyCost(model, inputM, outputM);
                  const tags = capabilityTags(model).slice(0, 3);
                  return (
                    <tr key={model.id}>
                      <td>
                        <button type="button" className="model-cell" onClick={() => onOpen(model.id)}>
                          <span className="color-dot" style={{ background: model.providerColor }} />
                          <span>
                            <span className="model-name">{shortName(model)}</span>
                            <span className="model-provider">{model.providerName}</span>
                          </span>
                        </button>
                      </td>
                      <td className={`num mono${model.pricing.input === bestInput ? ' is-best' : ''}`}>
                        {fmtModelPrice(model, model.pricing.input)}
                      </td>
                      <td className={`num mono${model.pricing.output === bestOutput ? ' is-best' : ''}`}>
                        {fmtModelPrice(model, model.pricing.output)}
                      </td>
                      <td className="num mono">
                        <span className="tier-dot" style={{ background: tier.color }} />
                        {fmtModelPrice(model, model.pricing.blended)}
                      </td>
                      <td className={`num mono${cost !== null && cost === bestCost ? ' is-best' : ''}`}>
                        {cost === null ? priceUnavailableLabel(model) : fmtMoney(cost)}
                      </td>
                      <td className={`num mono${model.contextLength === bestContext ? ' is-best' : ''}`}>
                        {fmtContext(model.contextLength)}
                      </td>
                      <td>
                        <div className="chip-row chip-row-tight">
                          {tags.length === 0 && <span className="tag tag-small">text</span>}
                          {tags.map((tag) => (
                            <span className="tag tag-small" key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="row-actions">
                        <button
                          type="button"
                          className="icon-btn small-icon"
                          onClick={() => onToggle(model.id)}
                          aria-label={`Remove ${model.name} from lineup`}
                        >
                          <Icon name="x" size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="lineup-callout">
          <span className="callout-icon">
            <Icon name="sparkles" size={20} />
          </span>
          <div>
            <h3>Build a lineup</h3>
            <p>
              Select up to eight models from the scatter, atlas, or directory. A head-to-head table
              and a shared monthly estimate will appear here.
            </p>
          </div>
          <button type="button" className="btn ghost small" onClick={onEditFilters}>
            Adjust filters
          </button>
        </div>
      )}

      <section className="panel explainer">
        <div className="panel-head">
          <div>
            <h2>Reading the numbers</h2>
            <p>What the listed price actually buys</p>
          </div>
          <span className="pill">Pricing 101</span>
        </div>
        <div className="explain-grid">
          <div className="explain-item">
            <span className="explain-num">01</span>
            <h3>Per million tokens</h3>
            <p>
              Every value is USD per 1M tokens. A token is roughly ¾ of an English word, so 1M
              tokens is about 750,000 words.
            </p>
          </div>
          <div className="explain-item">
            <span className="explain-num">02</span>
            <h3>Input vs output</h3>
            <p>
              Input is what you send; output is what the model writes. Output usually costs 2–4×
              more because generation happens one token at a time.
            </p>
          </div>
          <div className="explain-item">
            <span className="explain-num">03</span>
            <h3>Blended price</h3>
            <p>
              One comparison number using the OpenRouter 3:1 convention: three input tokens for
              every output token.
            </p>
          </div>
          <div className="explain-item">
            <span className="explain-num">04</span>
            <h3>Variable &amp; unlisted</h3>
            <p>
              Router or auction models publish no fixed rate, and some open-weight repos publish no
              price at all. Both sit in the N/A gutter and are excluded from rankings.
            </p>
          </div>
        </div>
        <div className="formula-row">
          <span className="formula">blended = (3 × input + output) ÷ 4</span>
          <span className="formula-hint">drives tier colors and the default directory sort</span>
        </div>
        <p className="explain-note">
          A 10-page document is roughly 5,000 tokens. A 1M-token workload is about 750,000 words.
        </p>
      </section>
    </section>
  );
}
