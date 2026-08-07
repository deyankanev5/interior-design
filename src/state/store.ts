import { useSyncExternalStore } from 'react';
import type { HarmonyScheme, Material, Mood, Palette, SavedPalette, Slot, Surface } from '../domain/types';
import { defaultSurfaces } from '../domain/surfaces';
import { generatePalette, type GenerateOptions } from '../engine/generate';
import { getMaterial, setUserMaterials } from '../data/catalog';
import { decodePalette, encodePalette } from './url';

const PRESETS_KEY = 'idt.presets.v1';
const CATALOG_KEY = 'idt.catalog.v1';
const SESSION_KEY = 'idt.session.v1';

export interface Filters {
  brands: string[] | null;
  realProductsOnly: boolean;
}

export interface AppState {
  palette: Palette;
  past: Palette[];
  future: Palette[];
  presets: SavedPalette[];
  /** Preset the current palette was loaded from, for "Update preset". */
  activePresetId: string | null;
  filters: Filters;
  dirty: boolean;
  /** Bumped whenever the material catalogue changes, so views can recompute. */
  catalogVersion: number;
}

let uid = 0;
const nextId = () => `s${Date.now().toString(36)}${(uid++).toString(36)}`;

function makeSlots(count: number, surfaces?: Surface[]): Slot[] {
  const list = surfaces ?? defaultSurfaces(count);
  return list.slice(0, count).map((surface) => ({
    id: nextId(),
    surface,
    locked: false,
    hex: '#CCCCCC',
    materialId: null,
  }));
}

function initialPalette(): Palette {
  const fromUrl = decodePalette(window.location.hash);
  if (fromUrl) return fromUrl;

  const saved = safeParse<Palette>(sessionStorage.getItem(SESSION_KEY));
  if (saved?.slots?.length) return saved;

  const base: Palette = { slots: makeSlots(5), scheme: 'auto', mood: 'any' };
  return generatePalette(base);
}

function loadPresets(): SavedPalette[] {
  return safeParse<SavedPalette[]>(localStorage.getItem(PRESETS_KEY)) ?? [];
}

function loadUserCatalog(): void {
  const mats = safeParse<Material[]>(localStorage.getItem(CATALOG_KEY));
  if (mats?.length) setUserMaterials(mats);
}

loadUserCatalog();

let state: AppState = {
  palette: initialPalette(),
  past: [],
  future: [],
  presets: loadPresets(),
  activePresetId: null,
  filters: { brands: null, realProductsOnly: false },
  dirty: false,
  catalogVersion: 0,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.palette));
  history.replaceState(null, '', `#${encodePalette(state.palette)}`);
  emit();
}

