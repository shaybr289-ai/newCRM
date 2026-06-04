import { useState, useEffect } from 'react';
import { useLookups, useSaveLookup } from '../../hooks/useLookups';

function ListEditor({ title, description, items, onSave, readOnly, isPending }) {
  const [list, setList] = useState(items);
  const [editIdx, setEditIdx] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [dragIdx, setDragIdx] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setList(items); setDirty(false); }, [items]);

  const update = (next) => { setList(next); setDirty(true); };

  const add = () => {
    const v = newValue.trim().replace(/\s+/g, '_');
    const l = newLabel.trim();
    if (!v || !l) return;
    if (list.find(([x]) => x === v)) { alert('ערך זה כבר קיים ברשימה'); return; }
    update([...list, [v, l]]);
    setNewValue(''); setNewLabel('');
  };

  const remove = (idx) => update(list.filter((_, i) => i !== idx));

  const startEdit = (idx) => {
    setEditIdx(idx);
    setEditValue(list[idx][0]);
    setEditLabel(list[idx][1]);
  };

  const confirmEdit = () => {
    update(list.map((item, i) => i === editIdx ? [editValue.trim(), editLabel.trim()] : item));
    setEditIdx(null);
  };

  const handleDrop = (targetIdx) => {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const next = [...list];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved);
    update(next);
    setDragIdx(null);
  };

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h3>
          {description && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-2)' }}>{description}</p>}
        </div>
        {!readOnly && (
          <button
            className="btn btn-primary"
            onClick={() => onSave(list)}
            disabled={isPending || !dirty}
            style={{ fontSize: 12, padding: '6px 16px', opacity: dirty ? 1 : 0.5 }}
          >
            {isPending ? 'שומר...' : 'שמור שינויים'}
          </button>
        )}
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)' }}>
              <th style={{ width: 32, padding: '8px 10px', borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)' }}></th>
              <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>ערך (מזהה)</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>תווית תצוגה</th>
              {!readOnly && <th style={{ width: 110, borderBottom: '1px solid var(--border)' }}></th>}
            </tr>
          </thead>
          <tbody>
            {list.map(([v, l], idx) => (
              <tr
                key={`${v}-${idx}`}
                draggable={!readOnly && editIdx !== idx}
                onDragStart={() => setDragIdx(idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(idx)}
                style={{
                  background: dragIdx === idx ? 'var(--accent-light)' : '',
                  borderBottom: '1px solid var(--border-light)',
                  transition: 'background 0.1s',
                }}
              >
                <td style={{ padding: '8px 10px', color: 'var(--text-3)', cursor: readOnly ? 'default' : 'grab', fontSize: 16, textAlign: 'center' }}>⠿</td>
                {editIdx === idx ? (
                  <>
                    <td style={{ padding: '4px 8px' }}>
                      <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{ fontSize: 12, padding: '5px 8px' }} dir="ltr" />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <input value={editLabel} onChange={e => setEditLabel(e.target.value)} style={{ fontSize: 13, padding: '5px 8px' }} autoFocus />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-primary" onClick={confirmEdit} style={{ fontSize: 11, padding: '4px 10px' }}>אשר</button>
                        <button className="btn btn-ghost" onClick={() => setEditIdx(null)} style={{ fontSize: 11, padding: '4px 8px' }}>ביטול</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '8px 12px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-2)' }}>{v}</td>
                    <td style={{ padding: '8px 12px', fontSize: 13 }}>{l}</td>
                    {!readOnly && (
                      <td style={{ padding: '4px 8px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="tbl-action-btn tbl-action-edit" onClick={() => startEdit(idx)} style={{ fontSize: 11, padding: '3px 8px' }}>
                            <i className="ti ti-edit" /> ערוך
                          </button>
                          <button className="tbl-action-btn tbl-action-delete" onClick={() => remove(idx)} style={{ fontSize: 11, padding: '3px 8px' }}>
                            <i className="ti ti-trash" /> מחק
                          </button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={readOnly ? 3 : 4} style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>אין פריטים ברשימה</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3, color: 'var(--text-2)' }}>ערך (מזהה — באנגלית)</label>
            <input
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="net45"
              dir="ltr"
              style={{ fontSize: 12, padding: '6px 10px', width: 120 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3, color: 'var(--text-2)' }}>תווית תצוגה</label>
            <input
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder="שוטף+45"
              style={{ fontSize: 13, padding: '6px 10px' }}
            />
          </div>
          <button className="btn btn-primary" onClick={add} style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            <i className="ti ti-plus" /> הוסף פריט
          </button>
        </div>
      )}
    </div>
  );
}

export default function LookupsTab({ readOnly }) {
  const { clientTypes, paymentTerms, customerStatuses, isLoading } = useLookups();
  const { saveClientTypes, savePaymentTerms, saveCustomerStatuses, isPending } = useSaveLookup();

  if (isLoading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>טוען...</div>;

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 28, lineHeight: 1.6 }}>
        ניהול רשימות ה-dropdown המשותפות בכל המסכים. שינויים נשמרים ב-DB ומתעדכנים מיידית לכל המשתמשים.
        <br />
        <strong>ערך (מזהה)</strong> — נשמר ב-DB (לא לשנות לרשומות קיימות). <strong>תווית תצוגה</strong> — מה שמשתמשים רואים.
      </p>

      <ListEditor
        title="סוגי לקוחות"
        description="מוצג בטופס יצירת/עריכת לקוח"
        items={clientTypes}
        onSave={saveClientTypes}
        readOnly={readOnly}
        isPending={isPending}
      />

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 28px' }} />

      <ListEditor
        title="תנאי תשלום"
        description="מוצג בטופס לקוח — תנאים מסחריים"
        items={paymentTerms}
        onSave={savePaymentTerms}
        readOnly={readOnly}
        isPending={isPending}
      />

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 28px' }} />

      <ListEditor
        title="סטטוסים"
        description="משמש ללקוחות, אנשי קשר, פריטי לקוח והסכמי שירות"
        items={customerStatuses}
        onSave={saveCustomerStatuses}
        readOnly={readOnly}
        isPending={isPending}
      />
    </div>
  );
}
