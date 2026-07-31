import type { Palette, Surface } from '../../domain/types';
import { mix, shade, tint } from '../../color/convert';

/**
 * A schematic room in one-point perspective.
 *
 * Not a render — it makes no attempt to simulate light. Its job is proportion:
 * a colour that looks balanced as an equal-width column on the palette screen
 * behaves very differently when the floor is a third of the view and the accent
 * is one chair. Seeing that early is what stops a scheme failing on site.
 */
export function RoomPreview({ palette, height = 420 }: { palette: Palette; height?: number }) {
  const pick = (surface: Surface, fallback: string): string =>
    palette.slots.find((s) => s.surface === surface)?.hex ?? fallback;

  const wall = pick('wall', '#D9D5CC');
  const floor = pick('floor', '#B49A78');
  const ceiling = pick('ceiling', tint(wall, 0.55));
  const furniture = pick('furniture', shade(wall, 0.25));
  const worktop = pick('worktop', mix(furniture, wall, 0.5));
  const textile = pick('textile', mix(wall, furniture, 0.5));
  const accent = pick('accent', mix(furniture, '#8A6D3B', 0.6));

  // Side walls catch less light than the wall facing us.
  const wallLeft = shade(wall, 0.14);
  const wallRight = shade(wall, 0.07);

  return (
    <svg className="room" viewBox="0 0 800 500" style={{ height }} role="img" aria-label="Schematic room preview">
      {/* shell */}
      <polygon points="0,0 800,0 620,110 180,110" fill={ceiling} />
      <polygon points="0,500 800,500 620,330 180,330" fill={floor} />
      <polygon points="0,0 180,110 180,330 0,500" fill={wallLeft} />
      <polygon points="800,0 620,110 620,330 800,500" fill={wallRight} />
      <rect x="180" y="110" width="440" height="220" fill={wall} />

      {/* window on the right wall, so the floor reads as lit */}
      <polygon points="660,60 780,32 780,300 660,272" fill={tint(wall, 0.72)} opacity="0.85" />
      <polygon points="660,60 780,32 780,300 660,272" fill="none" stroke={shade(wall, 0.3)} strokeWidth="3" />
      <line x1="720" y1="46" x2="720" y2="286" stroke={shade(wall, 0.3)} strokeWidth="3" />

      {/* joinery run against the back wall */}
      <rect x="205" y="196" width="230" height="134" fill={furniture} />
      <rect x="205" y="186" width="230" height="12" fill={worktop} />
      <line x1="320" y1="200" x2="320" y2="330" stroke={shade(furniture, 0.22)} strokeWidth="1.5" />
      <line x1="205" y1="264" x2="435" y2="264" stroke={shade(furniture, 0.14)} strokeWidth="1.5" />

      {/* tall unit */}
      <rect x="452" y="140" width="96" height="190" fill={shade(furniture, 0.08)} />
      <line x1="452" y1="236" x2="548" y2="236" stroke={shade(furniture, 0.2)} strokeWidth="1.5" />

      {/* rug */}
      <polygon points="250,470 600,470 540,372 320,372" fill={textile} opacity="0.95" />

      {/* sofa */}
      <rect x="300" y="330" width="200" height="54" rx="7" fill={textile} />
      <rect x="300" y="318" width="200" height="26" rx="9" fill={tint(textile, 0.12)} />

      {/* accent: an occasional chair and a pendant */}
      <g>
        <rect x="560" y="336" width="62" height="46" rx="8" fill={accent} />
        <rect x="560" y="306" width="62" height="36" rx="9" fill={shade(accent, 0.1)} />
        <line x1="570" y1="382" x2="566" y2="410" stroke={shade(accent, 0.35)} strokeWidth="5" strokeLinecap="round" />
        <line x1="612" y1="382" x2="618" y2="410" stroke={shade(accent, 0.35)} strokeWidth="5" strokeLinecap="round" />
      </g>
      <g>
        <line x1="400" y1="0" x2="400" y2="128" stroke={shade(accent, 0.4)} strokeWidth="2.5" />
        <path d="M370 128 h60 l-14 26 h-32 z" fill={accent} />
      </g>

      {/* a soft gradient so the floor does not read as flat vinyl */}
      <defs>
        <linearGradient id="floorLight" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.12" />
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <polygon points="0,500 800,500 620,330 180,330" fill="url(#floorLight)" />
    </svg>
  );
}
