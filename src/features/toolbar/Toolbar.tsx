import {
  MOOD_LABEL,
  SCHEME_HINT,
  SCHEME_LABEL,
  type HarmonyScheme,
  type Mood,
} from '../../domain/types';
import { Icon } from '../../ui/Icon';
import { actions, useAppState } from '../../state/store';

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

export function Toolbar({
  panel,
  onPanel,
}: {
  panel: PanelKind;
  onPanel: (p: PanelKind) => void;
}) {
  const { palette, past, future, presets, activePresetId, dirty } = useAppState();
  const count = palette.slots.length;
  const activePreset = presets.find((p) => p.id === activePresetId);

  const toggle = (p: Exclude<PanelKind, null>) => onPanel(panel === p ? null : p);

  return (
    <header className="toolbar">
      <div className="brand">
        <b>Palette Studio</b>
        <span>{activePreset ? `${activePreset.name}${dirty ? ' •' : ''}` : 'Unsaved scheme'}</span>
      </div>

      <div className="divider" />

      <button className="btn primary" onClick={() => actions.generate()} title="Generate — Space">
        <Icon name="shuffle" />
        <span className="btn-label">Generate</span>
      </button>

      <div className="count" title="Number of slots in the palette">
        <button onClick={() => actions.setCount(count - 1)} disabled={count <= 2} aria-label="Fewer slots">
          −
        </button>
        <span>{count}</span>
        <button onClick={() => actions.setCount(count + 1)} disabled={count >= 10} aria-label="More slots">
          +
        </button>
      </div>

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
      </div>

      <button className="btn icon" onClick={() => actions.undo()} disabled={!past.length} title="Undo — Ctrl+Z">
        <Icon name="undo" />
      </button>
      <button className="btn icon" onClick={() => actions.redo()} disabled={!future.length} title="Redo — Ctrl+Shift+Z">
        <Icon name="redo" />
      </button>

      <div className="spacer" />

      <button className={btn(panel === 'variations')} onClick={() => toggle('variations')} title="Compare whole schemes side by side">
        <Icon name="grid" />
        <span className="btn-label">Variations</span>
      </button>
      <button className={btn(panel === 'room')} onClick={() => toggle('room')} title="See the palette applied to a room">
        <Icon name="image" />
        <span className="btn-label">Room</span>
      </button>
      <button className={btn(panel === 'analysis')} onClick={() => toggle('analysis')} title="Design review of this scheme">
        <Icon name="check" />
        <span className="btn-label">Analysis</span>
      </button>
      <button className={btn(panel === 'library')} onClick={() => toggle('library')} title="Browse and import materials">
        <Icon name="search" />
        <span className="btn-label">Library</span>
      </button>
      <button className={btn(panel === 'import')} onClick={() => toggle('import')} title="Import from Pinterest or an image">
        <Icon name="download" />
        <span className="btn-label">Import</span>
      </button>
      <button className={btn(panel === 'presets')} onClick={() => toggle('presets')} title="Saved rooms">
        <Icon name="save" />
        <span className="btn-label">Rooms</span>
      </button>
      <button className={btn(panel === 'export')} onClick={() => toggle('export')} title="Export the specification">
        <Icon name="link" />
        <span className="btn-label">Export</span>
      </button>
      <button className={`btn icon${panel === 'about' ? ' active' : ''}`} onClick={() => toggle('about')} title="About the data and the engine">
        <Icon name="info" />
      </button>
    </header>
  );
}

const btn = (on: boolean) => `btn${on ? ' active' : ''}`;
