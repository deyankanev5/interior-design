import { useDeferredValue, useMemo, useState } from 'react';
import { SURFACE_LABEL, type Slot } from '../../domain/types';
import { SURFACE_RULES } from '../../domain/surfaces';
import { brands, browseMaterials, catalogStats, userMaterialCount } from '../../data/catalog';
import { CATALOG_TEMPLATE_CSV, parseCatalog } from '../../data/import';
import { Panel } from '../../ui/Modal';
import { Icon } from '../../ui/Icon';
import { MaterialGrid } from '../../ui/MaterialGrid';
import { actions, useAppState } from '../../state/store';
import { downloadFile, readTextFile } from '../export/download';

export function LibraryPanel({ onClose, onToast }: { onClose: () => void; onToast: (m: string) => void }) {
  const { palette, filters, catalogVersion } = useAppState();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [targetSlotId, setTargetSlotId] = useState<string>(palette.slots[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showImport, setShowImport] = useState(false);

  // These read the catalogue module's mutable state rather than a prop, so the
  // version counter is the only thing that can tell React they went stale.
  const allBrands = useMemo(() => (void catalogVersion, brands()), [catalogVersion]);
  const stats = useMemo(() => (void catalogVersion, catalogStats()), [catalogVersion]);
  const target: Slot | undefined = palette.slots.find((s) => s.id === targetSlotId) ?? palette.slots[0];

  const results = useMemo(() => {
    void catalogVersion;
    return browseMaterials({
      query: deferredQuery,
      surface: target?.surface,
      categories: target ? SURFACE_RULES[target.surface].categories : undefined,
      brands: filters.brands,
      realProductsOnly: filters.realProductsOnly,
    });
  }, [deferredQuery, target, filters, catalogVersion]);

  const importCatalog = async (file: File) => {
    setError(null);
    setWarnings([]);
    try {
      const text = await readTextFile(file);
      const { materials, warnings: warn } = parseCatalog(text, file.name.toLowerCase());
      actions.loadUserCatalog(materials);
      setWarnings(warn);
      onToast(`Loaded ${materials.length} materials from ${file.name}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Panel title="Material library" onClose={onClose}>
      <div className="section sticky-top">
        <div className="search">
          <Icon name="search" size={15} />
          <input
            className="input"
            autoFocus
            spellCheck={false}
            placeholder="U702, h3303 st10, anthracite, oak, RAL 7016…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="btn icon sm" aria-label="Clear search" onClick={() => setQuery('')}>
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        <div className="scroller" role="group" aria-label="Assign the chosen finish to">
          {palette.slots.map((s, i) => (
            <button
              key={s.id}
              className={`chip swatch-chip${s.id === target?.id ? ' on' : ''}`}
              onClick={() => setTargetSlotId(s.id)}
              title={`Assign to slot ${i + 1}`}
            >
              <i style={{ background: s.hex }} />
              {i + 1} · {SURFACE_LABEL[s.surface]}
            </button>
          ))}
        </div>
      </div>

      <details className="details">
        <summary>
          Filters
          {(filters.brands?.length || filters.realProductsOnly) && <i className="dot-mark" aria-hidden="true" />}
        </summary>
        <div className="row wrap" style={{ marginTop: 8 }}>
          <button
            className={`chip${!filters.brands ? ' on' : ''}`}
            onClick={() => actions.setFilters({ brands: null })}
          >
            All brands
          </button>
          {allBrands.map((b) => {
            const on = filters.brands?.includes(b) ?? false;
            return (
              <button
                key={b}
                className={`chip${on ? ' on' : ''}`}
                onClick={() => {
                  const current = filters.brands ?? [];
                  const next = on ? current.filter((x) => x !== b) : [...current, b];
                  actions.setFilters({ brands: next.length ? next : null });
                }}
              >
                {b}
              </button>
            );
          })}
        </div>
        <label className="checkbox" style={{ marginTop: 10 }}>
          <input
            type="checkbox"
            checked={filters.realProductsOnly}
            onChange={(e) => actions.setFilters({ realProductsOnly: e.target.checked })}
          />
          Only orderable products — hide representative finishes
        </label>
      </details>

      <div className="section">
        <h3>
          {results.length} finish{results.length === 1 ? '' : 'es'}
          {target && ` valid for a ${SURFACE_LABEL[target.surface].toLowerCase()}`}
        </h3>
        <MaterialGrid
          items={results}
          selectedId={target?.materialId}
          onPick={(m) => target && actions.setMaterial(target.id, m.id)}
        />
      </div>

      <details className="details" open={showImport} onToggle={(e) => setShowImport(e.currentTarget.open)}>
        <summary>Load your own catalogue</summary>
        <p className="faint" style={{ marginTop: 8 }}>
          The built-in catalogue holds {stats.total} entries and is a starting point, not a substitute for the ranges
          you specify from. Import a CSV or JSON export of your supplier's decor book and it replaces the user layer
          entirely — the seed entries stay underneath.
          {userMaterialCount() > 0 && ` Currently ${userMaterialCount()} imported entries are active.`}
        </p>
        <div className="row wrap" style={{ marginTop: 10 }}>
          <label className="btn outline">
            <Icon name="download" />
            Import CSV / JSON
            <input
              type="file"
              accept=".csv,.json,text/csv,application/json"
              hidden
              onChange={(e) => e.target.files?.[0] && importCatalog(e.target.files[0])}
            />
          </label>
          <button
            className="btn outline"
            onClick={() => downloadFile('catalogue-template.csv', CATALOG_TEMPLATE_CSV, 'text/csv')}
          >
            <Icon name="save" />
            Template CSV
          </button>
          {userMaterialCount() > 0 && (
            <button
              className="btn outline"
              onClick={() => {
                actions.clearUserCatalog();
                onToast('Imported catalogue cleared');
              }}
            >
              <Icon name="trash" />
              Clear imported
            </button>
          )}
        </div>
        {error && <p className="err">{error}</p>}
        {warnings.length > 0 && (
          <details>
            <summary className="faint" style={{ cursor: 'pointer' }}>
              {warnings.length} row{warnings.length === 1 ? '' : 's'} skipped
            </summary>
            {warnings.slice(0, 40).map((w) => (
              <p className="faint" key={w}>
                {w}
              </p>
            ))}
          </details>
        )}
      </details>
    </Panel>
  );
}
