import type { Model } from '../types';
import {
  capabilityTags,
  fmtContext,
  fmtDownloads,
  fmtModelPrice,
  fmtMonth,
  shortName,
} from '../lib/format';
import { Icon } from './Icons';

interface DetailDrawerProps {
  model: Model;
  isCompared: boolean;
  onClose: () => void;
  onToggleCompare: (id: string) => void;
  onFilterProvider: (provider: string) => void;
}

export function DetailDrawer({
  model,
  isCompared,
  onClose,
  onToggleCompare,
  onFilterProvider,
}: DetailDrawerProps) {
  const tags = capabilityTags(model);
  const benchmarkRows = [
    { label: 'Intelligence', value: model.benchmarks.intelligence },
    { label: 'Coding', value: model.benchmarks.coding },
    { label: 'Agentic', value: model.benchmarks.agentic },
  ].filter((row): row is { label: string; value: number } => row.value !== null);
  const created = model.created ? new Date(model.created * 1000).toISOString() : null;
  const params = model.supportedParameters.slice(0, 12);

  return (
    <>
      <button type="button" className="drawer-scrim" aria-label="Close details" onClick={onClose} />
      <aside className="detail-drawer" role="dialog" aria-labelledby="drawer-title">
        <div className="drawer-head">
          <span
            className="provider-chip"
            style={{
              color: model.providerColor,
              borderColor: `${model.providerColor}55`,
              background: `${model.providerColor}12`,
            }}
          >
            <span className="color-dot" style={{ background: model.providerColor }} />
            {model.providerName}
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
            <Icon name="x" />
          </button>
        </div>

        <div className="drawer-scroll">
          <div className="drawer-title-row">
            <h2 id="drawer-title">{shortName(model)}</h2>
            {model.pricing.isFree && <span className="badge badge-free">Free</span>}
            {model.pricing.isVariable && <span className="badge badge-variable">Variable</span>}
            {!model.pricing.known && !model.pricing.isVariable && (
              <span className="badge badge-unlisted">Unlisted</span>
            )}
          </div>
          <p className="drawer-sub mono">{model.id}</p>

          <div className="price-cards">
            <div className="price-card">
              <span className="price-label">Input</span>
              <strong>{fmtModelPrice(model, model.pricing.input)}</strong>
              <span className="price-unit">per 1M tokens</span>
            </div>
            <div className="price-card">
              <span className="price-label">Output</span>
              <strong>{fmtModelPrice(model, model.pricing.output)}</strong>
              <span className="price-unit">per 1M tokens</span>
            </div>
          </div>
          <p className="price-caption">
            Blended 3:1 price <b>{fmtModelPrice(model, model.pricing.blended)}</b> per 1M tokens
            {model.pricing.cacheRead !== null && (
              <> · cached input {fmtModelPrice(model, model.pricing.cacheRead)}</>
            )}
          </p>

          <div className="quick-stats">
            <div>
              <span>Context</span>
              <b>{fmtContext(model.contextLength)}</b>
            </div>
            <div>
              <span>Max output</span>
              <b>{fmtContext(model.maxOutput)}</b>
            </div>
            <div>
              <span>Released</span>
              <b>{fmtMonth(created)}</b>
            </div>
            <div>
              <span>Moderated</span>
              <b>{model.isModerated ? 'Yes' : 'No'}</b>
            </div>
            {model.downloads !== null && (
              <div>
                <span>Downloads</span>
                <b>{fmtDownloads(model.downloads)}</b>
              </div>
            )}
            {model.likes !== null && (
              <div>
                <span>Hub likes</span>
                <b>{fmtDownloads(model.likes)}</b>
              </div>
            )}
          </div>

          {model.pricing.isVariable && (
            <p className="inline-note">
              This model uses variable or router-based pricing, so no fixed per-token rate is
              published. Rankings exclude it.
            </p>
          )}

          {!model.pricing.known && !model.pricing.isVariable && (
            <p className="inline-note">
              No source publishes a list price for this model. It is tracked here for discovery, but
              excluded from price rankings and cost estimates.
            </p>
          )}

          <section className="detail-section">
            <h3>Capabilities</h3>
            <div className="chip-row">
              {tags.length === 0 && <span className="tag">text</span>}
              {tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="modality-grid">
              <div>
                <span className="modality-label">Accepts</span>
                <div className="chip-row">
                  {model.inputModalities.map((item) => (
                    <span className="tag tag-subtle" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="modality-label">Returns</span>
                <div className="chip-row">
                  {model.outputModalities.map((item) => (
                    <span className="tag tag-subtle" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {benchmarkRows.length > 0 && (
            <section className="detail-section">
              <h3>Benchmarks</h3>
              <div className="bench-list">
                {benchmarkRows.map((row) => (
                  <div className="bench-row" key={row.label}>
                    <div className="bench-head">
                      <span>{row.label}</span>
                      <span className="mono">{row.value.toFixed(1)}</span>
                    </div>
                    <div className="bench-track">
                      <span style={{ width: `${Math.min(100, Math.max(2, row.value))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="detail-section">
            <h3>About</h3>
            <p className="drawer-desc">
              {model.description || 'No description is published for this model.'}
            </p>
          </section>

          <section className="detail-section">
            <h3>Pricing detail</h3>
            <dl className="detail-grid">
              <div>
                <dt>Input</dt>
                <dd>{fmtModelPrice(model, model.pricing.input)} <span>/ 1M</span></dd>
              </div>
              <div>
                <dt>Output</dt>
                <dd>{fmtModelPrice(model, model.pricing.output)} <span>/ 1M</span></dd>
              </div>
              <div>
                <dt>Cache read</dt>
                <dd>{fmtModelPrice(model, model.pricing.cacheRead)} <span>/ 1M</span></dd>
              </div>
              <div>
                <dt>3:1 blend</dt>
                <dd>{fmtModelPrice(model, model.pricing.blended)} <span>/ 1M</span></dd>
              </div>
              <div>
                <dt>Context</dt>
                <dd>{model.contextLength.toLocaleString('en-US')} <span>tokens</span></dd>
              </div>
              <div>
                <dt>Max output</dt>
                <dd>{model.maxOutput ? model.maxOutput.toLocaleString('en-US') : '—'} <span>tokens</span></dd>
              </div>
            </dl>
          </section>

          {params.length > 0 && (
            <section className="detail-section">
              <h3>Supported parameters</h3>
              <div className="chip-row">
                {params.map((param) => (
                  <span className="tag tag-mono" key={param}>
                    {param}
                  </span>
                ))}
                {model.supportedParameters.length > params.length && (
                  <span className="tag tag-mono">
                    +{model.supportedParameters.length - params.length} more
                  </span>
                )}
              </div>
            </section>
          )}

          <section className="detail-section">
            <h3>Sources</h3>
            <div className="source-link-list">
              {model.sourceLinks.map((link) => (
                <a
                  key={link.id}
                  className="source-link"
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="source-link-label">{link.label}</span>
                  <Icon name="arrow-up-right" size={12} />
                </a>
              ))}
            </div>
            <div className="chip-row source-flags">
              {model.sources.length > 1 && (
                <span className="tag tag-small">{model.sources.length} sources merged</span>
              )}
              {model.openWeights && <span className="tag tag-small">open weights</span>}
              {model.license && <span className="tag tag-small tag-mono">{model.license}</span>}
            </div>
          </section>

          <section className="detail-section">
            <h3>Provider</h3>
            <button
              type="button"
              className="link-btn"
              onClick={() => onFilterProvider(model.provider)}
            >
              See all {model.providerName} models
              <Icon name="arrow-up-right" size={13} />
            </button>
          </section>
        </div>

        <div className="drawer-actions">
          <button
            type="button"
            className={`btn ${isCompared ? 'ghost' : 'primary'}`}
            onClick={() => onToggleCompare(model.id)}
            aria-pressed={isCompared}
          >
            {isCompared ? (
              <>
                <Icon name="check" size={15} /> In compare
              </>
            ) : (
              <>
                <Icon name="plus" size={15} /> Add to compare
              </>
            )}
          </button>
          {model.sourceLinks[0] && (
            <a
              className="btn ghost"
              href={model.sourceLinks[0].url}
              target="_blank"
              rel="noreferrer"
            >
              {model.sourceLinks[0].label} <Icon name="arrow-up-right" size={14} />
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
