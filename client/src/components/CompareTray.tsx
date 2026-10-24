import type { Model } from '../types';
import { shortName } from '../lib/format';
import { Icon } from './Icons';

interface CompareTrayProps {
  models: Model[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpen: (id: string) => void;
  onCompare: () => void;
}

export function CompareTray({ models, onRemove, onClear, onOpen, onCompare }: CompareTrayProps) {
  if (models.length === 0) return null;

  return (
    <div className="compare-tray" role="region" aria-label="Compare lineup">
      <div className="tray-main">
        <span className="tray-label">
          <Icon name="layers" size={15} /> Lineup
          <span className="tray-count">{models.length}/8</span>
        </span>
        <div className="tray-chips">
          {models.map((model) => (
            <div className="tray-chip" key={model.id}>
              <span className="color-dot" style={{ background: model.providerColor }} />
              <button
                type="button"
                className="tray-chip-name"
                onClick={() => onOpen(model.id)}
                title={model.name}
              >
                {shortName(model)}
              </button>
              <button
                type="button"
                className="tray-chip-x"
                onClick={() => onRemove(model.id)}
                aria-label={`Remove ${model.name}`}
              >
                <Icon name="x" size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="tray-actions">
        <button type="button" className="link-btn" onClick={onClear}>
          Clear
        </button>
        <button type="button" className="btn primary small" onClick={onCompare}>
          Compare {models.length} <Icon name="arrow-up-right" size={14} />
        </button>
      </div>
    </div>
  );
}
