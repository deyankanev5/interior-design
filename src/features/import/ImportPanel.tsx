import { useCallback, useEffect, useRef, useState } from 'react';
import { Panel } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { actions, useAppState } from '../../state/store';
import { extractPalette, loadImageFromFile, loadImageFromUrl, type ExtractedColour } from './extract';
import { applyExtraction } from './apply';

type Status = { kind: 'idle' } | { kind: 'busy'; message: string } | { kind: 'error'; message: string };

/**
 * Pull a scheme out of a reference image.
 *
 * Four routes in, because Pinterest is deliberately hostile to automated
 * access: a pin URL (resolved server-side), a direct image URL, a dropped file,
 * and a clipboard paste. The last two always work, which matters — the moment a
 * client sends a screenshot rather than a link, the URL routes are useless.
 */
export function ImportPanel({ onClose, onToast }: { onClose: () => void; onToast: (m: string) => void }) {
  const { palette, filters } = useAppState();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [colours, setColours] = useState<ExtractedColour[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [pinUrl, setPinUrl] = useState('');
  const [snap, setSnap] = useState(true);
  const [over, setOver] = useState(false);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  useEffect(
    () => () => {
      if (previewRef.current?.startsWith('blob:')) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const runExtraction = useCallback(
    async (loader: () => Promise<HTMLImageElement>, previewUrl: string | null, label: string) => {
      setStatus({ kind: 'busy', message: label });
      try {
        const img = await loader();
        const found = await extractPalette(img, Math.max(palette.slots.length, 5) + 1);
        setColours(found);
        setPreview(previewUrl ?? img.src);
        setStatus({ kind: 'idle' });
      } catch (e) {
        setStatus({ kind: 'error', message: (e as Error).message });
      }
    },
    [palette.slots.length],
  );

  const fromFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      void runExtraction(() => loadImageFromFile(file), url, 'Reading image…');
    },
    [runExtraction],
  );

  // Clipboard paste — the fastest route from a screenshot to a scheme.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
      if (item) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          fromFile(file);
        }
        return;
      }
      const text = e.clipboardData?.getData('text')?.trim();
      if (text && /^https?:\/\//.test(text)) setPinUrl(text);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [fromFile]);

  const fromUrl = async () => {
    const url = pinUrl.trim();
    if (!url) return;

    if (/pinterest\.|pin\.it/.test(url)) {
      setStatus({ kind: 'busy', message: 'Resolving pin…' });
      try {
        const res = await fetch(`/api/pinterest?url=${encodeURIComponent(url)}`);
        const data = (await res.json()) as { proxyUrl?: string; error?: string };
        if (!res.ok || !data.proxyUrl) throw new Error(data.error ?? 'Could not resolve that pin.');
        await runExtraction(() => loadImageFromUrl(data.proxyUrl!), data.proxyUrl!, 'Reading pin image…');
      } catch (e) {
        setStatus({
          kind: 'error',
          message: `${(e as Error).message} If the Pinterest endpoint is not deployed, right-click the pin, choose “Copy image address”, and paste that instead — or just drop the image file below.`,
        });
      }
      return;
    }

    await runExtraction(() => loadImageFromUrl(url), url, 'Reading image…');
  };

  const apply = () => {
    actions.replacePalette(
      applyExtraction(palette, colours, {
        snapToMaterials: snap,
        brands: filters.brands,
        realProductsOnly: filters.realProductsOnly,
      }),
    );
    onToast(snap ? 'Applied and matched to catalogue materials' : 'Applied as free colours');
  };

  return (
    <Panel title="Import a reference" onClose={onClose}>
      <div className="section">
        <h3>Pinterest pin or image URL</h3>
        <div className="row">
          <input
            className="input"
            placeholder="pinterest.com/pin/… or a direct image URL"
            value={pinUrl}
            spellCheck={false}
            onChange={(e) => setPinUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fromUrl()}
          />
          <button className="btn primary" onClick={fromUrl} disabled={!pinUrl.trim()}>
            <Icon name="download" />
            Fetch
          </button>
        </div>
        <p className="faint">
          Pin URLs are resolved by this app's own <code>/api/pinterest</code> endpoint, which also proxies the image so
          its pixels can be read. Boards are not supported — pins only.
        </p>
      </div>

      <div className="section">
        <h3>Or drop a file</h3>
        <label
          className={`drop${over ? ' over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file?.type.startsWith('image/')) fromFile(file);
          }}
        >
          <Icon name="image" size={22} />
          <div style={{ marginTop: 6 }}>
            Drop an image, click to browse, or press <span className="kbd">Ctrl</span>{' '}
            <span className="kbd">V</span> to paste a screenshot
          </div>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && fromFile(e.target.files[0])}
          />
        </label>
      </div>

      {status.kind === 'busy' && <p className="muted">{status.message}</p>}
      {status.kind === 'error' && <p className="err">{status.message}</p>}

      {preview && (
        <div className="section">
          <h3>Reference</h3>
          <img src={preview} alt="Imported reference" className="room" style={{ maxHeight: 220, objectFit: 'cover' }} />
        </div>
      )}

      {colours.length > 0 && (
        <div className="section">
          <h3>Extracted colours</h3>
          <div className="preset-strip" style={{ width: '100%', height: 44 }}>
            {colours.map((c) => (
              <i key={c.hex} style={{ background: c.hex, flex: Math.max(c.share, 0.05) }} title={`${c.hex} · ${(c.share * 100).toFixed(0)}%`} />
            ))}
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
            Match each colour to the nearest real material
          </label>
          <p className="faint">
            Colours are assigned to slots by how well they fit each role, not by order — the darkest suitable tone goes
            to the floor, the saturated minority colour to the accent. Locked slots are left alone.
          </p>
          <button className="btn primary" onClick={apply}>
            <Icon name="check" />
            Apply to unlocked slots
          </button>
        </div>
      )}
    </Panel>
  );
}
