import cytoscape, {
  type Core,
  type ElementDefinition,
  type LayoutOptions,
  type NodeSingular,
  type StylesheetStyle,
} from 'cytoscape';
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Model } from '../types';
import { buildConstellation } from '../lib/constellation';
import { PRICE_TIERS, tierCounts } from '../lib/filters';
import { fmtContext, fmtModelPrice, shortName } from '../lib/format';
import { Icon } from './Icons';

type GraphLayout = 'constellation' | 'force' | 'rings' | 'grid';

const LAYOUTS: { id: GraphLayout; label: string; hint: string }[] = [
  { id: 'constellation', label: 'Clusters', hint: 'Provider constellations' },
  { id: 'force', label: 'Force', hint: 'Force-directed layout' },
  { id: 'rings', label: 'Rings', hint: 'Concentric layout' },
  { id: 'grid', label: 'Grid', hint: 'Grid layout' },
];

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionDuration = (ms: number) => (reducedMotion() ? 0 : ms);

const STYLESHEET: StylesheetStyle[] = [
  {
    selector: 'node',
    style: {
      'font-family': 'Space Grotesk, ui-sans-serif, system-ui, sans-serif',
      'font-size': 9,
      color: '#c3d1e3',
      'text-outline-color': '#05080f',
      'text-outline-width': 2,
    },
  },
  {
    selector: 'node[kind = "provider"]',
    style: {
      shape: 'round-rectangle',
      'background-color': 'data(color)',
      'background-opacity': 0.05,
      'border-color': 'data(color)',
      'border-width': 1,
      'border-opacity': 0.34,
      label: 'data(label)',
      color: 'data(color)',
      'font-size': 13,
      'font-weight': 600,
      'text-valign': 'top',
      'text-halign': 'center',
      'text-margin-y': -11,
      'text-outline-width': 4,
      'text-outline-color': '#05080f',
      'text-opacity': 0,
      padding: '20px',
      'compound-sizing-wrt-labels': 'exclude',
      'min-width': '54px',
      'min-height': '54px',
    },
  },
  {
    selector: 'node[kind = "provider"].show-provider-labels',
    style: { 'text-opacity': 1 },
  },
  {
    selector: 'edge.provider-edge',
    style: {
      display: 'none',
      width: 1,
      'line-color': 'data(color)',
      'line-opacity': 0.22,
      'curve-style': 'bezier',
      'target-arrow-shape': 'none',
      events: 'no',
    },
  },
  {
    selector: 'node[kind = "provider"].force-labels',
    style: { 'text-opacity': 1 },
  },
  {
    selector: 'node[kind = "model"]',
    style: {
      shape: 'ellipse',
      width: 'data(size)',
      height: 'data(size)',
      'background-color': 'data(fill)',
      'background-opacity': 0.92,
      'border-width': 1.5,
      'border-color': '#060b14',
      label: 'data(label)',
      'font-size': 9,
      'font-weight': 500,
      color: '#bdcbdd',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 5,
      'text-max-width': '96px',
      'text-wrap': 'wrap',
      'text-opacity': 0,
      'text-outline-width': 3,
      'text-outline-color': '#05080f',
    },
  },
  {
    selector: 'node[kind = "model"].show-labels',
    style: { 'text-opacity': 1 },
  },
  {
    selector: 'node[kind = "model"].is-free',
    style: { 'border-color': '#a7f3d0', 'border-width': 1.5 },
  },
  {
    selector: 'node.in-compare',
    style: {
      'border-width': 2.5,
      'border-color': '#f8fafc',
      'border-style': 'dashed',
    },
  },
  {
    selector: 'node.is-selected',
    style: {
      'border-width': 3,
      'border-color': '#ffffff',
      'border-style': 'solid',
      'overlay-color': '#5eead4',
      'overlay-opacity': 0.18,
      'overlay-padding': 7,
    },
  },
  {
    selector: 'node.kb-focus',
    style: {
      'border-width': 2.5,
      'border-color': '#5eead4',
      'overlay-color': '#5eead4',
      'overlay-opacity': 0.16,
      'overlay-padding': 6,
    },
  },
  {
    selector: 'node[kind = "model"].hovered',
    style: { 'border-width': 2.5, 'border-color': '#ffffff' },
  },
  {
    selector: '.dimmed',
    style: { opacity: 0.16 },
  },
];

