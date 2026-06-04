const PALETTES = [
  { label: 'ברירת מחדל',  colors: ['#7C3AED','#10B981','#F97316','#3B82F6','#EAB308','#EF4444'] },
  { label: 'כחולים',      colors: ['#1D4ED8','#2563EB','#3B82F6','#60A5FA','#93C5FD','#BFDBFE'] },
  { label: 'ירוקים',      colors: ['#065F46','#059669','#10B981','#34D399','#6EE7B7','#A7F3D0'] },
  { label: 'חמים',        colors: ['#B45309','#D97706','#F59E0B','#FBBF24','#FCD34D','#FDE68A'] },
  { label: 'אנלוגי',      colors: ['#6D28D9','#7C3AED','#8B5CF6','#A78BFA','#C4B5FD','#DDD6FE'] },
  { label: 'צבעוני',      colors: ['#EF4444','#F97316','#EAB308','#10B981','#3B82F6','#8B5CF6'] },
];

const BG_PRESETS = ['#FFFFFF','#F8FAFC','#EFF6FF','#F0FDF4','#FFF7ED','#FDF4FF','#1E293B','#0F172A'];

export default function StyleEditor({ style, onChange }) {
  const s = style || {};
  const set = (key, val) => onChange({ ...s, [key]: val });

  const activePalette = PALETTES.find(p =>
    p.colors.join() === (s.chartPalette || PALETTES[0].colors).join()
  );

  return (
    <div className="cfg-section" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Background color */}
      <div>
        <div className="cfg-label">צבע רקע</div>
        <div className="style-color-row">
          {BG_PRESETS.map(c => (
            <button
              key={c}
              type="button"
              className={`style-color-dot${(s.backgroundColor || '#FFFFFF') === c ? ' active' : ''}`}
              style={{ background: c, border: c === '#FFFFFF' ? '1.5px solid #e2e8f0' : 'none' }}
              onClick={() => set('backgroundColor', c)}
              title={c}
            />
          ))}
          <label className="style-color-custom" title="צבע מותאם">
            <i className="ti ti-color-picker" />
            <input
              type="color"
              value={s.backgroundColor || '#FFFFFF'}
              onChange={e => set('backgroundColor', e.target.value)}
              style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
            />
          </label>
        </div>
      </div>

      {/* Chart palette */}
      <div>
        <div className="cfg-label">פלטת גרף</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PALETTES.map(p => (
            <button
              key={p.label}
              type="button"
              className={`style-palette-row${activePalette?.label === p.label ? ' active' : ''}`}
              onClick={() => set('chartPalette', p.colors)}
            >
              <span className="style-palette-name">{p.label}</span>
              <div className="style-palette-swatches">
                {p.colors.map(c => (
                  <span key={c} style={{ background: c }} className="style-swatch" />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Conditional colors */}
      <div>
        <div className="cfg-label">צבעי ערך (חיובי / שלילי)</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>חיובי ▲</div>
            <input
              type="color"
              value={s.conditionalColors?.positive || '#10B981'}
              onChange={e => set('conditionalColors', { ...(s.conditionalColors || {}), positive: e.target.value })}
              style={{ width: '100%', height: 32, border: 'none', borderRadius: 6, cursor: 'pointer' }}
            />
          </label>
          <label style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>שלילי ▼</div>
            <input
              type="color"
              value={s.conditionalColors?.negative || '#EF4444'}
              onChange={e => set('conditionalColors', { ...(s.conditionalColors || {}), negative: e.target.value })}
              style={{ width: '100%', height: 32, border: 'none', borderRadius: 6, cursor: 'pointer' }}
            />
          </label>
        </div>
      </div>

      {/* Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label className="style-toggle">
          <span>הצג קווי רשת</span>
          <input type="checkbox" checked={s.showGrid ?? true} onChange={e => set('showGrid', e.target.checked)} />
          <span className="style-toggle-track" />
        </label>
        <label className="style-toggle">
          <span>הצג מקרא</span>
          <input type="checkbox" checked={s.showLegend ?? false} onChange={e => set('showLegend', e.target.checked)} />
          <span className="style-toggle-track" />
        </label>
      </div>
    </div>
  );
}
