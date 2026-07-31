import type { Palette } from '../../domain/types';
import { SCHEME_LABEL, SURFACE_LABEL } from '../../domain/types';
import { lrv, readableTextOn } from '../../color/convert';
import { fullCode, getMaterial } from '../../data/catalog';
import { reportFor } from '../../engine/score';

/**
 * A finish schedule in the form a contractor or fabricator expects: one row per
 * surface, with the orderable reference rather than a hex code, because nobody
 * on site can buy `#CFC9C0`.
 */
export function toSpecification(palette: Palette, name = 'Untitled scheme'): string {
  const report = reportFor(palette);
  const lines: string[] = [];

  lines.push(`# ${name} — finish schedule`, '');
  lines.push(
    `Scheme: ${SCHEME_LABEL[palette.resolvedScheme ?? palette.scheme]}  |  Mood: ${palette.mood}  |  Review score: ${report.total}/100`,
    '',
  );

  lines.push('| Surface | Reference | Finish | Hex | LRV | Note |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const slot of palette.slots) {
    const m = getMaterial(slot.materialId);
    lines.push(
      `| ${SURFACE_LABEL[slot.surface]} | ${m ? fullCode(m) : '—'} | ${m ? m.name : 'Free colour'} | ${slot.hex} | ${lrv(slot.hex).toFixed(0)} | ${slot.note ?? ''} |`,
    );
  }

  lines.push('', '## Design review', '');
  for (const c of report.checks) {
    lines.push(`- **${c.label}** (${Math.round(c.score * 100)}/100) — ${c.detail}`);
  }

  lines.push(
    '',
    '## Before ordering',
    '',
    'Hex values are screen approximations generated for palette maths and are not colour-accurate. Confirm every',
    'reference against a physical sample, viewed in the room and under the specified lighting, before ordering.',
    'Check current availability with the supplier — decor ranges are revised on a multi-year cycle.',
  );

  return lines.join('\n');
}

export function toCsv(palette: Palette): string {
  const rows = [['Surface', 'Brand', 'Code', 'Texture', 'Name', 'Category', 'Hex', 'LRV', 'Locked', 'Note']];
  for (const slot of palette.slots) {
    const m = getMaterial(slot.materialId);
    rows.push([
      SURFACE_LABEL[slot.surface],
      m?.brand ?? '',
      m?.code ?? '',
      m?.texture ?? '',
      m?.name ?? 'Free colour',
      m?.category ?? '',
      slot.hex,
      lrv(slot.hex).toFixed(0),
      slot.locked ? 'yes' : 'no',
      slot.note ?? '',
    ]);
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toJson(palette: Palette, name = 'Untitled scheme'): string {
  return JSON.stringify(
    {
      name,
      scheme: palette.resolvedScheme ?? palette.scheme,
      mood: palette.mood,
      generatedAt: new Date().toISOString(),
      review: reportFor(palette),
      slots: palette.slots.map((slot) => {
        const m = getMaterial(slot.materialId);
        return {
          surface: slot.surface,
          hex: slot.hex,
          lrv: lrv(slot.hex),
          locked: slot.locked,
          note: slot.note ?? null,
          material: m
            ? {
                id: m.id,
                brand: m.brand,
                code: m.code,
                texture: m.texture ?? null,
                name: m.name,
                category: m.category,
                pattern: m.pattern,
                provenance: m.provenance,
              }
            : null,
        };
      }),
    },
    null,
    2,
  );
}

export function toCssVariables(palette: Palette): string {
  const lines = [':root {'];
  const used = new Map<string, number>();
  for (const slot of palette.slots) {
    const base = slot.surface;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const suffix = n > 1 ? `-${n}` : '';
    const m = getMaterial(slot.materialId);
    lines.push(`  --${base}${suffix}: ${slot.hex};${m ? ` /* ${fullCode(m)} ${m.name} */` : ''}`);
  }
  lines.push('}');
  return lines.join('\n');
}

export function toSvg(palette: Palette, width = 1200, height = 630): string {
  const w = width / palette.slots.length;
  const parts = palette.slots.map((slot, i) => {
    const m = getMaterial(slot.materialId);
    const fg = readableTextOn(slot.hex);
    const cx = i * w + w / 2;
    return `
  <rect x="${i * w}" y="0" width="${w}" height="${height}" fill="${slot.hex}"/>
  <text x="${cx}" y="${height - 96}" fill="${fg}" font-family="monospace" font-size="26" font-weight="700" text-anchor="middle" opacity="0.95">${slot.hex.replace('#', '')}</text>
  <text x="${cx}" y="${height - 66}" fill="${fg}" font-family="sans-serif" font-size="15" text-anchor="middle" opacity="0.8">${escapeXml(m ? `${m.code}${m.texture ? ` ${m.texture}` : ''}` : 'Free colour')}</text>
  <text x="${cx}" y="${height - 45}" fill="${fg}" font-family="sans-serif" font-size="13" text-anchor="middle" opacity="0.65">${escapeXml(m?.name ?? '')}</text>
  <text x="${cx}" y="${height - 24}" fill="${fg}" font-family="sans-serif" font-size="11" letter-spacing="1.2" text-anchor="middle" opacity="0.5">${SURFACE_LABEL[slot.surface].toUpperCase()}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}
</svg>`;
}

export async function toPngBlob(palette: Palette, width = 1200, height = 630): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');

  const w = width / palette.slots.length;
  palette.slots.forEach((slot, i) => {
    const m = getMaterial(slot.materialId);
    ctx.fillStyle = slot.hex;
    ctx.fillRect(i * w, 0, w, height);

    const fg = readableTextOn(slot.hex);
    const cx = i * w + w / 2;
    ctx.textAlign = 'center';

    ctx.fillStyle = fg;
    ctx.globalAlpha = 0.95;
    ctx.font = '700 26px ui-monospace, monospace';
    ctx.fillText(slot.hex.replace('#', ''), cx, height - 96);

    ctx.globalAlpha = 0.8;
    ctx.font = '15px sans-serif';
    ctx.fillText(m ? `${m.code}${m.texture ? ` ${m.texture}` : ''}` : 'Free colour', cx, height - 66);

    ctx.globalAlpha = 0.65;
    ctx.font = '13px sans-serif';
    ctx.fillText(m?.name ?? '', cx, height - 45);

    ctx.globalAlpha = 0.5;
    ctx.font = '11px sans-serif';
    ctx.fillText(SURFACE_LABEL[slot.surface].toUpperCase(), cx, height - 24);
    ctx.globalAlpha = 1;
  });

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not render the image.'))), 'image/png'),
  );
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}
