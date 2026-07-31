import type { MaterialView } from '../../domain/types';
import { CATEGORY_LABEL } from '../../domain/types';
import { Grain } from '../../ui/Grain';

const PROVENANCE_TAG: Record<MaterialView['provenance'], { label: string; cls: string; title: string }> = {
  'manufacturer-decor': {
    label: 'orderable',
    cls: 'tag real',
    title: 'A decor code published by the manufacturer — quote it directly to your supplier.',
  },
  standard: {
    label: 'standard',
    cls: 'tag std',
    title: 'A published colour standard. Any paint or lacquer supplier can match it.',
  },
  generic: {
    label: 'representative',
    cls: 'tag',
    title: 'A representative finish, not a specific product. Substitute your supplier’s equivalent.',
  },
};

export function MaterialRow({
  material,
  selected,
  score,
  reason,
  onPick,
}: {
  material: MaterialView;
  selected?: boolean;
  score?: number;
  reason?: string;
  onPick: () => void;
}) {
  const tag = PROVENANCE_TAG[material.provenance];

  return (
    <button className={`mat${selected ? ' selected' : ''}`} onClick={onPick} title={reason}>
      <span className="swatch" style={{ background: material.hex }}>
        <Grain pattern={material.pattern} />
      </span>
      <span className="mat-info">
        <b>
          {material.code}
          {material.texture ? ` ${material.texture}` : ''} · {material.name}
        </b>
        <span>
          {material.brand} · {CATEGORY_LABEL[material.category]} · LRV {material.lrv.toFixed(0)}
        </span>
        <span style={{ marginTop: 3 }}>
          <i className={tag.cls} title={tag.title}>
            {tag.label}
          </i>
        </span>
        {reason && <span className="mat-reason">{reason}</span>}
      </span>
      {score !== undefined && <span className="mat-score">{score}</span>}
    </button>
  );
}