interface TooltipState {
  model: Model;
  x: number;
  y: number;
}

interface GraphViewProps {
  models: Model[];
  totalModels: number;
  selectedId: string | null;
  compareIds: string[];
  activeFilterCount: number;
  onSelect: (id: string | null) => void;
  onOpenFilters: () => void;
  onResetFilters: () => void;
}

export function GraphView({
  models,
  totalModels,
  selectedId,
  compareIds,
  activeFilterCount,
  onSelect,
  onOpenFilters,
  onResetFilters,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const positionsRef = useRef(new Map<string, { x: number; y: number }>());
  const layoutRef = useRef<GraphLayout>('constellation');
  const modelsRef = useRef(models);
  const callbacksRef = useRef({ onSelect });
  const labelsRef = useRef(false);
  const providersLabelsRef = useRef(false);
  const scaleLabelsRef = useRef<() => void>(() => {});
  const layoutInstanceRef = useRef<ReturnType<Core['layout']> | null>(null);
  const keyboardIndexRef = useRef(-1);

  const [layout, setLayout] = useState<GraphLayout>('constellation');
  const [labelsVisible, setLabelsVisible] = useState(false);
  const [providerLabelsVisible, setProviderLabelsVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  modelsRef.current = models;
  callbacksRef.current = { onSelect };

  const counts = useMemo(() => tierCounts(models), [models]);
  const providerCount = useMemo(
    () => new Set(models.map((model) => model.provider)).size,
    [models],
  );

  const updateLabelVisibility = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const zoom = cy.zoom();
    const showProviders = zoom >= 0.5;
    if (showProviders !== providersLabelsRef.current) {
      providersLabelsRef.current = showProviders;
      setProviderLabelsVisible(showProviders);
      cy.batch(() => {
        if (showProviders) cy.nodes('[kind = "provider"]').addClass('show-provider-labels');
        else cy.nodes('[kind = "provider"]').removeClass('show-provider-labels');
      });
    }
    const shouldShow = zoom >= 0.8;
    if (shouldShow === labelsRef.current) return;
    labelsRef.current = shouldShow;
    setLabelsVisible(shouldShow);
    cy.batch(() => {
      if (shouldShow) cy.nodes('[kind = "model"]').addClass('show-labels');
      else cy.nodes('[kind = "model"]').removeClass('show-labels');
    });
  }, []);

  const applyLayout = useCallback(
    (name: GraphLayout) => {
      const cy = cyRef.current;
      if (!cy) return;

      layoutInstanceRef.current?.stop();
      layoutInstanceRef.current = null;

      const clusterMode = name === 'constellation';
      const forceMode = name === 'force';
      cy.batch(() => {
        cy.edges('.provider-edge').forEach((edge) => {
          edge.style('display', forceMode ? 'element' : 'none');
        });
        if (clusterMode) {
          cy.nodes('[kind = "model"]').forEach((node) => {
            const parentId = `p:${node.data('provider')}`;
            const parent = node.parent();
            if (parent.nonempty() && parent.first().id() === parentId) return;
            node.move({ parent: parentId });
          });
          cy.nodes('[kind = "provider"]').forEach((node) => {
            node.style('display', 'element');
            node.removeClass('force-labels');
          });
        } else {
          cy.nodes('[kind = "model"]').forEach((node) => {
            if (node.parent().nonempty()) node.move({ parent: null });
          });
          cy.nodes('[kind = "provider"]').forEach((node) => {
            node.style('display', forceMode ? 'element' : 'none');
            if (forceMode && Number(node.data('count')) >= 5) node.addClass('force-labels');
            else node.removeClass('force-labels');
          });
        }
      });

      if (clusterMode) {
        cy.batch(() => {
          cy.nodes().forEach((node) => {
            const position = positionsRef.current.get(node.id());
            if (position) node.position(position);
          });
        });
        cy.layout({ name: 'preset', fit: true, padding: 70 }).run();
        requestAnimationFrame(updateLabelVisibility);
        return;
      }

      setBusy(true);
      const animationDuration = motionDuration(520);
      let options: LayoutOptions;
      if (name === 'force') {
        options = {
          name: 'cose',
          eles: cy
            .nodes('[kind = "model"]')
            .union(cy.nodes('[kind = "provider"]'))
            .union(cy.edges('.provider-edge')),
          fit: true,
          padding: 70,
          animate: animationDuration > 0,
          animationDuration,
          randomize: true,
          nodeRepulsion: 14_000,
          idealEdgeLength: 26,
          gravity: 0.4,
          numIter: 900,
          nodeOverlap: 10,
          componentSpacing: 90,
        } as LayoutOptions;
      } else if (name === 'rings') {
        const tierLevel: Record<string, number> = {
          free: 1,
          'tier-1': 2,
          'tier-2': 3,
          'tier-3': 4,
          'tier-4': 5,
          'tier-5': 6,
          variable: 7,
          unlisted: 8,
        };
        options = {
          name: 'concentric',
          eles: cy.nodes('[kind = "model"]'),
          fit: true,
          padding: 70,
          animate: animationDuration > 0,
          animationDuration,
          minNodeSpacing: 14,
          levelWidth: () => 1,
          concentric: (node: NodeSingular) => tierLevel[String(node.data('tier'))] ?? 1,
        } as LayoutOptions;
      } else {
        options = {
          name: 'grid',
          eles: cy.nodes('[kind = "model"]'),
          fit: true,
          padding: 70,
          avoidOverlap: true,
          condense: false,
          animate: animationDuration > 0,
          animationDuration: motionDuration(400),
        } as LayoutOptions;
      }

      const instance = cy.layout(options);
      layoutInstanceRef.current = instance;
      instance.one('layoutstop', () => {
        if (layoutInstanceRef.current === instance) layoutInstanceRef.current = null;
        setBusy(false);
        updateLabelVisibility();
      });
      instance.run();
    },
    [updateLabelVisibility],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cy = cytoscape({
      container,
      elements: [],
      style: STYLESHEET,
      minZoom: 0.1,
      maxZoom: 2.8,
      boxSelectionEnabled: false,
      selectionType: 'single',
    });
    cyRef.current = cy;

    cy.on('mouseover', 'node[kind = "model"]', (event) => {
      const node = event.target as NodeSingular;
      const model = modelsRef.current.find((item) => item.id === node.data('modelId'));
      if (!model) return;
      const position = event.renderedPosition;
      const rect = container.getBoundingClientRect();
      const tooltipWidth = 258;
      const tooltipHeight = 142;
      let x = position.x + 18;
      if (x + tooltipWidth > rect.width - 12) x = position.x - tooltipWidth - 18;
      let y = position.y + 16;
      if (y + tooltipHeight > rect.height - 12) y = position.y - tooltipHeight - 16;
      setTooltip({
        model,
        x: Math.max(12, x),
        y: Math.max(12, y),
      });
      node.addClass('hovered');
      cy.elements().not(node).not(node.parent()).addClass('dimmed');
    });

    cy.on('mouseout', 'node[kind = "model"]', (event) => {
      (event.target as NodeSingular).removeClass('hovered');
      cy.elements().removeClass('dimmed');
      setTooltip(null);
    });

    cy.on('tap', 'node[kind = "model"]', (event) => {
      cy.nodes('.kb-focus').removeClass('kb-focus');
      callbacksRef.current.onSelect((event.target as NodeSingular).data('modelId'));
    });

    cy.on('tap', 'node[kind = "provider"]', (event) => {
      const node = event.target as NodeSingular;
      if (node.children().length === 0) return;
      cy.animate({
        fit: { eles: node.children().union(node), padding: 90 },
        duration: motionDuration(420),
        easing: 'ease-out',
      });
    });

    cy.on('tap', (event) => {
      if (event.target === cy) callbacksRef.current.onSelect(null);
    });

    let labelFrame = 0;
    let lastZoom = 0;
    const scaleProviderLabels = (force = false) => {
      const zoom = cy.zoom();
      if (!force && lastZoom > 0 && Math.abs(zoom - lastZoom) / lastZoom < 0.03) return;
      lastZoom = zoom;
      const fontSize = Math.min(140, Math.max(6, 13 / zoom));
      const margin = Math.min(140, Math.max(4, 11 / zoom));
      cy.batch(() => {
        cy.nodes('[kind = "provider"]').style({
          'font-size': fontSize,
          'text-margin-y': -margin,
        });
      });
    };
    scaleLabelsRef.current = () => scaleProviderLabels(true);

    const handleZoom = () => {
      updateLabelVisibility();
      if (labelFrame) return;
      labelFrame = requestAnimationFrame(() => {
        labelFrame = 0;
        scaleProviderLabels();
      });
    };

    cy.on('zoom', handleZoom);
    cy.on('pan', () => setTooltip((current) => (current ? null : current)));

    const observer = new ResizeObserver(() => {
      cy.resize();
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(labelFrame);
      scaleLabelsRef.current = () => {};
      observer.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
  }, [updateLabelVisibility]);

  const mountElements = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const result = buildConstellation(models, []);
    positionsRef.current = result.positions;
    cy.batch(() => {
      cy.elements().remove();
      cy.add(result.elements as ElementDefinition[]);
      cy.add(
        models.map((model) => ({
          group: 'edges',
          data: {
            id: `e:${model.id}`,
            source: `p:${model.provider}`,
            target: `m:${model.id}`,
            color: model.providerColor,
          },
          classes: 'provider-edge',
        })) as ElementDefinition[],
      );
    });
  }, [models]);

  useEffect(() => {
    if (!cyRef.current) return;
    mountElements();
    labelsRef.current = false;
    setLabelsVisible(false);
    providersLabelsRef.current = false;
    setProviderLabelsVisible(false);
    keyboardIndexRef.current = -1;
    setTooltip(null);
    applyLayout(layoutRef.current);
    scaleLabelsRef.current();
    updateLabelVisibility();
  }, [mountElements, applyLayout, updateLabelVisibility]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.nodes('[kind = "model"]').removeClass('is-selected in-compare');
      if (selectedId) cy.getElementById(`m:${selectedId}`).addClass('is-selected');
      for (const id of compareIds) cy.getElementById(`m:${id}`).addClass('in-compare');
    });
  }, [selectedId, compareIds, models]);

  const changeLayout = (name: GraphLayout) => {
    if (name === 'constellation' && layoutRef.current !== 'constellation') {
      mountElements();
      const cy = cyRef.current;
      if (cy) {
        cy.batch(() => {
          if (selectedId) cy.getElementById(`m:${selectedId}`).addClass('is-selected');
          for (const id of compareIds) cy.getElementById(`m:${id}`).addClass('in-compare');
        });
      }
    }
    layoutRef.current = name;
    setLayout(name);
    applyLayout(name);
    requestAnimationFrame(() => {
      scaleLabelsRef.current();
      updateLabelVisibility();
    });
  };

  const zoomBy = (factor: number) => {
    const cy = cyRef.current;
    const container = containerRef.current;
    if (!cy || !container) return;
    const rect = container.getBoundingClientRect();
    cy.zoom({
      level: Math.min(cy.maxZoom(), Math.max(cy.minZoom(), cy.zoom() * factor)),
      renderedPosition: { x: rect.width / 2, y: rect.height / 2 },
    });
  };

  const fitAll = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.animate({
      fit: { eles: cy.elements(':visible'), padding: 70 },
      duration: motionDuration(420),
      easing: 'ease-out',
    });
  };

  const handleCanvasKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const cy = cyRef.current;
    if (!cy || models.length === 0) return;
    if (event.key === 'Enter') {
      const model = models[keyboardIndexRef.current];
      if (!model) return;
      event.preventDefault();
      onSelect(model.id);
      return;
    }
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    keyboardIndexRef.current = (keyboardIndexRef.current + step + models.length) % models.length;
    const model = models[keyboardIndexRef.current];
    const node = cy.getElementById(`m:${model.id}`);
    if (node.empty()) return;
    cy.batch(() => {
      cy.nodes('.kb-focus').removeClass('kb-focus');
      node.addClass('kb-focus');
    });
    cy.animate({ center: { eles: node }, duration: motionDuration(180), easing: 'ease-out' });
  };

  return (
    <section className="graph-stage" aria-label="Interactive model pricing graph">
      <div className="graph-topbar" role="toolbar" aria-label="Graph controls">
        <div className="layout-switch" role="group" aria-label="Graph layout">
          {LAYOUTS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`seg${layout === option.id ? ' is-active' : ''}`}
              onClick={() => changeLayout(option.id)}
              title={option.hint}
              aria-pressed={layout === option.id}
            >
              {option.label}
            </button>
          ))}
        </div>

        <span className={`graph-busy${busy ? ' is-visible' : ''}`} aria-hidden={!busy}>
          <span className="spinner" /> laying out
        </span>

        <div className="toolbar-spacer" />

        <span className="graph-count">
          <b>{models.length}</b>
          {models.length !== totalModels && <span className="muted"> / {totalModels}</span>}
          <span className="graph-count-label"> models · {providerCount} providers</span>
        </span>

        <div className="zoom-group">
          <button type="button" className="icon-btn" onClick={() => zoomBy(1 / 1.35)} aria-label="Zoom out">
            <span className="zoom-glyph">−</span>
          </button>
          <button type="button" className="icon-btn" onClick={() => zoomBy(1.35)} aria-label="Zoom in">
            <span className="zoom-glyph">+</span>
          </button>
          <button type="button" className="icon-btn" onClick={fitAll} aria-label="Fit graph to screen" title="Fit graph">
            <Icon name="fit" size={15} />
          </button>
        </div>

        <button type="button" className="btn ghost small filters-trigger" onClick={onOpenFilters}>
          <Icon name="sliders" size={14} /> Filters
          {activeFilterCount > 0 && <span className="dot-badge">{activeFilterCount}</span>}
        </button>
      </div>

      <div
        ref={containerRef}
        className="graph-canvas"
        tabIndex={0}
        role="region"
        aria-label="Model graph. Use the arrow keys to move between models and Enter to open details, or use the Directory tab for a table view."
        onKeyDown={handleCanvasKeyDown}
      />

      {models.length === 0 && (
        <div className="graph-empty">
          <Icon name="search" size={22} />
          <h3>No models match these filters</h3>
          <p>Loosen the price ceiling or clear provider selections to bring the atlas back.</p>
          <button type="button" className="btn primary small" onClick={onResetFilters}>
            Reset filters
          </button>
        </div>
      )}

      <div className="graph-legend" role="group" aria-label="Graph legend">
        <div className="legend-title">
          Blended price <span>per 1M</span>
        </div>
        {PRICE_TIERS.map((tier) => (
          <div className="legend-row" key={tier.key}>
            <span className="legend-dot" style={{ background: tier.color }} />
            <span className="legend-name">{tier.label}</span>
            <span className="legend-count">{counts[tier.key] ?? 0}</span>
          </div>
        ))}
        <div className="legend-divider" />
        <div className="legend-title">
          Node size <span>context</span>
        </div>
        <div className="size-legend">
          <span className="size-sample" style={{ width: 9, height: 9 }} />
          <span>32K</span>
          <span className="size-sample" style={{ width: 17, height: 17 }} />
          <span>256K</span>
          <span className="size-sample" style={{ width: 28, height: 28 }} />
          <span>1M</span>
        </div>
      </div>

      <div className="graph-hint">
        <span>Click a model for details</span>
        <span>Drag to pan · scroll to zoom</span>
        {!providerLabelsVisible && (
          <span className="hint-accent">Zoom in to reveal provider names</span>
        )}
        {providerLabelsVisible && !labelsVisible && (
          <span className="hint-accent">Zoom in to reveal model names</span>
        )}
      </div>

      {tooltip && (
        <div className="cy-tooltip" style={{ left: tooltip.x, top: tooltip.y }} aria-hidden="true">
          <div className="tt-provider">
            <span className="color-dot" style={{ background: tooltip.model.providerColor }} />
            {tooltip.model.providerName}
          </div>
          <div className="tt-name">{shortName(tooltip.model)}</div>
          <div className="tt-price-row">
            <span>
              <em>IN</em> {fmtModelPrice(tooltip.model, tooltip.model.pricing.input)}
            </span>
            <span>
              <em>OUT</em> {fmtModelPrice(tooltip.model, tooltip.model.pricing.output)}
            </span>
          </div>
          <div className="tt-meta">
            {fmtContext(tooltip.model.contextLength)} context
            {tooltip.model.reasoning ? ' · reasoning' : ''}
            <span className="tt-hint">click for details</span>
          </div>
          <div className="tt-sources">
            {tooltip.model.sourceLinks.map((link) => link.label).join(' · ')}
          </div>
        </div>
      )}
    </section>
  );
}
