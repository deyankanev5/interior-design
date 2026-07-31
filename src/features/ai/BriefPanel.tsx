import { useEffect, useState } from 'react';
import type { HarmonyScheme, Mood, Slot, Surface } from '../../domain/types';
import { SCHEME_LABEL, SURFACE_LABEL } from '../../domain/types';
import { SURFACE_RULES } from '../../domain/surfaces';
import { lrv } from '../../color/convert';
import { getMaterial } from '../../data/catalog';
import { generatePalette } from '../../engine/generate';
import { reportFor } from '../../engine/score';
import { Panel } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { actions, useAppState } from '../../state/store';
import { copyText } from '../export/download';

const SCHEMES = Object.keys(SCHEME_LABEL) as HarmonyScheme[];
const MOODS: Mood[] = ['any', 'warm', 'cool', 'muted', 'bold', 'light', 'dark'];
const SURFACES: Surface[] = ['ceiling', 'wall', 'floor', 'furniture', 'worktop', 'textile', 'accent'];

const EXAMPLES = [
  'Small north-facing bedroom, calm and warm, oak joinery, client dislikes grey',
  'Kitchen for a family flat in Sofia, hard-wearing, matt fronts, one strong colour',
  'Home office, dark and focused, walnut desk, brass details',
];

/**
 * Natural-language brief.
 *
 * The model's only output is a set of *constraints* — scheme, mood, which
 * surfaces the room needs. The deterministic engine then fills those slots from
 * the real catalogue, so nothing that reaches the finish schedule was invented
 * by a language model.
 */
export function BriefPanel({ onClose, onToast }: { onClose: () => void; onToast: (m: string) => void }) {
  const { palette, filters } = useAppState();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [prose, setProse] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ai')
      .then((r) => r.json())
      .then((d: { available?: boolean }) => setAvailable(Boolean(d.available)))
      .catch(() => setAvailable(false));
  }, []);

  const applyBrief = async () => {
    if (!brief.trim()) return;
    setBusy(true);
    setError(null);
    setRationale(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'brief', brief }),
      });
      const data = (await res.json()) as { result?: unknown; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'The brief could not be interpreted.');

      const parsed = validate(data.result);
      const slots: Slot[] = parsed.surfaces.map((surface, i) => {
        const existing = palette.slots[i];
        return existing?.locked
          ? { ...existing }
          : {
              id: `b${Date.now().toString(36)}${i}`,
              surface,
              locked: false,
              hex: '#CCCCCC',
              materialId: null,
            };
      });

      actions.replacePalette(
        generatePalette(
          { slots, scheme: parsed.scheme, mood: parsed.mood },
          { brands: filters.brands, realProductsOnly: filters.realProductsOnly },
        ),
      );
      setRationale(parsed.rationale);
      onToast('Brief applied — engine filled the slots from the catalogue');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const explain = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'explain', summary: summarise() }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? 'No rationale returned.');
      setProse(data.text.trim());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const summarise = (): string => {
    const report = reportFor(palette);
    const lines = palette.slots.map((s) => {
      const m = getMaterial(s.materialId);
      return `${SURFACE_LABEL[s.surface]} (${Math.round((SURFACE_RULES[s.surface].areaWeight / total(palette.slots)) * 100)}% of view): ${
        m ? `${m.brand} ${m.code}${m.texture ? ` ${m.texture}` : ''} ${m.name}` : 'free colour'
      }, ${s.hex}, LRV ${lrv(s.hex).toFixed(0)}`;
    });
    return [
      `Scheme: ${SCHEME_LABEL[palette.resolvedScheme ?? palette.scheme]}, mood ${palette.mood}.`,
      ...lines,
      '',
      'Engine review:',
      ...report.checks.map((c) => `- ${c.label}: ${c.detail}`),
    ].join('\n');
  };

  return (
    <Panel title="Brief" onClose={onClose}>
      {available === false && (
        <div className="section">
          <p className="muted">
            Azure AI is not configured on this deployment, so this panel is inactive. Everything else in the app works
            without it — the generator, the scoring and the suggestions are deterministic colour science, not a
            language model.
          </p>
          <p className="faint">
            To switch it on, set <code>AZURE_AI_ENDPOINT</code>, <code>AZURE_AI_API_KEY</code> and{' '}
            <code>AZURE_AI_DEPLOYMENT</code> in the environment and redeploy. The key stays server-side.
          </p>
        </div>
      )}

      <div className="section">
        <h3>Describe the room</h3>
        <textarea
          className="textarea"
          rows={4}
          disabled={available === false}
          placeholder="Small north-facing bedroom, calm and warm, oak joinery…"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
        <div className="row wrap">
          {EXAMPLES.map((x) => (
            <button key={x} className="chip" onClick={() => setBrief(x)} disabled={available === false}>
              {x.split(',')[0]}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={applyBrief} disabled={busy || !brief.trim() || available === false}>
          <Icon name="sparkle" />
          {busy ? 'Working…' : 'Interpret & generate'}
        </button>
        <p className="faint">
          The model only chooses the scheme, the mood and which surfaces the room needs. Every material is then picked
          by the engine from the catalogue — a language model never names a decor here, because a plausible-looking
          code that does not exist is the one error a finish schedule cannot survive.
        </p>
      </div>

      {rationale && (
        <div className="section">
          <h3>Why these constraints</h3>
          <p className="muted">{rationale}</p>
        </div>
      )}

      <div className="section">
        <h3>Client-facing rationale</h3>
        <button className="btn outline" onClick={explain} disabled={busy || available === false}>
          <Icon name="pencil" />
          Write the paragraph
        </button>
        {prose && (
          <>
            <p className="muted">{prose}</p>
            <button
              className="btn outline"
              onClick={() => {
                void copyText(prose);
                onToast('Rationale copied');
              }}
            >
              <Icon name="copy" />
              Copy
            </button>
          </>
        )}
        <p className="faint">
          Drafted from the scheme as specified and the engine's own review findings. Read it before it goes anywhere
          near a client.
        </p>
      </div>

      {error && <p className="err">{error}</p>}
    </Panel>
  );
}

const total = (slots: Slot[]) => slots.reduce((a, s) => a + SURFACE_RULES[s.surface].areaWeight, 0) || 1;

interface BriefResult {
  scheme: HarmonyScheme;
  mood: Mood;
  surfaces: Surface[];
  rationale: string;
}

/** Never trust the model's shape — clamp everything to what the engine accepts. */
function validate(raw: unknown): BriefResult {
  const o = (raw ?? {}) as Record<string, unknown>;

  const scheme = SCHEMES.includes(o.scheme as HarmonyScheme) ? (o.scheme as HarmonyScheme) : 'auto';
  const mood = MOODS.includes(o.mood as Mood) ? (o.mood as Mood) : 'any';

  const surfaces = (Array.isArray(o.surfaces) ? o.surfaces : [])
    .filter((s): s is Surface => SURFACES.includes(s as Surface))
    .slice(0, 8);

  if (surfaces.length < 2) surfaces.push('wall', 'floor', 'furniture', 'accent');

  return {
    scheme,
    mood,
    surfaces,
    rationale: typeof o.rationale === 'string' ? o.rationale : '',
  };
}
