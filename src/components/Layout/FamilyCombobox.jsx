import { useState, useMemo, useRef, useEffect } from 'react';

// Searchable combobox for picking a family. Filters options by family name OR num.
// When `searchAll` is provided and the user is actively typing, search expands
// across that wider list (e.g. "all families regardless of depth").
// Props:
//   value      — selected family id (or '' for none)
//   options    — array shown when input is empty (current cascading level)
//   searchAll  — optional wider array searched when the user types
//   onChange   — fn(newId) — pass '' for clear
//   placeholder
export default function FamilyCombobox({ value, options, searchAll, onChange, placeholder = 'הקלד שם או מספר...' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const blurTimer = useRef(null);

  // When showing the selected label we may need to look across the wider list
  // (e.g. picked a family that lives at a deeper level than this combobox's options).
  const allKnown = (searchAll && searchAll.length ? searchAll : options);
  const selected = allKnown.find(o => o.id === value) || options.find(o => o.id === value) || null;
  const labelOf = (f) => `${f.num ? `${f.num} — ` : ''}${f.name || ''}`;

  // While the dropdown is open the input shows the live query; when closed, it shows
  // the selected family's label (or empty if no selection).
  const displayValue = open ? query : (selected ? labelOf(selected) : '');

  const filtered = useMemo(() => {
    const q = (open ? query : '').trim().toLowerCase();
    // No query → show this level's options (cascading-style picking)
    if (!q) return options;
    // Active query → search across the wider list if provided, else this level
    const source = (searchAll && searchAll.length) ? searchAll : options;
    return source.filter(o =>
      (o.name || '').toLowerCase().includes(q) ||
      String(o.num || '').toLowerCase().includes(q)
    );
  }, [options, searchAll, query, open]);

  useEffect(() => { setActiveIdx(0); }, [query, open]);

  const handleSelect = (id) => {
    onChange(id);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIdx(i => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = filtered[activeIdx];
      if (pick) handleSelect(pick.id);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        placeholder={placeholder}
        onFocus={() => { setQuery(''); setOpen(true); }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => { setOpen(false); setQuery(''); }, 150);
        }}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        style={{ paddingLeft: value ? 28 : undefined }}
      />
      {value && !open && (
        <button
          type="button"
          onMouseDown={e => { e.preventDefault(); onChange(''); }}
          title="נקה"
          style={{
            position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-3)', fontSize: 16, lineHeight: 1, padding: 2,
          }}
        >×</button>
      )}
      {open && filtered.length > 0 && (
        <div
          onMouseDown={() => { if (blurTimer.current) clearTimeout(blurTimer.current); }}
          style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            right: 0, left: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            maxHeight: 240,
            overflowY: 'auto',
            zIndex: 20,
            boxShadow: 'var(--shadow-md)',
            fontSize: 13,
          }}
        >
          {filtered.map((f, i) => (
            <div
              key={f.id}
              onMouseDown={e => { e.preventDefault(); handleSelect(f.id); }}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: i === activeIdx ? 'var(--bg-elevated)' : 'transparent',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
                display: 'flex', gap: 8, alignItems: 'center',
              }}
            >
              {f.num && <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: 12, minWidth: 50 }}>{f.num}</span>}
              <span>{f.name || '—'}</span>
            </div>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', right: 0, left: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 12px', zIndex: 20,
          boxShadow: 'var(--shadow-md)', fontSize: 12, color: 'var(--text-3)',
        }}>
          לא נמצאו התאמות
        </div>
      )}
    </div>
  );
}
