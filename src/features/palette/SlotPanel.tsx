import { useDeferredValue, useMemo, useState } from 'react';
import { SURFACES, SURFACE_LABEL, PATTERN_LABEL, type Surface } from '../../domain/types';
import { SURFACE_RULES } from '../../domain/surfaces';
import { lrv } from '../../color/convert';
import { browseMaterials, displayName, getMaterial } from '../../data/catalog';
import { suggestForSlot } from '../../engine/generate';
import { Panel } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { DecorSurface } from '../../ui/Decor';
import { ColorField } from '../../ui/ColorField';
import { MaterialGrid } from '../../ui/MaterialGrid';
import { actions, useStore } from '../../state/store';

type Tab = 'suggested' | 'browse' | 'colour';

/**
 * Everything you can do to one surface.
 *
 * Three tabs, because the three ways people arrive at a finish are genuinely
 * different tasks and stacking them down one scrolling column made the second
 * and third all but invisible: take the engine's recommendation, go looking
 * through the range yourself, or set a colour by hand. The last of those was
 * previously a 46px swatch buried between a note field and a search box.
 */
export function SlotPanel({
  slotId,
  onClose,
  onCopy,
}: {
  slotId: string;
  onClose: () => void;
  onCopy: (text: string) => void;
}) {
  const palette = useStore((s) => s.palette);
  const filters = useStore((s) => s.filters);
  const [tab, setTab] = useState<Tab>('suggested');
  const [query, setQuery] = useState('');
  // Typing into a box that filters 875 entries should not stutter.
  const deferredQuery = useDeferredValue(query);

  const slot = palette.slots.find((s) => s.id === slotId);

  const suggestions = useMemo(
    () =>
      slot
        ? suggestForSlot(palette, slotId, 24, {
            brands: filters.brands,
            realProductsOnly: filters.realProductsOnly,
          })
        : [],
    [palette, slotId, filters, slot],
  );

  const suggested = useMemo(() => suggestions.map((s) => s.material), [suggestions]);
  const scores = useMemo(() => new Map(suggestions.map((s) => [s.material.id, s.score])), [suggestions]);
  const reasons = useMemo(() => new Map(suggestions.map((s) => [s.material.id, s.reason])), [suggestions]);

  const browse = useMemo(() => {
    if (!slot) return [];
    return browseMaterials({
      query: deferredQuery,
      surface: slot.surface,
      categories: SURFACE_RULES[slot.surface].categories,
      brands: filters.brands,
      realProductsOnly: filters.realProductsOnly,
    });
  }, [deferredQuery, slot, filters]);

  if (!slot) return null;
  const material = getMaterial(slot.materialId);
  const rule = SURFACE_RULES[slot.surface];
  const index = palette.slots.indexOf(slot);

  return (
    <Panel title={`Slot ${index + 1} · ${SURFACE_LABEL[slot.surface]}`} onClose={onClose}>
      <div className="slot-summary">
        <DecorSurface className="summary-swatch" material={material} hex={slot.hex} />
        <div className="summary-text">
          <b>{material ? material.name : 'Custom colour'}</b>
          <span>
            {material
              ? `${material.code}${material.texture ? ` ${material.texture}` : ''} · ${material.brand}`
              : 'Not bound to a product'}
          </span>
        </div>
        <button
          className={`btn icon${slot.locked ? ' active' : ''}`}
          title={slot.locked ? 'Unlock' : 'Lock — generation will leave this alone'}
          onClick={() => actions.toggleLock(slot.id)}
        >
          <Icon name={slot.locked ? 'lock' : 'unlock'} />
        </button>
      </div>

      <div className="section">
        <h3>This surface is a</h3>
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
        <p className="faint">{rule.description}</p>
      </div>

      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'suggested'}
          className={`tab${tab === 'suggested' ? ' on' : ''}`}
          onClick={() => setTab('suggested')}
        >
          <Icon name="check" size={14} />
          Suggested
        </button>
        <button
          role="tab"
          aria-selected={tab === 'browse'}
          className={`tab${tab === 'browse' ? ' on' : ''}`}
          onClick={() => setTab('browse')}
        >
          <Icon name="grid" size={14} />
          Browse
        </button>
        <button
          role="tab"
          aria-selected={tab === 'colour'}
          className={`tab${tab === 'colour' ? ' on' : ''}`}
          onClick={() => setTab('colour')}
        >
          <Icon name="droplet" size={14} />
          Colour
        </button>
      </div>

      {tab === 'suggested' && (
        <div className="section">
          <p className="faint">
            Scored against the rest of the scheme, with every other slot held exactly where it is.
          </p>
          <MaterialGrid
            items={suggested}
            selectedId={slot.materialId}
            scores={scores}
            reasons={reasons}
            onPick={(m) => actions.setMaterial(slot.id, m.id)}
            empty="No alternatives for this surface under the current filters. Widen the brand filter in the toolbar."
          />
        </div>
      )}

      {tab === 'browse' && (
        <div className="section">
          <div className="search">
            <Icon name="search" size={15} />
            <input
              className="input"
              placeholder="Code or name — U702, h3303 st10, walnut"
              value={query}
              spellCheck={false}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="btn icon sm" aria-label="Clear search" onClick={() => setQuery('')}>
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
          <p className="faint">
            Everything valid for a {SURFACE_LABEL[slot.surface].toLowerCase()} — {browse.length} finishes. Keep
            scrolling; it loads as you go.
          </p>
          <MaterialGrid
            items={browse}
            selectedId={slot.materialId}
            onPick={(m) => actions.setMaterial(slot.id, m.id)}
            empty="Nothing in this surface's ranges matches."
          />
        </div>
      )}

      {tab === 'colour' && (
        <div className="section">
          <ColorField hex={slot.hex} onChange={(hex) => actions.setHex(slot.id, hex)} onCopy={onCopy} />
          <p className="faint">
            Setting a colour by hand unbinds the slot from a product, so the schedule will carry a colour rather
            than something orderable. Pick a decor from Browse to bind it back.
          </p>
        </div>
      )}

      <div className="section">
        <h3>Note</h3>
        <textarea
          className="textarea"
          placeholder="e.g. client already owns this sofa — cannot change"
          defaultValue={slot.note ?? ''}
          onBlur={(e) => actions.setNote(slot.id, e.target.value)}
        />
      </div>

      {/* Least important detail, last: the hex is a shortlisting aid, not
          something anyone orders from. */}
      <details className="details">
        <summary>Details</summary>
        <dl className="deets">
          {material && (
            <>
              <dt>Reference</dt>
              <dd>{displayName(material)}</dd>
              <dt>Brand</dt>
              <dd>{material.brand}</dd>
              {material.collection && (
                <>
                  <dt>Collection</dt>
                  <dd>{material.collection}</dd>
                </>
              )}
              <dt>Finish</dt>
              <dd>
                {PATTERN_LABEL[material.pattern]} · {material.sheen}
              </dd>
            </>
          )}
          <dt>LRV</dt>
          <dd>{lrv(slot.hex).toFixed(0)}</dd>
          <dt>Hex</dt>
          <dd>
            <button className="hex-chip" title="Copy hex" onClick={() => onCopy(slot.hex)}>
              {slot.hex}
              <Icon name="copy" size={12} />
            </button>
          </dd>
        </dl>
      </details>
    </Panel>
  );
}
