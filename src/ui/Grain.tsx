import type { Pattern } from '../domain/types';

/**
 * A schematic texture overlay.
 *
 * Deliberately abstract: a decor's real character comes from a printed
 * photographic paper, and faking that with CSS would misrepresent the product.
 * What this does communicate is *grain direction and scale*, which is the part
 * that matters when judging whether two surfaces will fight each other.
 */
export function Grain({ pattern, opacity = 1 }: { pattern: Pattern; opacity?: number }) {
  if (pattern === 'solid') return null;

  const id = `g-${pattern}`;
  return (
    <svg className="grain" style={{ opacity }} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id={id} width={patternSize(pattern)[0]} height={patternSize(pattern)[1]} patternUnits="userSpaceOnUse">
          {content(pattern)}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

function patternSize(pattern: Pattern): [number, number] {
  switch (pattern) {
    case 'woodgrain':
      return [140, 26];
    case 'stone':
      return [110, 110];
    case 'concrete':
      return [70, 70];
    case 'fabric':
      return [7, 7];
    case 'metallic':
      return [5, 60];
    case 'terrazzo':
      return [64, 64];
    default:
      return [10, 10];
  }
}

function content(pattern: Pattern) {
  const stroke = 'rgba(0,0,0,0.45)';
  const light = 'rgba(255,255,255,0.35)';

  switch (pattern) {
    case 'woodgrain':
      return (
        <>
          <path d="M0 4 Q35 1 70 4.5 T140 4" stroke={stroke} strokeWidth="1" fill="none" />
          <path d="M0 11 Q40 8 80 12 T140 10" stroke={stroke} strokeWidth="0.7" fill="none" />
          <path d="M0 18 Q30 22 65 18 T140 19" stroke={light} strokeWidth="0.9" fill="none" />
          <path d="M0 24 Q45 27 90 23 T140 25" stroke={stroke} strokeWidth="0.6" fill="none" />
        </>
      );
    case 'stone':
      return (
        <>
          <path d="M-10 80 Q30 40 60 55 T130 20" stroke={light} strokeWidth="3" fill="none" />
          <path d="M-10 95 Q40 60 75 72 T130 42" stroke={stroke} strokeWidth="1.1" fill="none" />
          <path d="M-10 30 Q25 12 55 22 T130 -5" stroke={stroke} strokeWidth="0.8" fill="none" />
        </>
      );
    case 'concrete':
      return (
        <>
          <circle cx="14" cy="18" r="1.3" fill={stroke} opacity="0.5" />
          <circle cx="46" cy="31" r="1" fill={light} />
          <circle cx="27" cy="52" r="1.6" fill={stroke} opacity="0.4" />
          <circle cx="58" cy="61" r="0.9" fill={stroke} opacity="0.5" />
          <circle cx="8" cy="44" r="0.8" fill={light} />
        </>
      );
    case 'fabric':
      return (
        <>
          <path d="M0 0h7M0 3.5h7" stroke={stroke} strokeWidth="0.5" opacity="0.5" />
          <path d="M0 0v7M3.5 0v7" stroke={light} strokeWidth="0.5" />
        </>
      );
    case 'metallic':
      return <path d="M0 0v60M2.5 0v60" stroke={light} strokeWidth="0.6" opacity="0.7" />;
    case 'terrazzo':
      return (
        <>
          <path d="M10 12l6 3-3 6z" fill={light} />
          <path d="M40 20l7 2-4 5z" fill={stroke} opacity="0.4" />
          <path d="M22 44l5 4-6 3z" fill={stroke} opacity="0.35" />
          <path d="M50 50l5 2-3 4z" fill={light} />
        </>
      );
    default:
      return null;
  }
}
