import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Model, SourceId, TabId } from './types';
import { useCatalog } from './hooks/useCatalog';
import {
  DEFAULT_FILTERS,
  applyFilters,
  countActiveFilters,
  type Filters,
} from './lib/filters';
import { relativeTime } from './lib/format';
import { Header } from './components/Header';
import { FilterPanel } from './components/FilterPanel';
import { GraphView } from './components/GraphView';
import { DetailDrawer } from './components/DetailDrawer';
import { CompareTray } from './components/CompareTray';
import { CompareView } from './components/CompareView';
import { ModelsTable } from './components/ModelsTable';
import { Icon, LogoMark } from './components/Icons';

const COMPARE_KEY = 'model-atlas:compare';
const MAX_COMPARE = 8;

function loadCompare(): string[] {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_COMPARE);
  } catch {
    return [];
  }
}

export default function App() {
  const { data, loading, refreshing, error, refresh, retry } = useCatalog();
  const [tab, setTab] = useState<TabId>('atlas');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>(loadCompare);
  const compareIdsRef = useRef(compareIds);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);

  const models = data?.models ?? [];
  const filtered = useMemo(() => applyFilters(models, filters), [models, filters]);
  const activeFilterCount = countActiveFilters(filters);

  const compareModels = useMemo(
    () =>
      compareIds
        .map((id) => models.find((model) => model.id === id))
        .filter((model): model is Model => Boolean(model)),
    [compareIds, models],
  );

  const selectedModel = selectedId
    ? models.find((model) => model.id === selectedId) ?? null
    : null;

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3400);
  }, []);

  useEffect(
    () => () => {
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  useEffect(() => {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(compareIds));
  }, [compareIds]);

  useEffect(() => {
    if (!data) return;
    const valid = data.models;
    const previous = compareIdsRef.current;
    const next = previous.filter((id) => valid.some((model) => model.id === id));
    if (next.length !== previous.length) {
      compareIdsRef.current = next;
      setCompareIds(next);
    }
  }, [data]);

  useEffect(() => {
    if (error && data) showNotice('Refresh failed — showing the last loaded catalog.');
  }, [error, data, showNotice]);

  useEffect(() => {
    const shouldLock = window.innerWidth <= 1120 && (Boolean(selectedId) || filtersOpen);
    document.body.classList.toggle('no-scroll', shouldLock);
    return () => document.body.classList.remove('no-scroll');
  }, [selectedId, filtersOpen]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (selectedId) setSelectedId(null);
      else if (filtersOpen) setFiltersOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, filtersOpen]);

  const patchFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  }, []);

  const toggleProvider = useCallback((provider: string) => {
    setFilters((previous) => ({
      ...previous,
      providers: previous.providers.includes(provider)
        ? previous.providers.filter((item) => item !== provider)
        : [...previous.providers, provider],
    }));
  }, []);

  const toggleSource = useCallback((source: SourceId) => {
    setFilters((previous) => ({
      ...previous,
      sources: previous.sources.includes(source)
        ? previous.sources.filter((item) => item !== source)
        : [...previous.sources, source],
    }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const toggleCompare = useCallback(
    (id: string) => {
      const previous = compareIdsRef.current;
      if (previous.includes(id)) {
        const next = previous.filter((item) => item !== id);
        compareIdsRef.current = next;
        setCompareIds(next);
        return;
      }
      if (previous.length >= MAX_COMPARE) {
        showNotice(`The lineup holds ${MAX_COMPARE} models. Remove one to add another.`);
        return;
      }
      const next = [...previous, id];
      compareIdsRef.current = next;
      setCompareIds(next);
    },
    [showNotice],
  );

  const clearCompare = useCallback(() => {
    compareIdsRef.current = [];
    setCompareIds([]);
  }, []);

  const changeTab = useCallback((nextTab: TabId) => {
    setTab(nextTab);
    setFiltersOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openFilters = useCallback(() => {
    setTab('atlas');
    setFiltersOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const focusProvider = useCallback((provider: string) => {
    setFilters({ ...DEFAULT_FILTERS, providers: [provider] });
    setSelectedId(null);
    setFiltersOpen(false);
    setTab('atlas');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (loading) {
    return (
      <div className="boot-screen">
        <div className="boot-mark">
          <LogoMark size={58} />
          <span className="boot-orbit" />
        </div>
        <span className="eyebrow">AI pricing observatory</span>
        <h1>Model Atlas</h1>
        <p>Syncing OpenRouter, models.dev and Hugging Face — every model, every price.</p>
        <div className="boot-bar" aria-hidden="true">
          <span />
        </div>
        <div className="boot-skeletons" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="boot-screen error-screen">
        <LogoMark size={52} />
        <span className="eyebrow">Connection issue</span>
        <h1>Catalog unavailable</h1>
        <p>{error ?? 'The model catalog could not be loaded.'}</p>
        <div className="error-actions">
          <button type="button" className="btn primary" onClick={retry}>
            <Icon name="refresh" size={15} /> Try again
          </button>
        </div>
        <p className="boot-hint">
          The API runs on port 8787. Start it with <code>npm run dev</code>, or build and run{' '}
          <code>npm start</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <Header
        tab={tab}
        onTabChange={changeTab}
        source={data.source}
        sources={data.sources}
        fetchedAt={data.fetchedAt}
        refreshing={refreshing}
        onRefresh={refresh}
        stats={data.stats}
        filteredCount={filtered.length}
        compareCount={compareIds.length}
      />

      {error && (
        <div className="offline-banner" role="status">
          <Icon name="info" size={14} />
          Refresh failed · showing catalog from {relativeTime(data.fetchedAt)}
          <button type="button" className="link-btn" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      <main id="main" className="main">
        {tab === 'atlas' && (
          <div className="atlas-view">
            <div className="atlas-layout">
              <div className={`filters-shell${filtersOpen ? ' is-open' : ''}`}>
                <FilterPanel
                  providers={data.providers}
                  sources={data.sources}
                  filters={filters}
                  onChange={patchFilters}
                  onToggleProvider={toggleProvider}
                  onToggleSource={toggleSource}
                  onReset={resetFilters}
                  onClose={() => setFiltersOpen(false)}
                />
              </div>
              <button
                type="button"
                className={`filters-backdrop${filtersOpen ? ' is-open' : ''}`}
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
                tabIndex={filtersOpen ? 0 : -1}
              />
              <GraphView
                models={filtered}
                totalModels={models.length}
                selectedId={selectedId}
                compareIds={compareIds}
                activeFilterCount={activeFilterCount}
                onSelect={setSelectedId}
                onOpenFilters={openFilters}
                onResetFilters={resetFilters}
              />
            </div>
          </div>
        )}

        {tab === 'compare' && (
          <CompareView
            models={filtered}
            totalModels={models.length}
            compareModels={compareModels}
            compareIds={compareIds}
            activeFilterCount={activeFilterCount}
            onToggle={toggleCompare}
            onOpen={setSelectedId}
            onClear={clearCompare}
            onEditFilters={openFilters}
          />
        )}

        {tab === 'directory' && (
          <ModelsTable
            models={filtered}
            totalModels={models.length}
            compareIds={compareIds}
            activeFilterCount={activeFilterCount}
            query={filters.q}
            onQuery={(q) => patchFilters({ q })}
            onToggle={toggleCompare}
            onOpen={setSelectedId}
            onEditFilters={openFilters}
          />
        )}
      </main>

      {tab !== 'compare' && compareModels.length > 0 && (
        <CompareTray
          models={compareModels}
          onRemove={toggleCompare}
          onClear={clearCompare}
          onOpen={setSelectedId}
          onCompare={() => changeTab('compare')}
        />
      )}

      {selectedModel && (
        <DetailDrawer
          model={selectedModel}
          isCompared={compareIds.includes(selectedModel.id)}
          onClose={() => setSelectedId(null)}
          onToggleCompare={toggleCompare}
          onFilterProvider={focusProvider}
        />
      )}

      {notice && (
        <div className="notice-toast" role="status">
          <Icon name="info" size={15} />
          {notice}
        </div>
      )}
    </div>
  );
}
