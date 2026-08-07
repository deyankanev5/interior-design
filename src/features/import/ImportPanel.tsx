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

    // Pinterest serves pin pages and its images without CORS headers, so a
    // browser can neither resolve a pin nor read the pixels of one of its
    // images. There is no client-side workaround; saving or copying the image
    // sidesteps it entirely and is what the panel steers people toward.
    if (/pinterest\.|pin\.it/.test(url)) {
      setStatus({
        kind: 'error',
        message:
          'Pinterest blocks other sites from reading its pages and images, so a pin link cannot be opened here. Instead: right-click the pin and choose “Copy image”, then press Ctrl+V (⌘V) below — or save the image and drop it in. Both work perfectly.',
      });
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
        <h3>Image address</h3>
        <div className="row">
          <input
            className="input"
            placeholder="https://… a direct link to an image file"
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
          Works when the image is hosted somewhere that allows other sites to read it. Many hosts — Pinterest and
          Instagram among them — do not, and there is no way around that from a web page. For those, copy or save the
          image and use one of the routes below; the result is identical.
        </p>
      </div>

      <div className="section">
        <h3>Paste or drop an image — always works</h3>
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
