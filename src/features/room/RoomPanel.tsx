import { SURFACE_LABEL, type Surface } from '../../domain/types';
import { SURFACE_RULES } from '../../domain/surfaces';
import { Panel } from '../../ui/Modal';
import { useStore } from '../../state/store';
import { RoomPreview } from './RoomPreview';

const SHOWN: Surface[] = ['ceiling', 'wall', 'floor', 'furniture', 'worktop', 'textile', 'accent'];

export function RoomPanel({ onClose }: { onClose: () => void }) {
  const palette = useStore((s) => s.palette);
  const present = new Set(palette.slots.map((s) => s.surface));

  return (
    <Panel title="In the room" onClose={onClose}>
      <RoomPreview palette={palette} height={300} />
      <p className="faint">
        Schematic, not a render — there is no lighting simulation here. What it shows is proportion, which is where
        palettes usually come apart: an accent that looked balanced as an equal-width column is one chair in the room,
        and a wall colour that looked gentle on a chip covers a third of the view.
      </p>

      <div className="section">
        <h3>Roles in this scheme</h3>
        {SHOWN.map((s) => (
          <div className="check" key={s}>
            <span
              className="dot"
              style={{
                background: palette.slots.find((x) => x.surface === s)?.hex ?? 'transparent',
                border: '1px solid var(--line)',
                opacity: present.has(s) ? 1 : 0.3,
              }}
            />
            <div>
              <strong style={{ opacity: present.has(s) ? 1 : 0.5 }}>
                {SURFACE_LABEL[s]}
                {!present.has(s) && ' · not in this palette (shown derived)'}
              </strong>
              <p>{SURFACE_RULES[s].description}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
