import { useMemo } from 'react';
import { hexToOklch, isValidHex, normaliseHex, oklchToHex, readableTextOn, shade, tint } from '../color/convert';
import { Icon } from './Icon';

/**
 * Pick a colour by hand.
 *
 * This used to be a 46px swatch and a text box halfway down a panel, which is
 * backwards: typing a hex is the rarest way anyone arrives at a colour, and
 * dragging a picker is the most common. So the picker is the large target, the
 * ramp beside it gives the two moves people actually make — go lighter, go
 * deeper, keeping the hue — and the hex box is a small field at the end for the
 * one case where you are copying a value from somewhere else.
 */
export function ColorField({
  hex,
  onChange,
  onCopy,
}: {
  hex: string;
  onChange: (hex: string) => void;
  onCopy?: (hex: string) => void;
}) {
  const fg = readableTextOn(hex);

  /**
   * A ramp through the current hue, not a fixed set of swatches.
   *
   * The window slides to stay inside the usable lightness range rather than
   * being centred on the current colour. Centring looks tidier and breaks at
   * the ends: from a near-white, three lighter steps all clamp to the same
   * value and you get four identical swatches. Sliding keeps seven distinct,
   * useful options wherever the colour happens to sit.
   *
   * Lightness moves in Oklab and chroma eases off away from the base, which is
   * what keeps a pale tint from going chalky and a deep shade from going muddy
   * — the failure mode of mixing towards white and black in sRGB.
   */
  const { ramp, nearest } = useMemo(() => {
    const base = hexToOklch(hex);
    const SPAN = 0.62;
    const lo = Math.min(Math.max(base.L - SPAN / 2, 0.08), 0.96 - SPAN);

    const steps = Array.from({ length: 7 }, (_, i) => {
      const L = lo + (SPAN * i) / 6;
      const C = base.C * (1 - Math.min(0.45, Math.abs(L - base.L) * 1.3));
      return { L, hex: oklchToHex({ L, C, h: base.h }) };
    });

    let best = 0;
    for (let i = 1; i < steps.length; i++) {
      if (Math.abs(steps[i].L - base.L) < Math.abs(steps[best].L - base.L)) best = i;
    }
    return { ramp: steps.map((s) => s.hex), nearest: best };
  }, [hex]);

  return (
    <div className="colour-field">
      <label className="colour-well" style={{ background: hex, color: fg }}>
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          aria-label="Pick a colour"
        />
        <span className="colour-well-hint">
          <Icon name="droplet" size={18} />
          <b>Pick a colour</b>
        </span>
      </label>

      <div className="colour-side">
        <div className="ramp" role="group" aria-label="Lighter and deeper versions of this colour">
          {ramp.map((c, i) => (
            <button
              key={`${c}-${i}`}
              className={`ramp-step${i === nearest ? ' on' : ''}`}
              style={{ background: c }}
              title={c}
              aria-label={`Use ${c}`}
              onClick={() => onChange(c)}
            />
          ))}
        </div>

        <div className="row">
          <button
            className="btn outline sm"
            title="A little lighter"
            onClick={() => onChange(tint(hex, 0.12))}
          >
            <Icon name="sun" size={14} />
            Lighter
          </button>
          <button
            className="btn outline sm"
            title="A little deeper"
            onClick={() => onChange(shade(hex, 0.12))}
          >
            <Icon name="moon" size={14} />
            Deeper
          </button>
        </div>

        <div className="hex-row">
          <span className="hex-hash" aria-hidden="true">
            #
          </span>
          <input
            className="input hex-input"
            defaultValue={hex.replace('#', '')}
            key={hex}
            spellCheck={false}
            maxLength={6}
            aria-label="Hex value"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (isValidHex(v)) onChange(normaliseHex(v));
              else e.target.value = hex.replace('#', '');
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          {onCopy && (
            <button className="btn icon sm" title="Copy hex" onClick={() => onCopy(hex)}>
              <Icon name="copy" size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
