import { useMemo } from 'react';
import { catalogStats } from '../../data/catalog';
import { Panel } from '../../ui/Modal';

export function AboutPanel({ onClose }: { onClose: () => void }) {
  const stats = useMemo(() => catalogStats(), []);

  return (
    <Panel title="About the data & the engine" onClose={onClose}>
      <div className="section">
        <h3>Read this before you specify anything</h3>
        <p className="muted">
          The hex values here are <strong>representative, not colour-accurate</strong>. Each one is the perceptual
          average of the manufacturer's own photograph of the decor — a printed, textured, often gloss-varying
          surface — rendered on an uncalibrated screen. Treat every colour as a shortlisting aid and confirm against a
          physical sample in the actual room, under the actual lighting, before anything is ordered.
        </p>
      </div>

      <div className="section">
        <h3>Where the catalogue comes from</h3>
        <p className="muted">
          {stats.total} entries in three confidence tiers, labelled on every row:
        </p>
        <p className="muted">
          <i className="tag real">orderable</i> — decor codes, names and textures scraped from the manufacturer's own
          published range (EGGER, Kronospan), with colours sampled from their decor photographs. Quote these directly
          to a supplier. {stats.byProvenance['manufacturer-decor'] ?? 0} entries.
        </p>
        <p className="muted">
          <i className="tag std">standard</i> — RAL Classic. A published colour standard, so any paint, lacquer or
          powder-coat supplier in the EU can match it, and it will still mean the same thing in five years.{' '}
          {stats.byProvenance.standard ?? 0} entries.
        </p>
        <p className="muted">
          <i className="tag">representative</i> — finish families rather than specific SKUs: honed travertine, bouclé
          wool, brushed brass. Tile and textile ranges turn over too fast, and vary too much by importer, for a fixed
          SKU list to stay honest. Substitute your supplier's equivalent.{' '}
          {stats.byProvenance.generic ?? 0} entries.
        </p>
        <p className="faint">
          The seed catalogue is a starting point, not a substitute for the ranges you actually specify from. Library →
          Load your own catalogue takes a CSV or JSON export of a supplier decor book and layers it on top.
        </p>
      </div>

      <div className="section">
        <h3>How the generator decides</h3>
        <p className="muted">
          Deterministic colour science, not a language model. Every colour is compared in Oklab, where numeric distance
          matches what the eye reports — which is why the engine can tell you a floor and a wall will blur together
          before you see them next to each other.
        </p>
        <p className="muted">
          Each surface has an envelope (lightness, chroma, permitted product categories), the harmony scheme sets the
          hue relationships, and the mood biases both. Candidates are then drawn only from real catalogue entries for
          that surface, scored against the palette as a whole, and the best complete scheme out of many attempts is
          returned. Locked slots are treated as fixed constraints throughout.
        </p>
        <p className="faint">
          The consequence worth knowing: the engine can only ever propose a product that exists in the catalogue. It
          cannot invent a decor code — which is exactly the failure mode you cannot afford in a document someone orders
          from.
        </p>
      </div>

      <div className="section">
        <h3>Keyboard</h3>
        <p className="faint">
          <span className="kbd">Space</span> generate · <span className="kbd">1</span>–<span className="kbd">9</span>{' '}
          lock that slot · <span className="kbd">Ctrl</span> <span className="kbd">Z</span> undo ·{' '}
          <span className="kbd">Ctrl</span> <span className="kbd">⇧</span> <span className="kbd">Z</span> redo ·{' '}
          <span className="kbd">Ctrl</span> <span className="kbd">K</span> library ·{' '}
          <span className="kbd">Ctrl</span> <span className="kbd">V</span> paste a reference image ·{' '}
          <span className="kbd">Esc</span> close panel
        </p>
      </div>
    </Panel>
  );
}
