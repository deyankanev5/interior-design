import { useMemo } from 'react';
import type { HarmonyScheme } from '../../domain/types';
import { SCHEME_LABEL, SURFACE_LABEL } from '../../domain/types';
import { SURFACE_RULES } from '../../domain/surfaces';
import { hexToOklch, lrv } from '../../color/convert';
import { reportFor } from '../../engine/score';
import { accentModelFor } from '../../engine/harmony';
import { getMaterial } from '../../data/catalog';
import { Panel } from '../../ui/Modal';
import { useStore } from '../../state/store';

export function AnalysisPanel({ onClose }: { onClose: () => void }) {
  const palette = useStore((s) => s.palette);
  const report = useMemo(() => reportFor(palette), [palette]);

  const scheme = (palette.resolvedScheme ??
    (palette.scheme === 'auto' ? 'analogous' : palette.scheme)) as Exclude<HarmonyScheme, 'auto'>;
  const accent = accentModelFor(scheme);

  // 60-30-10: area share each slot would occupy if built as specified.
  const totalArea = palette.slots.reduce((a, s) => a + SURFACE_RULES[s.surface].areaWeight, 0);

  return (
    <Panel title="Design review" onClose={onClose}>
      <div className="score">
        <b>{report.total}</b>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{verdictText(report.total)}</div>
          <small>
            Weighted across {report.checks.length} checks · {SCHEME_LABEL[scheme]}
          </small>
        </div>
      </div>

      <div className="section">
        <h3>Checks</h3>
        <div>
          {report.checks.map((c) => (
            <div className="check" key={c.id}>
              <span className={`dot ${c.verdict}`} />
              <div>
                <strong>
                  {c.label} · {Math.round(c.score * 100)}
                </strong>
                <p>{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <h3>The accent in this scheme</h3>
        <p className="muted">
          <strong>{accent.headline}.</strong> {accent.effect}
        </p>
        <p className="faint">
          Relationship: {accent.relation.replace('-', ' ')} ({accent.offset}° from the dominant hue). Target chroma
          roughly {accent.chromaRatio}× the large surfaces, at about {Math.round(accent.areaShare * 100)}% of visible
          area.
        </p>
      </div>

      <div className="section">
        <h3>Proportions & light</h3>
        <p className="faint">
          Share of visible surface each slot is likely to occupy, from its role. The classic 60-30-10 split is a
          starting point, not a rule — what matters is that one surface clearly dominates and the accent clearly does
          not.
        </p>
        <div>
          {palette.slots.map((s) => {
            const share = SURFACE_RULES[s.surface].areaWeight / totalArea;
            const m = getMaterial(s.materialId);
            const { C } = hexToOklch(s.hex);
            return (
              <div className="check" key={s.id}>
                <span className="dot" style={{ background: s.hex, border: '1px solid var(--line)' }} />
                <div>
                  <strong>
                    {SURFACE_LABEL[s.surface]} · {Math.round(share * 100)}% · LRV {lrv(s.hex).toFixed(0)}
                  </strong>
                  <p>
                    {m ? `${m.brand} ${m.code}${m.texture ? ` ${m.texture}` : ''} ${m.name}` : s.hex}
                    {' · chroma '}
                    {C.toFixed(3)}
                    {C > 0.09 && SURFACE_RULES[s.surface].areaWeight >= 0.8
                      ? ' — high for a surface this size'
                      : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section">
        <h3>Before you specify</h3>
        <p className="faint">
          Screen colour is not sample colour. Order physical samples of every decor here, view them in the actual room
          at the times of day it is used, and check them against the artificial lighting that will be installed —
          metamerism between a 2700 K lamp and daylight is the single most common cause of a signed-off scheme looking
          wrong on site.
        </p>
      </div>
    </Panel>
  );
}

function verdictText(total: number): string {
  if (total >= 85) return 'Coherent and specifiable';
  if (total >= 70) return 'Sound, with points to watch';
  if (total >= 55) return 'Workable but compromised';
  return 'Needs rework';
}
