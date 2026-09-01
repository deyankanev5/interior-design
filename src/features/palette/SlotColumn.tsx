import { SURFACES, SURFACE_LABEL, type Slot, type Surface } from '../../domain/types';
import { lrv, readableTextOn } from '../../color/convert';
import { displayName, getMaterial } from '../../data/catalog';
import { DecorSurface } from '../../ui/Decor';
import { Icon } from '../../ui/Icon';
import { actions } from '../../state/store';

/**
 * One surface in the scheme.
 *
 * What the column says, in order of size, is what the user is meant to read
 * first. That used to be the hex code, which is the least useful thing on a
 * finish schedule — nobody on site can buy `#CFC0B3`. It now leads with the
 * decor reference and its name; the hex has moved into the slot's detail panel,
 * where it sits last, as one attribute among several.
 */
export function SlotColumn({
  slot,
  index,
  total,
  onOpen,
}: {
  slot: Slot;
  index: number;
  total: number;
  onOpen: (slotId: string) => void;
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
      /* The colour is no longer written on the face of the column, but the
         scheme still has to be assertable from the outside — the end-to-end
         test reads it here rather than from a rendered hex string. */
      data-hex={slot.hex}
    >
      <DecorSurface className="slot-surface" material={material} hex={slot.hex} />
      <span className="slot-scrim" />

      <div className="slot-head">
        <span className="surface-pill" title="Change what this surface is">
          {/* The select below is the real control; this label is decoration. */}
          <span aria-hidden="true">{SURFACE_LABEL[slot.surface]}</span>
          <Icon name="chevron" size={13} />
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
            <Icon name="left" size={15} />
          </button>
          <button
            className="slot-tool"
            title="Move right"
            aria-label="Move slot right"
            disabled={index === total - 1}
            onClick={() => actions.move(slot.id, 1)}
          >
            <Icon name="right" size={15} />
          </button>
          <button
            className="slot-tool"
            title="Remove slot"
            aria-label="Remove slot"
            disabled={total <= 2}
            onClick={() => actions.removeSlot(slot.id)}
          >
            <Icon name="trash" size={15} />
          </button>
          <button
            className={`slot-tool${slot.locked ? ' on' : ''}`}
            title={slot.locked ? 'Unlock — generation may change this' : 'Lock — generation will leave this alone'}
            aria-label={slot.locked ? 'Unlock slot' : 'Lock slot'}
            aria-pressed={slot.locked}
            onClick={() => actions.toggleLock(slot.id)}
          >
            <Icon name={slot.locked ? 'lock' : 'unlock'} size={16} />
          </button>
        </div>
      </div>

      {slot.locked && (
        <span className="lock-badge" title="Locked — generation leaves this alone">
          <Icon name="lock" size={16} />
        </span>
      )}

      <div className="slot-body">
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
            <span className="slot-code free">Custom colour</span>
            <span className="slot-name">Not bound to a product</span>
            <span className="slot-meta">LRV {value.toFixed(0)}</span>
          </>
        )}

        {slot.note && <span className="slot-note">{slot.note}</span>}

        <button className="slot-open" onClick={() => onOpen(slot.id)}>
          <Icon name="sliders" size={14} />
          Change
        </button>
      </div>
    </div>
  );
}