/** Mutate the palette, pushing the previous value onto the undo stack. */
function commit(next: Palette, markDirty = true) {
  set({
    palette: next,
    past: [...state.past, state.palette].slice(-60),
    future: [],
    dirty: markDirty ? true : state.dirty,
  });
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getState(): AppState {
  return state;
}

export function useStore<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

/* ------------------------------------------------------------- generation -- */

function generateOptions(): GenerateOptions {
  return { brands: state.filters.brands, realProductsOnly: state.filters.realProductsOnly };
}

export const actions = {
  generate() {
    commit(generatePalette(state.palette, generateOptions()));
  },

  setScheme(scheme: HarmonyScheme) {
    commit({ ...state.palette, scheme });
  },

  setMood(mood: Mood) {
    commit({ ...state.palette, mood });
  },

  setFilters(filters: Partial<Filters>) {
    set({ filters: { ...state.filters, ...filters } });
  },

  setCount(count: number) {
    const current = state.palette.slots;
    const n = Math.max(2, Math.min(10, count));
    if (n === current.length) return;

    let slots: Slot[];
    if (n < current.length) {
      // Drop unlocked slots from the end first — never discard a locked choice.
      slots = [...current];
      while (slots.length > n) {
        const i = [...slots].reverse().findIndex((s) => !s.locked);
        if (i === -1) slots.pop();
        else slots.splice(slots.length - 1 - i, 1);
      }
    } else {
      const extra = defaultSurfaces(n).slice(current.length);
      slots = [
        ...current,
        ...extra.map((surface) => ({
          id: nextId(),
          surface,
          locked: false,
          hex: '#CCCCCC',
          materialId: null,
        })),
      ];
    }
    commit(generatePalette({ ...state.palette, slots }, generateOptions()));
  },

  toggleLock(slotId: string) {
    commit(
      {
        ...state.palette,
        slots: state.palette.slots.map((s) => (s.id === slotId ? { ...s, locked: !s.locked } : s)),
      },
      false,
    );
  },

  setSurface(slotId: string, surface: Surface) {
    commit({
      ...state.palette,
      slots: state.palette.slots.map((s) => (s.id === slotId ? { ...s, surface } : s)),
    });
  },

  setMaterial(slotId: string, materialId: string) {
    const m = getMaterial(materialId);
    if (!m) return;
    commit({
      ...state.palette,
      slots: state.palette.slots.map((s) =>
        s.id === slotId ? { ...s, materialId: m.id, hex: m.hex } : s,
      ),
    });
  },

  setHex(slotId: string, hex: string) {
    commit({
      ...state.palette,
      slots: state.palette.slots.map((s) =>
        s.id === slotId ? { ...s, hex, materialId: null } : s,
      ),
    });
  },

  setNote(slotId: string, note: string) {
    commit({
      ...state.palette,
      slots: state.palette.slots.map((s) => (s.id === slotId ? { ...s, note } : s)),
    });
  },

  move(slotId: string, direction: -1 | 1) {
    const slots = [...state.palette.slots];
    const i = slots.findIndex((s) => s.id === slotId);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= slots.length) return;
    [slots[i], slots[j]] = [slots[j], slots[i]];
    commit({ ...state.palette, slots });
  },

  addSlot(surface: Surface = 'accent') {
    if (state.palette.slots.length >= 10) return;
    const slot: Slot = { id: nextId(), surface, locked: false, hex: '#CCCCCC', materialId: null };
    commit(generatePalette({ ...state.palette, slots: [...state.palette.slots, slot] }, generateOptions()));
  },

  removeSlot(slotId: string) {
    if (state.palette.slots.length <= 2) return;
    commit({ ...state.palette, slots: state.palette.slots.filter((s) => s.id !== slotId) });
  },

  replacePalette(palette: Palette) {
    commit(palette);
  },

  /* --------------------------------------------------------------- history */

  undo() {
    if (!state.past.length) return;
    const previous = state.past[state.past.length - 1];
    set({
      palette: previous,
      past: state.past.slice(0, -1),
      future: [state.palette, ...state.future].slice(0, 60),
    });
  },

  redo() {
    if (!state.future.length) return;
    set({
      palette: state.future[0],
      past: [...state.past, state.palette],
      future: state.future.slice(1),
    });
  },

  /* --------------------------------------------------------------- presets */

  savePreset(name: string) {
    const preset: SavedPalette = {
      id: `p${Date.now().toString(36)}`,
      name: name.trim() || 'Untitled room',
      createdAt: Date.now(),
      palette: structuredClone(state.palette),
    };
    const presets = [preset, ...state.presets];
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    set({ presets, activePresetId: preset.id, dirty: false });
  },

  updatePreset(id: string) {
    const presets = state.presets.map((p) =>
      p.id === id ? { ...p, palette: structuredClone(state.palette) } : p,
    );
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    set({ presets, dirty: false });
  },

  renamePreset(id: string, name: string) {
    const presets = state.presets.map((p) => (p.id === id ? { ...p, name } : p));
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    set({ presets });
  },

  deletePreset(id: string) {
    const presets = state.presets.filter((p) => p.id !== id);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    set({ presets, activePresetId: state.activePresetId === id ? null : state.activePresetId });
  },

  loadPreset(id: string) {
    const preset = state.presets.find((p) => p.id === id);
    if (!preset) return;
    set({
      palette: structuredClone(preset.palette),
      past: [...state.past, state.palette].slice(-60),
      future: [],
      activePresetId: id,
      dirty: false,
    });
  },

  importPresets(incoming: SavedPalette[]) {
    const byId = new Map(state.presets.map((p) => [p.id, p]));
    for (const p of incoming) byId.set(p.id, p);
    const presets = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    set({ presets });
  },

  /* --------------------------------------------------------------- catalog */

  loadUserCatalog(materials: Material[]) {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(materials));
    setUserMaterials(materials);
    set({ catalogVersion: state.catalogVersion + 1 });
  },

  clearUserCatalog() {
    localStorage.removeItem(CATALOG_KEY);
    setUserMaterials([]);
    set({ catalogVersion: state.catalogVersion + 1 });
  },
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
