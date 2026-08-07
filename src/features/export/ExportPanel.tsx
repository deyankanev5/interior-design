import { useState } from 'react';
import { Panel } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { useAppState } from '../../state/store';
import { shareUrl } from '../../state/url';
import { copyText, downloadFile } from './download';
import { toCsv, toCssVariables, toJson, toPngBlob, toSpecification, toSvg } from './exporters';

export function ExportPanel({ onClose, onToast }: { onClose: () => void; onToast: (m: string) => void }) {
  const { palette, presets, activePresetId } = useAppState();
  const name = presets.find((p) => p.id === activePresetId)?.name ?? 'Untitled scheme';
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'scheme';
  const [error, setError] = useState<string | null>(null);

  const png = async () => {
    setError(null);
    try {
      downloadFile(`${slug}.png`, await toPngBlob(palette), 'image/png');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Panel title="Export" onClose={onClose}>
      <div className="section">
        <h3>Share</h3>
        <button
          className="btn outline"
          onClick={() => {
            copyText(shareUrl(palette));
            onToast('Link copied — it reopens this exact scheme');
          }}
        >
          <Icon name="link" />
          Copy shareable link
        </button>
        <p className="faint">
          The whole scheme travels in the URL — slots, roles, locks and all. No account, no server.
        </p>
      </div>

      <div className="section">
        <h3>For the project file</h3>
        <button
          className="btn outline"
          onClick={() => downloadFile(`${slug}-finish-schedule.md`, toSpecification(palette, name), 'text/markdown')}
        >
          <Icon name="download" />
          Finish schedule (Markdown)
        </button>
        <button className="btn outline" onClick={() => downloadFile(`${slug}-schedule.csv`, toCsv(palette), 'text/csv')}>
          <Icon name="download" />
          Schedule (CSV, opens in Excel)
        </button>
        <button
          className="btn outline"
          onClick={() => {
            copyText(toSpecification(palette, name));
            onToast('Finish schedule copied');
          }}
        >
          <Icon name="copy" />
          Copy schedule to clipboard
        </button>
        <p className="faint">
          The schedule leads with the orderable reference — the decor code — because that is what a fabricator or
          decorator actually buys against.
        </p>
      </div>

      <div className="section">
        <h3>Images</h3>
        <div className="row wrap">
          <button className="btn outline" onClick={png}>
            <Icon name="image" />
            PNG
          </button>
          <button
            className="btn outline"
            onClick={() => downloadFile(`${slug}.svg`, toSvg(palette), 'image/svg+xml')}
          >
            <Icon name="image" />
            SVG
          </button>
        </div>
        {error && <p className="err">{error}</p>}
      </div>

      <div className="section">
        <h3>For developers</h3>
        <div className="row wrap">
          <button
            className="btn outline"
            onClick={() => downloadFile(`${slug}.json`, toJson(palette, name), 'application/json')}
          >
            <Icon name="download" />
            JSON
          </button>
          <button
            className="btn outline"
            onClick={() => {
              copyText(toCssVariables(palette));
              onToast('CSS custom properties copied');
            }}
          >
            <Icon name="copy" />
            CSS variables
          </button>
        </div>
      </div>
    </Panel>
  );
}
