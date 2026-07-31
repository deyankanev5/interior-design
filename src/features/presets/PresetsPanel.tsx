import { useState } from 'react';
import type { SavedPalette } from '../../domain/types';
import { SURFACE_LABEL } from '../../domain/types';
import { Panel } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { actions, useAppState } from '../../state/store';
import { downloadFile, readTextFile } from '../export/download';

const SUGGESTED = ['Living room', 'Bedroom', 'Kitchen', 'Bathroom', 'Hallway', 'Home office'];

export function PresetsPanel({ onClose }: { onClose: () => void }) {
  const { presets, activePresetId, dirty, palette } = useAppState();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const active = presets.find((p) => p.id === activePresetId);

  const save = () => {
    actions.savePreset(name || `Room ${presets.length + 1}`);
    setName('');
  };

  const importFile = async (file: File) => {
    setError(null);
    try {
      const text = await readTextFile(file);
      const data = JSON.parse(text) as SavedPalette[] | SavedPalette;
      const list = Array.isArray(data) ? data : [data];
      const valid = list.filter((p) => p?.palette?.slots?.length);
      if (!valid.length) throw new Error('No rooms found in that file.');
      actions.importPresets(valid);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Panel title="Rooms" onClose={onClose}>
      <div className="section">
        <h3>Save this scheme</h3>
        <div className="row">
          <input
            className="input"
            placeholder="Room name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <button className="btn primary" onClick={save}>
            <Icon name="save" />
            Save
          </button>
        </div>
        <div className="row wrap">
          {SUGGESTED.map((s) => (
            <button key={s} className="chip" onClick={() => setName(s)}>
              {s}
            </button>
          ))}
        </div>
        {active && dirty && (
          <button className="btn outline" onClick={() => actions.updatePreset(active.id)}>
            <Icon name="check" />
            Update “{active.name}” with the current scheme
          </button>
        )}
      </div>

      <div className="section">
        <h3>
          Saved rooms {presets.length > 0 && <span className="tag">{presets.length}</span>}
        </h3>
        {presets.length === 0 && (
          <p className="faint">
            Nothing saved yet. Rooms are stored in this browser — use Export below to move them between machines or to
            hand them to a colleague.
          </p>
        )}
        <div className="mat-list">
          {presets.map((p) => (
            <PresetRow key={p.id} preset={p} active={p.id === activePresetId} />
          ))}
        </div>
      </div>

      <div className="section">
        <h3>Transfer</h3>
        <div className="row wrap">
          <button
            className="btn outline"
            disabled={!presets.length}
            onClick={() =>
              downloadFile('rooms.json', JSON.stringify(presets, null, 2), 'application/json')
            }
          >
            <Icon name="download" />
            Export all rooms
          </button>
          <label className="btn outline">
            <Icon name="save" />
            Import rooms
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
            />
          </label>
        </div>
        {error && <p className="err">{error}</p>}
        <p className="faint">
          The current scheme is also encoded in the page URL, so you can paste the address straight into a project
          thread — it reopens exactly as you left it, locks included.
        </p>
      </div>

      <div className="section">
        <h3>Current scheme</h3>
        <p className="faint">
          {palette.slots.map((s) => SURFACE_LABEL[s.surface]).join(' · ')}
        </p>
      </div>
    </Panel>
  );
}

function PresetRow({ preset, active }: { preset: SavedPalette; active: boolean }) {
  const [renaming, setRenaming] = useState(false);

  return (
    <div className={`preset${active ? ' on' : ''}`}>
      <span className="preset-strip" aria-hidden="true">
        {preset.palette.slots.map((s) => (
          <i key={s.id} style={{ background: s.hex }} />
        ))}
      </span>

      <span className="mat-info" style={{ cursor: 'pointer' }} onClick={() => actions.loadPreset(preset.id)}>
        {renaming ? (
          <input
            className="input"
            autoFocus
            defaultValue={preset.name}
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => {
              actions.renamePreset(preset.id, e.target.value.trim() || preset.name);
              setRenaming(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <>
            <b>{preset.name}</b>
            <span>
              {preset.palette.slots.length} slots ·{' '}
              {new Date(preset.createdAt).toLocaleDateString()}
            </span>
          </>
        )}
      </span>

      <button className="btn icon" title="Rename" onClick={() => setRenaming(true)}>
        <Icon name="pencil" size={14} />
      </button>
      <button className="btn icon" title="Delete" onClick={() => actions.deletePreset(preset.id)}>
        <Icon name="trash" size={14} />
      </button>
    </div>
  );
}
