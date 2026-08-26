import { useMemo, useState } from 'react';
import { SURFACES, SURFACE_LABEL, type Surface } from '../../domain/types';
import { SURFACE_RULES } from '../../domain/surfaces';
import { isValidHex, normaliseHex } from '../../color/convert';
import { displayName, getMaterial, searchMaterials } from '../../data/catalog';
import { suggestForSlot } from '../../engine/generate';
import { Panel } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { DecorSurface } from '../../ui/Decor';
import { actions, useStore } from '../../state/store';
import { MaterialRow } from '../library/MaterialRow';

/**
 * Per-slot alternatives.
 *
 * The whole point of this panel is that you do not have to reroll the entire
 * scheme to change one surface: every candidate is scored against the palette
 * as it stands, with the other slots held exactly where they are.
 */
export function SlotPanel({ slotId, onClose }: { slotId: string; onClose: () => void }) {
  const palette = useStore((s) => s.palette);
  const filters = useStore((s) => s.filters);
  const [query, setQuery] = useState('');

  const slot = palette.slots.find((s) => s.id === slotId);
  const suggestions = useMemo(
    () =>
      slot
        ? suggestForSlot(palette, slotId, 14, {
            brands: filters.brands,
            realProductsOnly: filters.realProductsOnly,
          })
        : [],
    [palette, slotId, filters, slot],
  );

  const searchResults = useMemo(() => {
    if (!query.trim() || !slot) return [];
    const allowed = SURFACE_RULES[slot.surface].categories;
    return searchMaterials(query, 40).filter(
      (m) => m.surfaces.includes(slot.surface) && allowed.includes(m.category),
    );
  }, [query, slot]);

  if (!slot) return null;
  const material = getMaterial(slot.materialId);
  const rule = SURFACE_RULES[slot.surface];

  return (
    <Panel title={`${SURFACE_LABEL[slot.surface]} · slot ${palette.slots.indexOf(slot) + 1}`} onClose={onClose}>
      <div className="section">
        <div className="row">
          <DecorSurface
            className="swatch"
            material={material}
            hex={slot.hex}
            style={{ width: 56, height: 56 }}
          />
          <div className="mat-info">
            <b>{material ? displayName(material) : 'Free colour'}</b>
            <span>{material ? `${material.brand} · ${material.collection ?? ''}` : slot.hex}</span>
          </div>
          <button
            className={`btn icon${slot.locked ? ' active' : ''}`}
            title={slot.locked ? 'Unlock' : 'Lock'}
            onClick={() => actions.toggleLock(slot.id)}
          >
            <Icon name={slot.locked ? 'lock' : 'unlock'} />
          </button>
        </div>
        <p className="faint">{rule.description}</p>
      </div>

      <div className="section">
        <h3>Slot role</h3>
        <div className="row wrap">
          {SURFACES.map((s) => (
            <button
              key={s}
              className={`chip${s === slot.surface ? ' on' : ''}`}
              onClick={() => actions.setSurface(slot.id, s as Surface)}
            >
              {SURFACE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>Exact colour</h3>
        <div className="row">
          <input
            type="color"
            className="input"
            style={{ width: 46, padding: 2 }}
            value={slot.hex}
            onChange={(e) => actions.setHex(slot.id, e.target.value.toUpperCase())}
            aria-label="Pick colour"
          />
          <input
            className="input"
            defaultValue={slot.hex}
            key={slot.hex}
            spellCheck={false}
            aria-label="Hex value"
            onBlur={(e) => {
              if (isValidHex(e.target.value)) actions.setHex(slot.id, normaliseHex(e.target.value));
              else e.target.value = slot.hex;
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </div>
        <p className="faint">
          Setting a colour by hand unbinds the slot from a product. Pick a decor below to bind it back.
        </p>
      </div>

      <div className="section">
        <h3>Note</h3>
        <textarea
          className="textarea"
          placeholder="e.g. client already owns this sofa — cannot change"
          defaultValue={slot.note ?? ''}
          onBlur={(e) => actions.setNote(slot.id, e.target.value)}
        />
      </div>

      <div className="section">
        <h3>Search this surface</h3>
        <input
          className="input"
          placeholder="Decor code or name — try U702, h3303 st10, walnut"
          value={query}
          spellCheck={false}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() !== '' && (
          <div className="mat-list">
            {searchResults.length === 0 && <p className="faint">Nothing in this surface's ranges matches.</p>}
            {searchResults.map((m) => (
              <MaterialRow
                key={m.id}
                material={m}
                selected={m.id === slot.materialId}
                onPick={() => actions.setMaterial(slot.id, m.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h3>Best alternatives, scored against the rest of the scheme</h3>
        <div className="mat-list">
          {suggestions.map((s) => (
            <MaterialRow
              key={s.material.id}
              material={s.material}
              score={s.score}
              reason={s.reason}
              onPick={() => actions.setMaterial(slot.id, s.material.id)}
            />
          ))}
          {suggestions.length === 0 && (
            <p className="faint">
              No alternatives available for this surface under the current filters. Widen the brand filter in the
              toolbar.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}
