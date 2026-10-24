import type { CatalogSource, CatalogSourceInfo, CatalogStats, TabId } from '../types';
import { fmtContext, fmtPrice, relativeTime } from '../lib/format';
import { Icon, LogoMark } from './Icons';

interface HeaderProps {
  tab: TabId;
  onTabChange: (tab: TabId) => void;
  source: CatalogSource;
  sources: CatalogSourceInfo[];
  fetchedAt: string;
  refreshing: boolean;
  onRefresh: () => void;
  stats: CatalogStats;
  filteredCount: number;
  compareCount: number;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'atlas', label: 'Atlas' },
  { id: 'compare', label: 'Compare' },
  { id: 'directory', label: 'Directory' },
];

export function Header({
  tab,
  onTabChange,
  source,
  sources,
  fetchedAt,
  refreshing,
  onRefresh,
  stats,
  filteredCount,
  compareCount,
}: HeaderProps) {
  const badgeFor = (id: TabId): number | null => {
    if (id === 'atlas') return filteredCount;
    if (id === 'compare') return compareCount || null;
    return stats.totalModels;
  };

  const liveSources = sources.filter((item) => item.mode === 'live').length;
  const sourceLabel =
    source === 'live' ? 'Multi-source live' : source === 'partial' ? 'Partial sources' : 'Snapshot fallback';
  const sourceTitle = sources
    .map((item) => `${item.label}: ${item.mode} (${item.models} models)`)
    .join('\n');

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="/" onClick={(event) => event.preventDefault()}>
          <LogoMark />
          <span className="brand-copy">
            <span className="brand-name">Model Atlas</span>
            <span className="brand-sub">AI pricing observatory</span>
          </span>
        </a>

        <nav className="nav-tabs" aria-label="Views">
          {TABS.map((item) => {
            const badge = badgeFor(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-tab${tab === item.id ? ' is-active' : ''}`}
                aria-current={tab === item.id ? 'page' : undefined}
                onClick={() => onTabChange(item.id)}
              >
                {item.label}
                {badge !== null && <span className="nav-count">{badge}</span>}
              </button>
            );
          })}
        </nav>

        <div className="topbar-actions">
          <div className={`source-pill source-${source}`} title={sourceTitle}>
            <span className="source-dot" aria-hidden="true" />
            <span className="source-copy">
              <span className="source-label">{sourceLabel}</span>
              <span className="source-time">
                {liveSources}/{sources.length} sources live · {relativeTime(fetchedAt)}
              </span>
            </span>
          </div>
          <button
            type="button"
            className="icon-btn refresh-btn"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh pricing catalog"
            title="Refresh pricing catalog"
          >
            <Icon name="refresh" className={refreshing ? 'spin' : undefined} />
          </button>
        </div>
      </div>

      <div className="stats-strip" role="list" aria-label="Catalog statistics">
        <div className="stat" role="listitem">
          <span className="stat-label">In view</span>
          <span className="stat-value">
            {filteredCount}
            <span className="stat-suffix">/ {stats.totalModels}</span>
          </span>
        </div>
        <div className="stat" role="listitem">
          <span className="stat-label">Providers</span>
          <span className="stat-value">{stats.totalProviders}</span>
        </div>
        <div className="stat" role="listitem">
          <span className="stat-label">Free models</span>
          <span className="stat-value stat-accent">{stats.freeModels}</span>
        </div>
        <div className="stat" role="listitem">
          <span className="stat-label">Median paid blend</span>
          <span className="stat-value">{fmtPrice(stats.medianBlended)}</span>
          <span className="stat-note">per 1M · 3:1</span>
        </div>
        <div className="stat" role="listitem">
          <span className="stat-label">Reasoning</span>
          <span className="stat-value">{stats.reasoningModels}</span>
        </div>
        <div className="stat" role="listitem">
          <span className="stat-label">Unlisted price</span>
          <span className="stat-value">{stats.unpricedModels}</span>
          <span className="stat-note">discovered, no public rate</span>
        </div>
        <div className="stat" role="listitem">
          <span className="stat-label">Context ceiling</span>
          <span className="stat-value">{fmtContext(stats.maxContext)}</span>
          <span className="stat-note">tokens</span>
        </div>
      </div>
    </header>
  );
}
