import type { MaterialView, Pattern } from '../domain/types';
import { Grain } from './Grain';

/**
 * The visible surface of a material.
 *
 * Where the supplier publishes a photograph of the decor, that photograph is
 * what gets shown — a woodgrain's knots and a stone's veining carry information
 * no flat colour can, and judging whether two surfaces sit well together is
 * mostly a judgement about pattern and scale.
 *
 * Colour standards and representative finishes have no authoritative image, so
 * they fall back to the flat colour with a schematic grain: abstract on
 * purpose, because inventing a texture for them would misrepresent the product.
 */
export function DecorSurface({
  material,
  hex,
  className,
  style,
  /** Photographs are dense; large fields read better slightly muted. */
  imageOpacity = 1,
}: {
  material: MaterialView | null;
  hex: string;
  className?: string;
  style?: React.CSSProperties;
  imageOpacity?: number;
}) {
  const src = material?.image ? `${import.meta.env.BASE_URL}${material.image}` : null;

  return (
    <span className={className} style={{ ...style, background: hex }}>
      {src ? (
        <img
          className="decor-img"
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          style={{ opacity: imageOpacity }}
        />
      ) : (
        <Grain pattern={(material?.pattern ?? 'solid') as Pattern} />
      )}
    </span>
  );
}
