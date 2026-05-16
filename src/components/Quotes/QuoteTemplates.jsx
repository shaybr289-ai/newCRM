import { useState } from 'react';
import { useQuoteTemplates, useSaveQuoteTemplates, mkEmptyTemplate, DEFAULT_COSTS_COLS } from '../../hooks/useQuoteTemplates';
import { Icon, ICONS } from '../../utils/icons';
import '../Customers/CustomerModal.css';
import './QuoteEditor.css';

const EDITOR_TABS = [
  { id: 'general', label: 'כללי' },
  { id: 'headers', label: 'כותרות' },
  { id: 'sections', label: 'חלקים' },
  { id: 'costs', label: 'טבלת עלויות' },
];

export default function QuoteTemplates({ onBack }) {
  const { data: templates = [], isLoading } = useQuoteTemplates();
  const saveMut = useSaveQuoteTemplates();
  const [editTmpl, setEditTmpl] = useState(null);
  const [editorTab, setEditorTab] = useState('general');
  const [confirmDel, setConfirmDel] = useState(null);

  const saveTemplate = async (tmpl) => {
    const updated = tmpl.id && templates.find(t => t.id === tmpl.id)
      ? templates.map(t => t.id === tmpl.id ? tmpl : t)
      : [...templates, tmpl];
    await saveMut.mutateAsync(updated);
    setEditTmpl(null);
  };

  const deleteTemplate = async (id) => {
    await saveMut.mutateAsync(templates.filter(t => t.id !== id));
    setConfirmDel(null);
  };

  const upd = (k, v) => setEditTmpl(p => ({ ...p, [k]: v }));
  const updHeader = (k, v) => setEditTmpl(p => ({ ...p, header: { ...p.header, [k]: v } }));
  const updFooter = (k, v) => setEditTmpl(p => ({ ...p, footer: { ...p.footer, [k]: v } }));

  // ── Template List ────────────────────────────────────────────────────────
  if (!editTmpl) {
    return (
      <div className="animate-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">תבניות הצעות מחיר</h1>
            <p className="page-subtitle">ניהול תבניות לבניית הצעות מחיר</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {onBack && <button className="btn btn-ghost" onClick={onBack}><Icon svg={ICONS.back} size={16} /> חזרה להצעות</button>}
            <button className="btn btn-primary" onClick={() => { setEditTmpl(mkEmptyTemplate()); setEditorTab('general'); }}>
              <Icon svg={ICONS.plus} size={16} /> תבנית חדשה
            </button>
          </div>
        </div>

        <div className="table-card">
          {isLoading ? <div className="table-loading">טוען...</div> : (
            <table>
              <thead><tr>
                <th>שם תבנית</th>
                <th style={{ width: 100 }}>עיצוב</th>
                <th style={{ width: 100 }}>חלקים</th>
                <th style={{ width: 100 }}>עמודות</th>
                <th style={{ width: 110 }}>תאריך יצירה</th>
                <th style={{ width: 120 }}>פעולות</th>
              </tr></thead>
              <tbody>
                {templates.map(t => {
                  const enabledSections = (t.sections || []).filter(s => s.enabled).length;
                  const totalSections = (t.sections || []).length;
                  const enabledCols = (t.costsTable?.columns || []).filter(c => c.enabled).length;
                  return (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => { setEditTmpl({ ...t }); setEditorTab('general'); }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--accent-light)'}
                      onMouseOut={e => e.currentTarget.style.background = ''}>
                      <td style={{ fontWeight: 600 }}>{t.name || '(ללא שם)'}</td>
                      <td>
                        {t.layout === 'compact'
                          ? <span className="badge badge-info">קומפקטי</span>
                          : <span className="badge badge-accent">רגילה</span>}
                      </td>
                      <td>{enabledSections} / {totalSections}</td>
                      <td>{enabledCols}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{t.createdAt || '—'}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="table-actions">
                          <button className="action-btn edit" onClick={() => { setEditTmpl({ ...t }); setEditorTab('general'); }} title="ערוך" aria-label="ערוך תבנית"><i className="ti ti-edit" aria-hidden="true" /></button>
                          <button className="action-btn delete" onClick={() => setConfirmDel(t)} title="מחק" aria-label="מחק תבנית"><i className="ti ti-trash" aria-hidden="true" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {templates.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>אין תבניות. צור תבנית חדשה.</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        {confirmDel && (
          <div className="modal-overlay" onClick={() => setConfirmDel(null)}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, padding: 24 }}>
              <h3 style={{ marginBottom: 12 }}>מחיקת תבנית</h3>
              <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>האם למחוק את <strong>{confirmDel.name}</strong>?</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>ביטול</button>
                <button className="btn btn-danger" onClick={() => deleteTemplate(confirmDel.id)}>מחק</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Template Editor ──────────────────────────────────────────────────────
  return (
    <div className="animate-in">
      <div className="qe-topbar">
        <button className="btn btn-ghost" onClick={() => setEditTmpl(null)}>
          <Icon svg={ICONS.back} size={16} /> חזרה לרשימה
        </button>
        <div className="qe-topbar-title">
          <h1>{editTmpl.id && templates.find(t => t.id === editTmpl.id) ? 'עריכת תבנית' : 'תבנית חדשה'}</h1>
        </div>
        <button className="btn btn-primary" onClick={() => saveTemplate(editTmpl)} disabled={saveMut.isPending}>
          {saveMut.isPending ? 'שומר...' : 'שמור תבנית'}
        </button>
      </div>

      <div className="qe-sections">
        {EDITOR_TABS.map(tab => (
          <button key={tab.id} className={`qe-section-tab ${editorTab === tab.id ? 'active' : ''}`} onClick={() => setEditorTab(tab.id)}>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="qe-body card">
        {/* General */}
        {editorTab === 'general' && (
          <div className="form-grid">
            <div className="form-field">
              <label>שם תבנית *</label>
              <input value={editTmpl.name || ''} onChange={e => upd('name', e.target.value)} autoFocus />
            </div>
            <div className="form-field">
              <label>עיצוב</label>
              <select value={editTmpl.layout || 'standard'} onChange={e => upd('layout', e.target.value)}>
                <option value="standard">רגילה</option>
                <option value="compact">קומפקטי</option>
              </select>
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>הערות פנימיות</label>
              <textarea value={editTmpl.internalNotes || ''} onChange={e => upd('internalNotes', e.target.value)} rows={3} />
            </div>
          </div>
        )}

        {/* Headers & Footer */}
        {editorTab === 'headers' && (
          <div>
            <h3 className="form-section-title">כותרת עליונה</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>שם החברה</label>
                <input value={editTmpl.header?.companyName || ''} onChange={e => updHeader('companyName', e.target.value)} />
              </div>
              <div className="form-field">
                <label>תגית / סלוגן</label>
                <input value={editTmpl.header?.tagline || ''} onChange={e => updHeader('tagline', e.target.value)} />
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>טקסט נוסף</label>
                <input value={editTmpl.header?.extraText || ''} onChange={e => updHeader('extraText', e.target.value)} />
              </div>
              <div className="form-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={editTmpl.header?.showLogo || false} onChange={e => updHeader('showLogo', e.target.checked)} style={{ width: 16, height: 16 }} />
                  הצג לוגו
                </label>
              </div>
              {editTmpl.header?.showLogo && (
                <>
                  <div className="form-field">
                    <label>יישור לוגו</label>
                    <select value={editTmpl.header?.logoAlign || 'right'} onChange={e => updHeader('logoAlign', e.target.value)}>
                      <option value="right">ימין</option>
                      <option value="center">מרכז</option>
                      <option value="left">שמאל</option>
                    </select>
                  </div>
                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label>קובץ לוגו</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {editTmpl.header?.logoData && (
                        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: '#fff' }}>
                          <img src={editTmpl.header.logoData} alt="לוגו" style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain' }} />
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) { alert('הקובץ גדול מדי. מקסימום 2MB'); return; }
                            const reader = new FileReader();
                            reader.onload = (ev) => updHeader('logoData', ev.target.result);
                            reader.readAsDataURL(file);
                          };
                          input.click();
                        }}>
                          {editTmpl.header?.logoData ? 'החלף לוגו' : 'העלה לוגו'}
                        </button>
                        {editTmpl.header?.logoData && (
                          <button type="button" className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--danger)' }}
                            onClick={() => updHeader('logoData', '')}>
                            הסר לוגו
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>PNG, JPG, SVG — עד 2MB</div>
                  </div>
                </>
              )}
            </div>

            <h3 className="form-section-title">פרטי קשר</h3>
            <div className="form-grid">
              <div className="form-field">
                <label>טלפון</label>
                <input value={editTmpl.header?.social?.phone || ''} onChange={e => setEditTmpl(p => ({ ...p, header: { ...p.header, social: { ...p.header.social, phone: e.target.value } } }))} dir="ltr" />
              </div>
              <div className="form-field">
                <label>אי-מייל</label>
                <input value={editTmpl.header?.social?.email || ''} onChange={e => setEditTmpl(p => ({ ...p, header: { ...p.header, social: { ...p.header.social, email: e.target.value } } }))} dir="ltr" />
              </div>
              <div className="form-field">
                <label>אתר אינטרנט</label>
                <input value={editTmpl.header?.social?.website || ''} onChange={e => setEditTmpl(p => ({ ...p, header: { ...p.header, social: { ...p.header.social, website: e.target.value } } }))} dir="ltr" />
              </div>
            </div>

            <h3 className="form-section-title">כותרת תחתונה</h3>
            <div className="form-grid">
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>טקסט תחתון</label>
                <input value={editTmpl.footer?.text || ''} onChange={e => updFooter('text', e.target.value)} />
              </div>
              <div className="form-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={editTmpl.footer?.showPageNum || false} onChange={e => updFooter('showPageNum', e.target.checked)} style={{ width: 16, height: 16 }} />
                  הצג מספר עמוד
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Sections */}
        {editorTab === 'sections' && (
          <div>
            <h3 style={{ marginBottom: 12 }}>חלקי התבנית</h3>
            <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 16 }}>הפעל/כבה חלקים והגדר תוכן ברירת מחדל</p>
            {(editTmpl.sections || []).map((sec, idx) => (
              <div key={sec.id} style={{ padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, background: sec.enabled ? '#fff' : '#F9FAFB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: sec.enabled ? 8 : 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                    <input type="checkbox" checked={sec.enabled} onChange={e => {
                      const secs = [...editTmpl.sections]; secs[idx] = { ...secs[idx], enabled: e.target.checked }; upd('sections', secs);
                    }} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                    {sec.title}
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{sec.type}</span>
                </div>
                {sec.enabled && sec.type !== 'costs' && sec.type !== 'signature' && (
                  <textarea value={sec.content || ''} onChange={e => {
                    const secs = [...editTmpl.sections]; secs[idx] = { ...secs[idx], content: e.target.value }; upd('sections', secs);
                  }} rows={2} placeholder="תוכן ברירת מחדל..." style={{ fontSize: 12 }} />
                )}
                {sec.enabled && sec.type === 'signature' && (
                  <div style={{ marginTop: 8 }}>
                    <div className="form-field">
                      <label>טקסט אישור</label>
                      <input value={sec.approvalText || 'אנו מאשרים בחתימתנו קבלת ההצעה לעיל ומסכימים לתנאיה'}
                        onChange={e => { const secs = [...editTmpl.sections]; secs[idx] = { ...secs[idx], approvalText: e.target.value }; upd('sections', secs); }}
                        style={{ fontSize: 13 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      {[['showName', 'חתימה / שם מלא'], ['showDate', 'תאריך'], ['showRole', 'תפקיד']].map(([key, label]) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                          <input type="checkbox" checked={sec[key] !== false} onChange={e => {
                            const secs = [...editTmpl.sections]; secs[idx] = { ...secs[idx], [key]: e.target.checked }; upd('sections', secs);
                          }} style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Costs Table */}
        {editorTab === 'costs' && (
          <div>
            <h3 style={{ marginBottom: 12 }}>עמודות טבלת עלויות</h3>
            <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 16 }}>בחר אילו עמודות יוצגו בטבלת העלויות</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(editTmpl.costsTable?.columns || []).map((col, idx) => (
                <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: col.enabled ? '#fff' : '#F9FAFB', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={col.enabled} onChange={e => {
                    const cols = [...editTmpl.costsTable.columns]; cols[idx] = { ...cols[idx], enabled: e.target.checked };
                    upd('costsTable', { ...editTmpl.costsTable, columns: cols });
                  }} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                  <span style={{ fontWeight: col.enabled ? 600 : 400, color: col.enabled ? 'var(--text-1)' : 'var(--text-3)' }}>{col.label}</span>
                </label>
              ))}
            </div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={editTmpl.costsTable?.showSubtotal !== false} onChange={e => upd('costsTable', { ...editTmpl.costsTable, showSubtotal: e.target.checked })} style={{ width: 16, height: 16 }} />
                הצג סכום ביניים
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={editTmpl.costsTable?.showVat !== false} onChange={e => upd('costsTable', { ...editTmpl.costsTable, showVat: e.target.checked })} style={{ width: 16, height: 16 }} />
                הצג מע"מ
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={editTmpl.costsTable?.showGrandTotal !== false} onChange={e => upd('costsTable', { ...editTmpl.costsTable, showGrandTotal: e.target.checked })} style={{ width: 16, height: 16 }} />
                הצג סה"כ כולל מע"מ
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
