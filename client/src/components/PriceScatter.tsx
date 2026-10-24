import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import type { Model } from '../types';
import './PriceScatter.css';

interface PriceScatterProps {
  models: Model[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  className?: string;
}

type PointKind = 'priced' | 'free' | 'na';

interface ScatterPoint {
  model: Model;
  kind: PointKind;
  x: number;
  y: number;
  r: number;
}

interface ChartGeometry {
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  plotW: number;
  plotH: number;
  guttersX: number;
  freeCenterY: number;
  x: (value: number) => number;
  y: (value: number) => number;
}

const PRICE_MIN = 0.001;
const PRICE_MAX = 200;
const LOG_MIN = Math.log10(PRICE_MIN);
const LOG_MAX = Math.log10(PRICE_MAX);
const TICKS = [0.001, 0.01, 0.1, 1, 10, 100];
const FREE_LANE = 30;
const FREE_BAND_HEIGHT = 22;
const LEGEND_WIDTH = 198;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scaleLog(value: number, start: number, length: number): number {
  const bounded = clamp(value, PRICE_MIN, PRICE_MAX);
  return start + ((Math.log10(bounded) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * length;
}

function tickLabel(value: number): string {
  if (value === PRICE_MIN) return '$0.001';
  if (value === 0.01) return '$0.01';
  if (value === 0.1) return '$0.10';
  if (value === 1) return '$1';
  if (value === 10) return '$10';
  return '$100';
}

function formatUsd(value: number | null): string {
  if (value === null) return 'Variable';
  if (value <= 0) return 'Free';
  if (value >= 100) return `$${value.toFixed(0)}`;
  const decimals = value < 0.01 ? 4 : value < 1 ? 3 : 2;
  return `$${value.toFixed(decimals).replace(/0+$/, '').replace(/\.$/, '')}`;
}

function priceText(model: Model, value: number | null): string {
  if (value !== null) return formatUsd(value);
  return model.pricing.isVariable ? 'Variable' : 'Unlisted';
}

function formatPriceDetail(model: Model, value: number | null): string {
  return value !== null && value > 0 ? `${formatUsd(value)} / 1M` : priceText(model, value);
}

function formatContext(contextLength: number): string {
  const value = Math.max(0, contextLength || 0);
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions >= 10 ? millions.toFixed(0) : millions.toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${value}`;
}

function hashUnit(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function isFreeModel(model: Model): boolean {
  return model.pricing.isFree || (model.pricing.input === 0 && model.pricing.output === 0);
}

export default function PriceScatter({
  models,
  selectedIds,
  onToggle,
  onOpen,
  className,
}: PriceScatterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const clickTimersRef = useRef<Map<string, number>>(new Map());

  const [width, setWidth] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  const activeId = hoveredId ?? focusedId;
  const height = Math.max(320, Math.min(460, Math.round(width * 0.7)));

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const publish = (nextWidth: number) => {
      const rounded = Math.round(nextWidth);
      setWidth((current) => (current === rounded ? current : rounded));
    };

    publish(element.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) publish(entry.contentRect.width);
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      for (const timer of clickTimersRef.current.values()) window.clearTimeout(timer);
      clickTimersRef.current.clear();
    },
    [],
  );

  const geometry = useMemo<ChartGeometry>(() => {
    const left = 56;
    const top = 20;
    const right = Math.max(left + 70, width - 64);
    const bottom = height - 48 - FREE_LANE;
    const plotW = Math.max(10, right - left);
    const plotH = Math.max(10, bottom - top);
    return {
      width,
      height,
      left,
      top,
      right,
      bottom,
      plotW,
      plotH,
      guttersX: (right + 8 + (width - 28)) / 2,
      freeCenterY: bottom + 2 + FREE_BAND_HEIGHT / 2,
      x: (value: number) => scaleLog(value, left, plotW),
      y: (value: number) => top + plotH - ((Math.log10(clamp(value, PRICE_MIN, PRICE_MAX)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * plotH,
    };
  }, [width, height]);

  const points = useMemo(() => {
    const priced: ScatterPoint[] = [];
    const free: ScatterPoint[] = [];
    const na: ScatterPoint[] = [];
    const freeModels: Model[] = [];
    const naModels: Model[] = [];

    for (const model of models) {
      const input = model.pricing.input;
      const output = model.pricing.output;

      if (input === null || output === null) {
        naModels.push(model);
        continue;
      }

      if (input === 0 && output === 0) {
        freeModels.push(model);
        continue;
      }

      const contextFactor = Math.min(1, Math.sqrt((model.contextLength || 0) / 1_000_000));
      const spread = Math.sqrt(hashUnit(`${model.id}:spread`)) * 4.2;
      const angle = hashUnit(`${model.id}:angle`) * Math.PI * 2;
      priced.push({
        model,
        kind: 'priced',
        x: geometry.x(input) + Math.cos(angle) * spread,
        y: geometry.y(output) + Math.sin(angle) * spread,
        r: 3.4 + 2.4 * contextFactor,
      });
    }

    freeModels.sort((a, b) => a.name.localeCompare(b.name));
    const freeSpan = Math.max(0, geometry.plotW - 36);
    freeModels.forEach((model, index) => {
      const t = freeModels.length === 1 ? 0.5 : index / (freeModels.length - 1);
      const jitter = (hashUnit(model.id) - 0.5) * 4.6;
      free.push({
        model,
        kind: 'free',
        x: geometry.left + 18 + freeSpan * t,
        y: geometry.freeCenterY + jitter,
        r: 3.9,
      });
    });

    naModels.sort((a, b) => a.name.localeCompare(b.name));
    const gutterTop = geometry.top + 26;
    const gutterBottom = geometry.bottom - 10;
    const gutterSpan = Math.max(10, gutterBottom - gutterTop);
    naModels.forEach((model, index) => {
      const t = naModels.length === 1 ? 0.5 : (index + 0.5) / naModels.length;
      const jitter = (hashUnit(model.id) - 0.5) * 5.4;
      na.push({
        model,
        kind: 'na',
        x: geometry.guttersX + jitter,
        y: gutterTop + gutterSpan * t,
        r: 3.6,
      });
    });

    return { priced, free, na, all: [...priced, ...free, ...na] };
  }, [models, geometry]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const orderedPoints = useMemo(() => {
    const rank = (point: ScatterPoint): number => (selectedSet.has(point.model.id) ? 1 : 0);
    return points.all
      .map((point, index) => ({ point, index, rank: rank(point) }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map((entry) => entry.point);
  }, [points, selectedSet]);

  const activePoint = useMemo(
    () => points.all.find((point) => point.model.id === activeId) ?? null,
    [points, activeId],
  );

  const summary = useMemo(() => {
    const freeCount = points.free.length;
    const naCount = points.na.length;
    return `Price scatter plot for ${models.length} models. Input price versus output price in US dollars per million tokens, logarithmic axes from $0.001 to $200. ${points.priced.length} priced models, ${freeCount} free models in the free lane, ${naCount} variable or unpriced models in the N/A gutter.`;
  }, [models.length, points]);

  useLayoutEffect(() => {
    const element = tooltipRef.current;
    if (!activePoint || !element) {
      setTooltipSize((current) => (current.width === 0 && current.height === 0 ? current : { width: 0, height: 0 }));
      return;
    }
    const rect = element.getBoundingClientRect();
    setTooltipSize((current) =>
      Math.abs(current.width - rect.width) < 1 && Math.abs(current.height - rect.height) < 1
        ? current
        : { width: rect.width, height: rect.height },
    );
  }, [activePoint, width]);

  const cancelPendingToggle = (id: string) => {
    const timer = clickTimersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      clickTimersRef.current.delete(id);
    }
  };

  const openModel = (id: string) => {
    cancelPendingToggle(id);
    onOpen(id);
  };

  const markerHandlers = (id: string) => ({
    tabIndex: 0,
    role: 'button',
    onMouseEnter: () => setHoveredId(id),
    onMouseLeave: () => setHoveredId((current) => (current === id ? null : current)),
    onFocus: () => setFocusedId(id),
    onBlur: () => setFocusedId((current) => (current === id ? null : current)),
    onClick: (event: MouseEvent<SVGElement>) => {
      if (event.detail > 1) {
        cancelPendingToggle(id);
        return;
      }
      if (event.shiftKey) {
        openModel(id);
        return;
      }
      cancelPendingToggle(id);
      const timer = window.setTimeout(() => {
        clickTimersRef.current.delete(id);
        onToggle(id);
      }, 220);
      clickTimersRef.current.set(id, timer);
    },
    onDoubleClick: () => openModel(id),
    onKeyDown: (event: KeyboardEvent<SVGElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        openModel(id);
        return;
      }
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        onToggle(id);
      }
    },
  });

  const describe = (point: ScatterPoint): string => {
    const { model } = point;
    const selected = selectedSet.has(model.id);
    const input = model.pricing.input;
    const output = model.pricing.output;
    const priceWord = (value: number | null) =>
      value === null
        ? model.pricing.isVariable
          ? 'variable'
          : 'unlisted'
        : formatUsd(value).toLowerCase();
    const freeNote = isFreeModel(model) ? ' Free model.' : '';
    const priceNote = model.pricing.isVariable
      ? ' Variable pricing.'
      : model.pricing.known
        ? ''
        : ' No public list price.';
    return `${model.name} by ${model.providerName}. Input ${priceWord(input)} per 1M tokens, output ${priceWord(output)} per 1M tokens. Context ${formatContext(model.contextLength)} tokens.${freeNote}${priceNote} ${selected ? 'Remove from' : 'Add to'} comparison.`;
  };

  const legendX = Math.max(geometry.left + 8, geometry.right - 8 - LEGEND_WIDTH);
  const legendY = geometry.top + 8;
  const parityTextX = geometry.left + geometry.plotW * 0.76;
  const parityTextY = geometry.bottom - geometry.plotH * 0.76 - 7;
  const parityAngle = (Math.atan2(geometry.top - geometry.bottom, geometry.right - geometry.left) * 180) / Math.PI;

  const tooltipWidth = Math.max(150, Math.min(238, width - 16));
  let tooltipLeft = 0;
  let tooltipTop = 0;
  if (activePoint) {
    const measuredWidth = tooltipSize.width || tooltipWidth;
    const measuredHeight = tooltipSize.height;
    let left = activePoint.x + 14;
    if (left + measuredWidth > width - 8) left = activePoint.x - measuredWidth - 14;
    tooltipLeft = clamp(left, 8, Math.max(8, width - measuredWidth - 8));

    let top = activePoint.y - measuredHeight - 14;
    if (top < 8) top = activePoint.y + 18;
    tooltipTop = clamp(top, 8, Math.max(8, height - measuredHeight - 8));
  }

  return (
    <div ref={containerRef} className={`scatter-root${className ? ` ${className}` : ''}`}>
      {models.length === 0 ? (
        <div className="scatter-empty" role="status">
          No models match these filters.
        </div>
      ) : width > 0 ? (
        <>
          <svg
            ref={svgRef}
            className="scatter-svg"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="group"
            aria-label={summary}
          >
            <g aria-hidden="true">
              <rect
                className="scatter-plot-surface"
                x={geometry.left}
                y={geometry.top}
                width={geometry.plotW}
                height={geometry.plotH}
                rx={4}
              />
              {TICKS.map((tick) => {
                const tickX = geometry.x(tick);
                const tickY = geometry.y(tick);
                return (
                  <g key={tick}>
                    <line className="scatter-grid-line" x1={tickX} x2={tickX} y1={geometry.top} y2={geometry.bottom} />
                    <line className="scatter-grid-line" x1={geometry.left} x2={geometry.right} y1={tickY} y2={tickY} />
                    <text className="scatter-tick" x={tickX} y={height - 31} textAnchor="middle">
                      {tickLabel(tick)}
                    </text>
                    <text className="scatter-tick" x={geometry.left - 8} y={tickY + 3.5} textAnchor="end">
                      {tickLabel(tick)}
                    </text>
                  </g>
                );
              })}

              <line className="scatter-axis-line" x1={geometry.left} x2={geometry.right} y1={geometry.bottom} y2={geometry.bottom} />
              <line className="scatter-axis-line" x1={geometry.left} x2={geometry.left} y1={geometry.top} y2={geometry.bottom} />

              <line
                className="scatter-parity-line"
                x1={geometry.left}
                y1={geometry.bottom}
                x2={geometry.right}
                y2={geometry.top}
              />
              <text
                className="scatter-parity-label"
                x={parityTextX}
                y={parityTextY}
                textAnchor="middle"
                transform={`rotate(${parityAngle} ${parityTextX} ${parityTextY})`}
              >
                input = output
              </text>

              <rect
                className="scatter-free-band"
                x={geometry.left}
                y={geometry.bottom + 2}
                width={geometry.plotW}
                height={FREE_BAND_HEIGHT}
                rx={6}
              />
              <text
                className="scatter-free-label"
                x={geometry.left - 10}
                y={geometry.freeCenterY + 3.2}
                textAnchor="end"
              >
                FREE
              </text>

              <line
                className="scatter-gutter-divider"
                x1={geometry.right + 10}
                x2={geometry.right + 10}
                y1={geometry.top}
                y2={geometry.bottom}
              />
              <text className="scatter-gutter-label" x={geometry.guttersX} y={geometry.top + 11} textAnchor="middle">
                N/A
              </text>

              <text className="scatter-axis-title" x={(geometry.left + geometry.right) / 2} y={height - 10} textAnchor="middle">
                INPUT · $ / 1M TOKENS
              </text>
              <text
                className="scatter-axis-title"
                x={10}
                y={(geometry.top + geometry.bottom) / 2}
                textAnchor="middle"
                transform={`rotate(-90 10 ${(geometry.top + geometry.bottom) / 2})`}
              >
                OUTPUT · $ / 1M TOKENS
              </text>
            </g>

            <g>
              {orderedPoints.map((point) => {
                const selected = selectedSet.has(point.model.id);
                const active = activeId === point.model.id;
                const classNameForMarker = `scatter-marker scatter-marker--${point.kind}${selected ? ' is-selected' : ''}${active ? ' is-active' : ''}`;
                const label = describe(point);
                const handlers = markerHandlers(point.model.id);
                const hitRadius = Math.max(8, point.r + 3.5);
                return (
                  <g key={point.model.id}>
                    {selected ? (
                      <circle
                        className="scatter-ring"
                        cx={point.x}
                        cy={point.y}
                        r={point.r + 4.5}
                        aria-hidden="true"
                      />
                    ) : null}
                    {point.kind === 'free' ? (
                      <path
                        className={classNameForMarker}
                        d={`M ${point.x} ${point.y - point.r} L ${point.x + point.r} ${point.y} L ${point.x} ${point.y + point.r} L ${point.x - point.r} ${point.y} Z`}
                        fill="var(--accent, #5eead4)"
                        stroke="var(--bg, #070b12)"
                        strokeWidth={1}
                        pointerEvents="none"
                        aria-hidden="true"
                      />
                    ) : point.kind === 'na' ? (
                      <circle
                        className={classNameForMarker}
                        cx={point.x}
                        cy={point.y}
                        r={point.r}
                        fill="none"
                        stroke="var(--muted, #8496ad)"
                        strokeWidth={1.2}
                        pointerEvents="none"
                        aria-hidden="true"
                      />
                    ) : (
                      <circle
                        className={classNameForMarker}
                        cx={point.x}
                        cy={point.y}
                        r={point.r}
                        fill={point.model.providerColor || 'var(--accent, #5eead4)'}
                        fillOpacity={selected ? 1 : 0.8}
                        stroke="var(--bg, #070b12)"
                        strokeWidth={1}
                        pointerEvents="none"
                        aria-hidden="true"
                      />
                    )}
                    <circle
                      className="scatter-hit"
                      cx={point.x}
                      cy={point.y}
                      r={hitRadius}
                      aria-label={label}
                      aria-pressed={selected}
                      {...handlers}
                    />
                  </g>
                );
              })}
            </g>

            <g className="scatter-legend" transform={`translate(${legendX} ${legendY})`} aria-hidden="true">
              <rect className="scatter-legend-panel" width={LEGEND_WIDTH} height={28} rx={8} />
              <circle className="scatter-legend-dot" cx={14} cy={14} r={3.8} />
              <text className="scatter-legend-text" x={23} y={17.5}>
                Priced
              </text>
              <path className="scatter-legend-diamond" d="M 78 9.5 L 82.5 14 L 78 18.5 L 73.5 14 Z" />
              <text className="scatter-legend-text" x={88} y={17.5}>
                Free
              </text>
              <circle className="scatter-legend-hollow" cx={128} cy={14} r={3.8} />
              <text className="scatter-legend-text" x={138} y={17.5}>
                No price
              </text>
            </g>
          </svg>

          <div className="scatter-footer">
            <span>Click a dot to compare · Shift-click or double-click for details</span>
            <span className="scatter-footer-count">{models.length} models</span>
          </div>
        </>
      ) : (
        <div className="scatter-placeholder" aria-hidden="true" />
      )}

      {activePoint ? (
        <div
          ref={tooltipRef}
          className="scatter-tooltip"
          role="tooltip"
          style={{
            left: tooltipLeft,
            top: tooltipTop,
            width: tooltipWidth,
            visibility: tooltipSize.height > 0 ? 'visible' : 'hidden',
          }}
        >
          <div className="scatter-tooltip-head">
            <span className="scatter-tooltip-name">{activePoint.model.name}</span>
            <span className="scatter-tooltip-provider">
              <span
                className="scatter-tooltip-swatch"
                style={{ backgroundColor: activePoint.model.providerColor }}
              />
              {activePoint.model.providerName}
            </span>
          </div>

          <div className="scatter-tooltip-prices">
            <div className="scatter-tooltip-row">
              <span className="scatter-tooltip-key">INPUT</span>
              <span className={`scatter-tooltip-value${activePoint.model.pricing.input === null ? ' is-na' : ''}`}>
                {formatPriceDetail(activePoint.model, activePoint.model.pricing.input)}
              </span>
            </div>
            <div className="scatter-tooltip-row">
              <span className="scatter-tooltip-key">OUTPUT</span>
              <span className={`scatter-tooltip-value${activePoint.model.pricing.output === null ? ' is-na' : ''}`}>
                {formatPriceDetail(activePoint.model, activePoint.model.pricing.output)}
              </span>
            </div>
          </div>

          <div className="scatter-tooltip-meta">
            {formatContext(activePoint.model.contextLength)} context
          </div>

          <div className="scatter-tooltip-meta scatter-tooltip-sources">
            {activePoint.model.sourceLinks.map((link) => link.label).join(' · ')}
          </div>

          {isFreeModel(activePoint.model) ||
          activePoint.model.pricing.isVariable ||
          !activePoint.model.pricing.known ? (
            <div className="scatter-tooltip-badges">
              {isFreeModel(activePoint.model) ? <span className="scatter-badge scatter-badge--free">FREE</span> : null}
              {activePoint.model.pricing.isVariable ? (
                <span className="scatter-badge scatter-badge--variable">VARIABLE</span>
              ) : null}
              {!activePoint.model.pricing.known && !activePoint.model.pricing.isVariable ? (
                <span className="scatter-badge scatter-badge--unlisted">UNLISTED</span>
              ) : null}
            </div>
          ) : null}

          <div className="scatter-tooltip-hint">click to compare · shift-click for details</div>
        </div>
      ) : null}
    </div>
  );
}
