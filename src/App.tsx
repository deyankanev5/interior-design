import { useCallback, useEffect, useRef, useState } from 'react';
import { actions, useStore } from './state/store';
import { Toolbar, type PanelKind } from './features/toolbar/Toolbar';
import { SlotColumn } from './features/palette/SlotColumn';
import { SlotPanel } from './features/palette/SlotPanel';
import { AnalysisPanel } from './features/analysis/AnalysisPanel';
import { PresetsPanel } from './features/presets/PresetsPanel';
import { LibraryPanel } from './features/library/LibraryPanel';
import { ImportPanel } from './features/import/ImportPanel';
import { ExportPanel } from './features/export/ExportPanel';
import { VariationsPanel } from './features/variations/VariationsPanel';
import { RoomPanel } from './features/room/RoomPanel';
import { AboutPanel } from './features/about/AboutPanel';
import { copyText } from './features/export/download';

export default function App() {
  const palette = useStore((s) => s.palette);
  const [panel, setPanel] = useState<PanelKind>(null);
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const onCopy = useCallback(
    (text: string) => {
      void copyText(text);
      notify(`${text} copied`);
    },
    [notify],
  );

  const showSlot = useCallback((slotId: string) => {
    setPanel(null);
    setOpenSlot(slotId);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if (e.key === 'Escape') {
        setPanel(null);
        setOpenSlot(null);
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) actions.redo();
        else actions.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpenSlot(null);
        setPanel((p) => (p === 'library' ? null : 'library'));
        return;
      }

      if (typing || mod) return;

      if (e.code === 'Space') {
        e.preventDefault();
        actions.generate();
        return;
      }

      // 1-9 toggles the lock on that slot — the fastest way to pin a decision.
      if (/^[1-9]$/.test(e.key)) {
        const slot = palette.slots[Number(e.key) - 1];
        if (slot) {
          e.preventDefault();
          actions.toggleLock(slot.id);
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [palette.slots]);

  const closePanel = useCallback(() => setPanel(null), []);

  return (
    <div className="app">
      <Toolbar
        panel={panel}
        onPanel={(p) => {
          setOpenSlot(null);
          setPanel(p);
        }}
      />

      <div className="stage">
        <main className="palette">
          {palette.slots.map((slot, i) => (
            <SlotColumn
              key={slot.id}
              slot={slot}
              index={i}
              total={palette.slots.length}
              onOpen={showSlot}
              onCopy={onCopy}
            />
          ))}
          {!panel && !openSlot && (
            <p className="hint">
              Press <b>Space</b> to generate · <b>1</b>–<b>9</b> to lock a slot · hover a column for its tools
            </p>
          )}
        </main>

        {openSlot && <SlotPanel slotId={openSlot} onClose={() => setOpenSlot(null)} />}
        {panel === 'analysis' && <AnalysisPanel onClose={closePanel} />}
        {panel === 'presets' && <PresetsPanel onClose={closePanel} />}
        {panel === 'library' && <LibraryPanel onClose={closePanel} onToast={notify} />}
        {panel === 'import' && <ImportPanel onClose={closePanel} onToast={notify} />}
        {panel === 'export' && <ExportPanel onClose={closePanel} onToast={notify} />}
        {panel === 'variations' && <VariationsPanel onClose={closePanel} onToast={notify} />}
        {panel === 'room' && <RoomPanel onClose={closePanel} />}
        {panel === 'about' && <AboutPanel onClose={closePanel} />}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
