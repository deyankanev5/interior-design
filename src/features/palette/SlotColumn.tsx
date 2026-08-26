import { SURFACES, SURFACE_LABEL, type Slot, type Surface } from '../../domain/types';
import { lrv, readableTextOn } from '../../color/convert';
import { displayName, getMaterial } from '../../data/catalog';
import { DecorSurface } from '../../ui/Decor';
import { Icon } from '../../ui/Icon';
import { actions } from '../../state/store';

export function SlotColumn({
  slot,
  index,
  total,
  onOpen,
  onCopy,
}: {
  slot: Slot;
  index: number;
  total: number;
  onOpen: (slotId: string) => void;
  onCopy: (text: string) => void;
}) {
  const material = getMaterial(slot.materialId);
  const fg = readableTextOn(slot.hex);
  const value = lrv(slot.hex);

  return (
    <div
      className={`slot${slot.locked ? ' locked' : ''}`}
      style={{ background: slot.hex, color: fg }}
      data-surface={slot.surface}
      data-fg={fg}
    >
      <DecorSurface className="slot-surface" material={material} hex={slot.hex} />
      <span className="slot-scrim" />

      <div className="slot-head">
        <span className="surface-pill">
          {/* The select below is the real control; this label is decoration. */}
          <span aria-hidden="true">{SURFACE_LABEL[slot.surface]}</span>
          <Icon name="swap" size={12} />
          <select
            value={slot.surface}
            aria-label={`Role for slot ${index + 1}`}
            onChange={(e) => actions.setSurface(slot.id, e.target.value as Surface)}
          >
            {SURFACES.map((s) => (
              <option key={s} value={s}>
                {SURFACE_LABEL[s]}
              </option>
            ))}
          </select>
        </span>

        <div className="slot-tools">
          <button
            className="slot-tool"
            title="Move left"
            aria-label="Move slot left"
            disabled={index === 0}
            onClick={() => actions.move(slot.id, -1)}
          >
            <Icon name="left" size={14} />
          </button>
          <button
            className="slot-tool"
            title="Move right"
            aria-label="Move slot right"
            disabled={index === total - 1}
            onClick={() => actions.move(slot.id, 1)}
          >
            <Icon name="right" size={14} />
          </button>
          <button
            className="slot-tool"
            title="Alternatives for this surface"
            aria-label="Show alternatives"
            onClick={() => onOpen(slot.id)}
          >
            <Icon name="layers" size={15} />
          </button>
          <button
            className="slot-tool"
            title="Remove slot"
            aria-label="Remove slot"
            disabled={total <= 2}
            onClick={() => actions.removeSlot(slot.id)}
          >
            <Icon name="trash" size={14} />
          </button>
          <button
            className={`slot-tool${slot.locked ? ' on' : ''}`}
            title={slot.locked ? 'Unlock — generation may change this' : 'Lock — generation will leave this alone'}
            aria-label={slot.locked ? 'Unlock slot' : 'Lock slot'}
            aria-pressed={slot.locked}
            onClick={() => actions.toggleLock(slot.id)}
          >
            <Icon name={slot.locked ? 'lock' : 'unlock'} size={15} />
          </button>
        </div>
      </div>

      {slot.locked && (
        <span className="lock-badge">
          <Icon name="lock" size={17} />
        </span>
      )}

      <div className="slot-body">
        <button
          className="slot-hex"
          title="Copy hex"
          onClick={() => onCopy(slot.hex)}
          style={{ color: fg }}
        >
          {slot.hex.replace('#', '')}
        </button>

        {material ? (
          <>
            <span className="slot-code">
              {material.code}
              {material.texture ? ` ${material.texture}` : ''}
            </span>
            <span className="slot-name" title={displayName(material)}>
              {material.name}
            </span>
            <span className="slot-meta">
              {material.brand} · LRV {value.toFixed(0)}
            </span>
          </>
        ) : (
          <>
            <span className="slot-name">Free colour</span>
            <span className="slot-meta">LRV {value.toFixed(0)}</span>
          </>
        )}

        {slot.note && <span className="slot-note">{slot.note}</span>}
      </div>
    </div>
  );
}
