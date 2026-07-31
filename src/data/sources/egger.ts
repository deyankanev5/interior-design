import { define } from '../define';
import type { Material } from '../../domain/types';
import { EGGER_DECORS, EGGER_GENERATED_PAIRINGS } from './egger.generated';

/**
 * EGGER — Decorative Collection (boards, laminates, edging) and EGGER flooring.
 *
 * EGGER is the default reference range for furniture and fitted joinery across
 * the EU and is stocked throughout Bulgaria, so it anchors the catalogue.
 *
 * The board decors come from `egger.generated.ts`, which is produced by
 * `scripts/scrape-egger.mjs` from EGGER's own published decor list — including
 * the colours, which are sampled from EGGER's decor photographs rather than
 * estimated by hand. Regenerate it when the collection changes.
 */

/**
 * EGGER laminate flooring (EPL ranges).
 *
 * Kept hand-maintained: flooring is a separate range from the board decors and
 * is not listed on the Design Wall the board scraper reads. Matching a floor to
 * a board means matching tone and grain scale, never code numbers — the two
 * ranges share no numbering.
 */
const flooring = define(
  {
    brand: 'EGGER',
    category: 'laminate-floor',
    provenance: 'manufacturer-decor',
    pattern: 'woodgrain',
    sheen: 'textured',
    surfaces: ['floor'],
    collection: 'EGGER Flooring — PRO / Home',
    idPrefix: 'egger-fl',
    tags: ['flooring', 'laminate', 'plank'],
  },
  [
    { code: 'EPL034', name: 'Natural Waltham Oak', hex: '#B4936C', species: 'oak', tags: ['oak', 'warm'] },
    { code: 'EPL035', name: 'Grey Waltham Oak', hex: '#A39C92', species: 'oak', tags: ['oak', 'grey'] },
    { code: 'EPL039', name: 'White Waltham Oak', hex: '#CFC3B2', species: 'oak', tags: ['oak', 'light'] },
    { code: 'EPL064', name: 'Natural Sherman Oak', hex: '#A8865F', species: 'oak', tags: ['oak', 'warm'] },
    { code: 'EPL066', name: 'Dark Sherman Oak', hex: '#6B5340', species: 'oak', tags: ['oak', 'dark'] },
    { code: 'EPL075', name: 'Natural Bardolino Oak', hex: '#BFA47E', species: 'oak', tags: ['oak', 'light'] },
    { code: 'EPL142', name: 'Natural Ashcroft Oak', hex: '#B9A184', species: 'oak', tags: ['oak', 'neutral'] },
    { code: 'EPL178', name: 'Natural Brooklyn Oak', hex: '#9C8265', species: 'oak', tags: ['oak', 'mid'] },
    { code: 'EPL205', name: 'Natural Ampara Oak', hex: '#C0A583', species: 'oak', tags: ['oak', 'light'] },
  ],
);

export const EGGER: Material[] = [...EGGER_DECORS, ...flooring];

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
    goesWith: ['egger-u961-st2', 'egger-u727-st9', 'egger-h1176-st37'],
    note: 'Light Grey works tone-on-tone with the other greys and gives a clean contrast to natural woodgrains.',
  },
];

const merged = new Map<string, Pairing>();
for (const [decor, goesWith] of EGGER_GENERATED_PAIRINGS) {
  merged.set(decor, { decor, goesWith });
}
for (const curated of CURATED) {
  const existing = merged.get(curated.decor);
  merged.set(curated.decor, {
    decor: curated.decor,
    goesWith: [...new Set([...(existing?.goesWith ?? []), ...curated.goesWith])],
    note: curated.note,
  });
}

export const EGGER_PAIRINGS: Pairing[] = [...merged.values()];
