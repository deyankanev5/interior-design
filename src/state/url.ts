import type { HarmonyScheme, Mood, Palette, Slot, Surface } from '../domain/types';
import { SURFACES } from '../domain/types';
import { isValidHex, normaliseHex } from '../color/convert';
import { getMaterial } from '../data/catalog';

/**
 * Palette <-> URL fragment.
 *
 * Kept short and human-inspectable so a scheme can be pasted into an email or a
 * project chat and still open correctly months later. Slots serialise as
 * `surface:hex:materialId:lock`; the material id is dropped when the slot is a
 * free colour.
 */

const SURFACE_KEY: Record<Surface, string> = {
  ceiling: 'c',
  wall: 'w',
  floor: 'f',
  furniture: 'u',
  worktop: 'k',
  textile: 't',
  accent: 'a',
};

const KEY_SURFACE = Object.fromEntries(
  Object.entries(SURFACE_KEY).map(([k, v]) => [v, k as Surface]),
) as Record<string, Surface>;

const SCHEMES: HarmonyScheme[] = [
  'auto',
  'analogous',
  'complementary',
  'split-complementary',
  'triadic',
  'monochromatic',
  'neutral-accent',
  'earthy',
  'nordic',
];

const MOODS: Mood[] = ['any', 'warm', 'cool', 'muted', 'bold', 'light', 'dark'];

/** Not `-`: material ids contain hyphens, which would split a slot in two. */
const SLOT_SEP = '~';

export function encodePalette(p: Palette): string {
  const slots = p.slots
    .map((s) => {
      const hex = s.hex.replace('#', '');
      const mat = s.materialId ?? '';
      return `${SURFACE_KEY[s.surface]}${hex}${mat ? `.${mat}` : ''}${s.locked ? '!' : ''}`;
    })
    .join(SLOT_SEP);
  return `p=${slots}&s=${SCHEMES.indexOf(p.scheme)}&m=${MOODS.indexOf(p.mood)}`;
}

export function decodePalette(hash: string): Palette | null {
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;

  const params = new URLSearchParams(raw);
  const p = params.get('p');
  if (!p) return null;

  const slots: Slot[] = [];
  for (const [i, part] of p.split(SLOT_SEP).entries()) {
    if (!part) continue;
    const locked = part.endsWith('!');
    const body = locked ? part.slice(0, -1) : part;
    const surface = KEY_SURFACE[body[0]];
    if (!surface) continue;

    const [hexPart, materialId] = body.slice(1).split('.');
    if (!isValidHex(hexPart)) continue;

    // Trust the id only if it still resolves; catalogues change under us.
    const material = materialId ? getMaterial(materialId) : null;
    slots.push({
      id: `u${i}`,
      surface,
      locked,
      hex: material ? material.hex : normaliseHex(hexPart),
      materialId: material?.id ?? null,
    });
  }

  if (slots.length < 2) return null;

  const schemeIndex = Number(params.get('s'));
  const moodIndex = Number(params.get('m'));

  return {
    slots,
    scheme: SCHEMES[schemeIndex] ?? 'auto',
    mood: MOODS[moodIndex] ?? 'any',
  };
}

export function shareUrl(p: Palette): string {
  return `${location.origin}${location.pathname}#${encodePalette(p)}`;
}

export const ALL_SURFACES = SURFACES;
