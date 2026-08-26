import { useCallback, useEffect, useState } from 'react';
import type { Palette } from '../../domain/types';
import { SURFACE_LABEL } from '../../domain/types';
import { generateVariations } from '../../engine/generate';
import { reportFor } from '../../engine/score';
import { getMaterial } from '../../data/catalog';
import { Panel } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { DecorSurface } from '../../ui/Decor';
import { actions, useAppState } from '../../state/store';

/**
 * Whole-scheme alternatives, side by side.
 *
 * Coolors-style single rerolls are good for exploring; they are poor for
 * deciding. Seeing eight complete schemes at once — every one of them honouring
 * the same locks — is how you actually choose between directions.
 */
export function VariationsPanel({ onClose, onToast }: { onClose: () => void; onToast: (m: string) => void }) {
  const { palette, filters } = useAppState();
  const [variations, setVariations] = useState<Palette[]>([]);

  const reroll = useCallback(() => {
    setVariations(
      generateVariations(palette, 8, {
        brands: filters.brands,
        realProductsOnly: filters.realProductsOnly,
      }),
    );
  }, [palette, filters]);

  // Refresh whenever the palette or filters change, and on demand via Reroll.
  useEffect(reroll, [reroll]);

  const lockCount = palette.slots.filter((s) => s.locked).length;

  return (
    <Panel
      title="Variations"
      onClose={onClose}
      actions={
        <button className="btn outline" onClick={reroll}>
          <Icon name="shuffle" />
          Reroll
        </button>
      }
    >
      <p className="faint">
        Eight complete schemes, scored and ranked.{' '}
        {lockCount > 0
          ? `Your ${lockCount} locked slot${lockCount === 1 ? '' : 's'} ${lockCount === 1 ? 'is' : 'are'} identical in every one.`
          : 'Nothing is locked, so every surface is free to move — lock the ones you have already decided.'}
      </p>

      <div className="variations">
        {variations
          .map((v) => ({ v, score: reportFor(v).total }))
          .sort((a, b) => b.score - a.score)
          .map(({ v, score }, i) => (
            <button
              key={i}
              className="variation"
              onClick={() => {
                actions.replacePalette(v);
                onToast(`Applied variation — review score ${score}`);
              }}
            >
              <span className="variation-strip">
                {v.slots.map((s) => (
                  <DecorSurface key={s.id} material={getMaterial(s.materialId)} hex={s.hex} />
                ))}
              </span>
              <span className="variation-foot">
                <span>{summarise(v)}</span>
                <b style={{ color: score >= 80 ? 'var(--good)' : score >= 65 ? 'var(--watch)' : 'var(--poor)' }}>
                  {score}
                </b>
              </span>
            </button>
          ))}
      </div>

      {variations.length === 0 && (
        <p className="faint">Every slot is locked, so there is nothing left to vary.</p>
      )}
    </Panel>
  );
}

function summarise(p: Palette): string {
  const lead = p.slots.find((s) => s.surface === 'wall') ?? p.slots[0];
  const m = getMaterial(lead.materialId);
  return m ? `${m.name}` : SURFACE_LABEL[lead.surface];
}
