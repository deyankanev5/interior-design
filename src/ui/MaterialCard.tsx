import type { MaterialView } from '../domain/types';
import { DecorSurface } from './Decor';
import { Icon } from './Icon';

/**
 * How sure we are that this is a thing you can order.
 *
 * Shown as a dot rather than a word on the card: at browsing size the decor is
 * what you are looking at, and three words of provenance on every tile would
 * compete with it. The label is in the tooltip and spelled out in the detail
 * view, where a specification decision is actually being made.
 */
const PROVENANCE: Record<MaterialView['provenance'], { cls: string; title: string }> = {
  'manufacturer-decor': {
    cls: 'real',
    title: 'Orderable — a decor code the manufacturer publishes. Quote it directly to your supplier.',
  },
  standard: {
    cls: 'std',
    title: 'A published colour standard. Any paint or lacquer supplier can match it.',
  },
  generic: {
    cls: 'gen',
    title: 'Representative finish, not a specific product. Substitute your supplier’s equivalent.',
  },
};

/**
 * One decor, as a card.
 *
 * The photograph is the card. Everything else — code, name, brand — is a
 * caption under it, because choosing a finish is a visual judgement first and a
 * reference-number one second. The old row put a 40px swatch beside two lines
 * of text, which inverted that.
 */
export function MaterialCard({
  material,
  selected,
  score,
  reason,
  onPick,
}: {
  material: MaterialView;
  selected?: boolean;
  score?: number;
  reason?: string;
  onPick: () => void;
}) {
  const tag = PROVENANCE[material.provenance];
  const code = `${material.code}${material.texture ? ` ${material.texture}` : ''}`;

  return (
    <button
      className={`card${selected ? ' selected' : ''}`}
      onClick={onPick}
      title={reason ?? `${code} · ${material.name} · ${material.brand}`}
      aria-pressed={selected}
    >
      <span className="card-face">
        <DecorSurface className="card-img" material={material} hex={material.hex} />
        <i className={`prov ${tag.cls}`} title={tag.title} aria-hidden="true" />
        {selected && (
          <span className="card-check" aria-hidden="true">
            <Icon name="check" size={13} />
          </span>
        )}
        {score !== undefined && <span className="card-score">{score}</span>}
      </span>
      <span className="card-code">{code}</span>
      <span className="card-name">{material.name}</span>
      <span className="card-meta">
        {material.brand} · LRV {material.lrv.toFixed(0)}
      </span>
      {reason && <span className="card-reason">{reason}</span>}
    </button>
  );
}
