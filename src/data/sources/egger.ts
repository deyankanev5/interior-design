import type { Material } from '../../domain/types';
import { EGGER_DECORS, EGGER_GENERATED_PAIRINGS } from './egger.generated';
import { EGGER_FLOORS } from './egger-flooring.generated';

/**
 * EGGER — Decorative Collection (boards, laminates, edging) and EGGER flooring.
 *
 * EGGER is the default reference range for furniture and fitted joinery across
 * the EU and is stocked throughout Bulgaria, so it anchors the catalogue.
 *
 * Both halves are generated from EGGER's own published pages — the boards by
 * `scripts/scrape-egger.mjs`, the floors by `scripts/scrape-egger-flooring.mjs`
 * — including the colours, which are sampled from EGGER's photographs of the
 * surfaces rather than estimated by hand. Regenerate when the ranges change.
 *
 * The two ranges share no numbering. Matching a floor to a board means matching
 * tone and grain scale, never code numbers.
 */
export const EGGER: Material[] = [...EGGER_DECORS, ...EGGER_FLOORS];

export interface Pairing {
  decor: string;
  goesWith: string[];
  note?: string;
}

/**
 * Combinations EGGER publishes as house pairings.
 *
 * Scraped pairings come first; the curated entries below add the ones EGGER
 * states in prose rather than as a link, which the scraper cannot see. A
 * manufacturer's own combination advice beats anything the colour maths can
 * infer, so the generator weights these heavily.
 */
const CURATED: Pairing[] = [
  {
    decor: 'egger-h3303-st10',
    goesWith: ['egger-w1000-st9', 'egger-u156-st9', 'egger-u113-st9', 'egger-u702-st9'],
    note: 'EGGER pairs Natural Hamilton Oak with whites and modern sand tones as a calming counterpoint.',
  },
  {
    decor: 'egger-u702-st9',
    goesWith: ['egger-h3303-st10', 'egger-h1180-st37', 'egger-h1277-st9'],
    note: 'Cashmere Grey carries a slightly reddish nuance, so it sits naturally with equally reddish wood tones.',
  },
  {
    decor: 'egger-u708-st9',
    goesWith: ['egger-u961-st7', 'egger-u727-st9', 'egger-h1176-st37'],
    note: 'Light Grey works tone-on-tone with the other greys and gives a clean contrast to natural woodgrains.',
  },
];

/**
 * Curated entries are written by hand against a range EGGER keeps changing —
 * a decor is withdrawn, or reissued under a newer surface texture, and the id
 * quietly stops resolving. Dropping unknown ids here keeps a stale entry from
 * suggesting a decor nobody can order, and says so in development so it gets
 * fixed rather than lingering.
 */
const KNOWN = new Set(EGGER_DECORS.map((m) => m.id));

const merged = new Map<string, Pairing>();
for (const [decor, goesWith] of EGGER_GENERATED_PAIRINGS) {
  merged.set(decor, { decor, goesWith });
}
for (const curated of CURATED) {
  const goesWith = curated.goesWith.filter((id) => KNOWN.has(id));
  if (import.meta.env?.DEV) {
    const stale = [KNOWN.has(curated.decor) ? [] : [curated.decor], curated.goesWith.filter((id) => !KNOWN.has(id))].flat();
    if (stale.length) console.warn(`Curated EGGER pairing references unknown decors: ${stale.join(', ')}`);
  }
  if (!KNOWN.has(curated.decor) || !goesWith.length) continue;

  const existing = merged.get(curated.decor);
  merged.set(curated.decor, {
    decor: curated.decor,
    goesWith: [...new Set([...(existing?.goesWith ?? []), ...goesWith])],
    note: curated.note,
  });
}

export const EGGER_PAIRINGS: Pairing[] = [...merged.values()];
