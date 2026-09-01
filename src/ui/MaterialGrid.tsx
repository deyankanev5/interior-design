import { useEffect, useMemo, useRef, useState } from 'react';
import type { MaterialView } from '../domain/types';
import { MaterialCard } from './MaterialCard';

const PAGE = 48;

/**
 * A browsable grid of decors that pages in as you scroll.
 *
 * The catalogue is 875 entries. Rendering them all costs a visible stall and
 * fires 875 image requests; capping at a fixed 60, as the old list did, hides
 * most of every range behind a search box you have to already know what to type
 * into. Paging is what lets someone simply look through what EGGER makes.
 *
 * The sentinel is watched with an IntersectionObserver rather than a scroll
 * handler so it costs nothing while idle, and `rootMargin` loads the next page
 * before the current one runs out — the scroll never actually stops.
 */
export function MaterialGrid({
  items,
  selectedId,
  scores,
  reasons,
  onPick,
  empty,
}: {
  items: MaterialView[];
  selectedId?: string | null;
  scores?: Map<string, number>;
  reasons?: Map<string, string>;
  onPick: (m: MaterialView) => void;
  empty?: string;
}) {
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement | null>(null);

  // A new result set starts from the top, or the grid would open deep into a
  // list the user has not scrolled.
  const key = useMemo(() => items.length + '|' + (items[0]?.id ?? ''), [items]);
  useEffect(() => setShown(PAGE), [key]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown((n) => (n >= items.length ? n : n + PAGE));
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [items.length, shown]);

  if (!items.length) {
    return <p className="faint">{empty ?? 'Nothing matches. Try a shorter query or clear the filters.'}</p>;
  }

  const visible = items.slice(0, shown);

  return (
    <>
      <div className="card-grid">
        {visible.map((m) => (
          <MaterialCard
            key={m.id}
            material={m}
            selected={m.id === selectedId}
            score={scores?.get(m.id)}
            reason={reasons?.get(m.id)}
            onPick={() => onPick(m)}
          />
        ))}
      </div>
      <div ref={sentinel} className="grid-end" aria-hidden={shown < items.length}>
        {shown < items.length ? (
          <span className="loading">Loading more…</span>
        ) : (
          <span className="faint">
            {items.length} {items.length === 1 ? 'finish' : 'finishes'} — that is all of them
          </span>
        )}
      </div>
    </>
  );
}
