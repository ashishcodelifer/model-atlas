import type { ElementDefinition } from 'cytoscape';
import type { Model, ProviderSummary } from '../types';
import { fmtContext, fmtPrice, priceUnavailableLabel, shortName } from './format';
import { nodeSize, priceTier } from './filters';

export interface ConstellationResult {
  elements: ElementDefinition[];
  positions: Map<string, { x: number; y: number }>;
}

interface PlacedModel {
  model: Model;
  x: number;
  y: number;
}

interface Cluster {
  provider: string;
  name: string;
  color: string;
  items: PlacedModel[];
  radius: number;
  center: { x: number; y: number };
}

function placeModels(models: Model[]): PlacedModel[] {
  const sorted = [...models].sort(
    (a, b) => b.contextLength - a.contextLength || a.name.localeCompare(b.name),
  );

  if (sorted.length === 1) {
    return [{ model: sorted[0], x: 0, y: 0 }];
  }

  if (sorted.length <= 6) {
    const radius = sorted.length <= 3 ? 34 : 42;
    return sorted.map((model, index) => {
      const angle = -Math.PI / 2 + (index / sorted.length) * Math.PI * 2;
      return { model, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
    });
  }

  const placed: PlacedModel[] = [{ model: sorted[0], x: 0, y: 0 }];
  let index = 1;
  let ring = 1;
  while (index < sorted.length) {
    const capacity = 4 + ring * 4;
    const count = Math.min(capacity, sorted.length - index);
    const radius = 56 + (ring - 1) * 38;
    for (let slot = 0; slot < count; slot += 1) {
      const angle = -Math.PI / 2 + (slot / count) * Math.PI * 2;
      placed.push({
        model: sorted[index],
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
      index += 1;
    }
    ring += 1;
  }
  return placed;
}

function packClusters(clusters: Cluster[]): void {
  const gap = 38;
  const sorted = [...clusters].sort((a, b) => b.radius - a.radius || a.name.localeCompare(b.name));
  const totalArea = sorted.reduce(
    (sum, cluster) => sum + Math.PI * (cluster.radius + gap / 2) ** 2,
    0,
  );
  const targetWidth = Math.max(900, Math.sqrt(totalArea * 1.45));

  const rows: { items: Cluster[]; width: number; height: number }[] = [];
  let row: { items: Cluster[]; width: number; height: number } = {
    items: [],
    width: 0,
    height: 0,
  };

  for (const cluster of sorted) {
    const diameter = cluster.radius * 2 + gap;
    if (row.items.length > 0 && row.width + diameter > targetWidth) {
      rows.push(row);
      row = { items: [], width: 0, height: 0 };
    }
    row.items.push(cluster);
    row.width += diameter;
    row.height = Math.max(row.height, diameter);
  }
  if (row.items.length) rows.push(row);

  let cursorY = 0;
  for (const currentRow of rows) {
    let cursorX = 0;
    for (const cluster of currentRow.items) {
      const diameter = cluster.radius * 2 + gap;
      cluster.center = {
        x: cursorX + diameter / 2,
        y: cursorY + currentRow.height / 2,
      };
      cursorX += diameter;
    }
    cursorY += currentRow.height + gap;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const cluster of clusters) {
    minX = Math.min(minX, cluster.center.x - cluster.radius);
    maxX = Math.max(maxX, cluster.center.x + cluster.radius);
    minY = Math.min(minY, cluster.center.y - cluster.radius);
    maxY = Math.max(maxY, cluster.center.y + cluster.radius);
  }
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  for (const cluster of clusters) {
    cluster.center.x -= midX;
    cluster.center.y -= midY;
  }
}

export function buildConstellation(
  models: Model[],
  providers: ProviderSummary[],
): ConstellationResult {
  const meta = new Map(providers.map((provider) => [provider.id, provider]));
  const groups = new Map<string, Model[]>();
  for (const model of models) {
    const list = groups.get(model.provider);
    if (list) list.push(model);
    else groups.set(model.provider, [model]);
  }

  const clusters: Cluster[] = [];
  for (const [provider, group] of groups) {
    const providerMeta = meta.get(provider);
    const placed = placeModels(group);
    const maxRadius = placed.reduce(
      (max, item) => Math.max(max, Math.hypot(item.x, item.y)),
      0,
    );
    clusters.push({
      provider,
      name: providerMeta?.name ?? group[0].providerName,
      color: providerMeta?.color ?? group[0].providerColor,
      items: placed,
      radius: Math.max(62, maxRadius + 34),
      center: { x: 0, y: 0 },
    });
  }

  packClusters(clusters);

  const elements: ElementDefinition[] = [];
  const positions = new Map<string, { x: number; y: number }>();

  for (const cluster of clusters) {
    const parentId = `p:${cluster.provider}`;
    elements.push({
      group: 'nodes',
      data: {
        id: parentId,
        kind: 'provider',
        provider: cluster.provider,
        label: cluster.name,
        color: cluster.color,
        count: cluster.items.length,
      },
      position: { ...cluster.center },
    });

    for (const item of cluster.items) {
      const { model } = item;
      const tier = priceTier(model);
      const position = {
        x: cluster.center.x + item.x,
        y: cluster.center.y + item.y,
      };
      const id = `m:${model.id}`;
      positions.set(id, position);
      elements.push({
        group: 'nodes',
        data: {
          id,
          kind: 'model',
          modelId: model.id,
          parent: parentId,
          label: shortName(model),
          size: nodeSize(model.contextLength),
          fill: tier.color,
          tier: tier.key,
          provider: cluster.provider,
          providerName: model.providerName,
          contextLabel: fmtContext(model.contextLength),
          priceLabel:
            model.pricing.blended === null
              ? `${priceUnavailableLabel(model)} price`
              : `${fmtPrice(model.pricing.blended)} blended / 1M`,
        },
        classes: [tier.key, model.pricing.isFree ? 'is-free' : ''].filter(Boolean).join(' '),
        position,
      });
    }
  }

  return { elements, positions };
}
