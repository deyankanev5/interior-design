import { useState } from 'react';
import {
  MOOD_LABEL,
  SCHEME_HINT,
  SCHEME_LABEL,
  type HarmonyScheme,
  type Mood,
} from '../../domain/types';
import { Icon, type IconName } from '../../ui/Icon';
import { Modal } from '../../ui/Modal';
import { actions, useAppState } from '../../state/store';
import { setTheme, useTheme, type Theme } from '../../state/theme';

export type PanelKind =
  | 'analysis'
  | 'presets'
  | 'library'
  | 'import'
  | 'export'
  | 'variations'
  | 'room'
  | 'about'
  | null;

const SCHEMES = Object.keys(SCHEME_LABEL) as HarmonyScheme[];
const MOODS = Object.keys(MOOD_LABEL) as Mood[];

interface PanelDef {
  kind: Exclude<PanelKind, null>;
  icon: IconName;
  label: string;
  title: string;
}

/**
 * The top bar's panel buttons become the phone's bottom navigation — the same
 * elements, moved by CSS, because duplicating them per breakpoint is how a
 * button ends up working in one layout and not the other.
 *
 * A phone fits about five. The rest are hidden there and reached through More,
 * rather than pushed off the end of a scrolling rail where nothing indicates
 * they exist: the previous bar quietly put half the app out of reach.
 */
const PRIMARY: PanelDef[] = [
  { kind: 'variations', icon: 'grid', label: 'Variations', title: 'Compare whole schemes side by side' },
  { kind: 'library', icon: 'search', label: 'Library', title: 'Browse and import materials' },
  { kind: 'room', icon: 'image', label: 'Room', title: 'See the palette applied to a room' },
  { kind: 'analysis', icon: 'check', label: 'Analysis', title: 'Design review of this scheme' },
];

const SECONDARY: PanelDef[] = [
  { kind: 'import', icon: 'download', label: 'Import', title: 'Import from Pinterest or an image' },
  { kind: 'presets', icon: 'save', label: 'Rooms', title: 'Saved rooms' },
  { kind: 'export', icon: 'link', label: 'Export', title: 'Export the specification' },
  { kind: 'about', icon: 'info', label: 'About', title: 'About the data and the engine' },
];

const THEME_NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_ICON: Record<Theme, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' };
const THEME_LABEL: Record<Theme, string> = {
  system: 'Following the system theme',
  light: 'Light theme',
  dark: 'Dark theme',
};

export function Toolbar({ panel, onPanel }: { panel: PanelKind; onPanel: (p: PanelKind) => void }) {
  const { palette, past, future, presets, activePresetId, dirty } = useAppState();
  const theme = useTheme();
  const [more, setMore] = useState(false);
  const count = palette.slots.length;
  const activePreset = presets.find((p) => p.id === activePresetId);

  const toggle = (p: Exclude<PanelKind, null>) => onPanel(panel === p ? null : p);
  const secondaryActive = SECONDARY.some((p) => p.kind === panel);

  return (
    <header className="toolbar">
      <div className="toolbar-main">
        <div className="brand">
          <b>Palette Studio</b>
          <span>{activePreset ? `${activePreset.name}${dirty ? ' •' : ''}` : 'Unsaved scheme'}</span>
        </div>

        <button className="btn primary generate" onClick={() => actions.generate()} title="Generate — Space">
          <Icon name="shuffle" />
          <span className="btn-label">Generate</span>
        </button>

        <div className="count" title="Number of slots in the palette">
          <button onClick={() => actions.setCount(count - 1)} disabled={count <= 2} aria-label="Fewer slots">
            <Icon name="minus" size={14} />
          </button>
          <span>{count}</span>
          <button onClick={() => actions.setCount(count + 1)} disabled={count >= 10} aria-label="More slots">
            <Icon name="plus" size={14} />
          </button>
        </div>

        <div className="history">
          <button className="btn icon" onClick={() => actions.undo()} disabled={!past.length} title="Undo — Ctrl+Z">
            <Icon name="undo" />
          </button>
          <button
            className="btn icon"
            onClick={() => actions.redo()}
            disabled={!future.length}
            title="Redo — Ctrl+Shift+Z"
          >
            <Icon name="redo" />
          </button>
        </div>

        <div className="selects">
          <div className="field" title={SCHEME_HINT[palette.scheme]}>
            <label htmlFor="scheme">Scheme</label>
            <select
              id="scheme"
              value={palette.scheme}
              onChange={(e) => actions.setScheme(e.target.value as HarmonyScheme)}
            >
              {SCHEMES.map((s) => (
                <option key={s} value={s}>
                  {SCHEME_LABEL[s]}
                  {s === 'auto' && palette.resolvedScheme ? ` (${SCHEME_LABEL[palette.resolvedScheme]})` : ''}
                </option>
              ))}
            </select>
            <Icon name="chevron" size={13} />
          </div>

          <div className="field">
            <label htmlFor="mood">Mood</label>
            <select id="mood" value={palette.mood} onChange={(e) => actions.setMood(e.target.value as Mood)}>
              {MOODS.map((m) => (
                <option key={m} value={m}>
                  {MOOD_LABEL[m]}
                </option>
              ))}
            </select>
            <Icon name="chevron" size={13} />
          </div>
        </div>
      </div>

      <nav className="toolbar-panels" aria-label="Panels">
        {PRIMARY.map((p) => (
          <button
            key={p.kind}
            className={`btn nav${panel === p.kind ? ' active' : ''}`}
            onClick={() => toggle(p.kind)}
            title={p.title}
            aria-pressed={panel === p.kind}
          >
            <Icon name={p.icon} />
            <span className="btn-label">{p.label}</span>
          </button>
        ))}

        {SECONDARY.map((p) => (
          <button
            key={p.kind}
            className={`btn nav secondary${panel === p.kind ? ' active' : ''}`}
            onClick={() => toggle(p.kind)}
            title={p.title}
            aria-pressed={panel === p.kind}
          >
            <Icon name={p.icon} />
            <span className="btn-label">{p.label}</span>
          </button>
        ))}

        <button
          className="btn nav secondary"
          onClick={() => setTheme(THEME_NEXT[theme])}
          title={`${THEME_LABEL[theme]} — click to change`}
        >
          <Icon name={THEME_ICON[theme]} />
          <span className="btn-label">Theme</span>
        </button>

        {/* Phone only — the desktop bar has room for all of the above. */}
        <button
          className={`btn nav more-btn${secondaryActive ? ' active' : ''}`}
          onClick={() => setMore(true)}
          title="More panels"
        >
          <Icon name="menu" />
          <span className="btn-label">More</span>
        </button>
      </nav>

      {more && (
        <Modal title="More" onClose={() => setMore(false)}>
          <div className="section">
            <div className="menu">
              {SECONDARY.map((p) => (
                <button
                  key={p.kind}
                  className={`menu-item${panel === p.kind ? ' on' : ''}`}
                  onClick={() => {
                    toggle(p.kind);
                    setMore(false);
                  }}
                >
                  <Icon name={p.icon} />
                  <span>
                    <b>{p.label}</b>
                    <i>{p.title}</i>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="section">
            <h3>Theme</h3>
            <div className="row wrap">
              {(['system', 'light', 'dark'] as Theme[]).map((t) => (
                <button
                  key={t}
                  className={`chip${theme === t ? ' on' : ''}`}
                  onClick={() => setTheme(t)}
                >
                  <Icon name={THEME_ICON[t]} size={13} />
                  {t === 'system' ? 'System' : t === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </header>
  );
}
