import { useState, useMemo } from 'react';
import {
  useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
  useFamilies, useCreateFamily, useUpdateFamily, useDeleteFamily, useReorderFamilies,
  useFamilyLevels, useCreateFamilyLevel, useUpdateFamilyLevel, useDeleteFamilyLevel,
} from '../../hooks/useDataManagement';
import {
  computeFamilyDepth, buildHierarchyTree, getDescendantFamilyIds,
  getSiblings, getNextChildOrder, formatChildNum, buildReorderUpdates,
  getEffectiveCategoryId,
} from '../../utils/familyHierarchy';
import './Hierarchy.css';

const FAMILY_TYPES = [['onetime', 'חד"פ'], ['recurring', 'שוטף']];

export default function HierarchyTab({ readOnly = false }) {
  const { data: catData } = useCategories();
  const { data: famData } = useFamilies();
  const { data: levelData } = useFamilyLevels();
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();
  const createFam = useCreateFamily();
  const updateFam = useUpdateFamily();
  const deleteFam = useDeleteFamily();
  const reorderMut = useReorderFamilies();

  const categories = catData?.data || [];
  const families = famData?.data || [];
  const levelDefs = levelData?.data || [];

  const tree = useMemo(() => buildHierarchyTree(categories, families), [categories, families]);

  // Collapse state — default: everything expanded.
  const [collapsed, setCollapsed] = useState(new Set());
  const toggle = (id) => setCollapsed(p => {
    const n = new Set(p);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  // Edit state — modal for adding/editing a node.
  const [edit, setEdit] = useState(null);
  // edit shape: { kind: 'category'|'family', mode: 'create'|'edit', data: {...}, parent?: {kind, id, family_type?} }
  const [del, setDel] = useState(null);
  const [showLevelDefs, setShowLevelDefs] = useState(false);

  // Strip tree-only fields (children/families/type) before sending to server.
  const stripFamily = ({ children, ...rest }) => rest;
  const stripCategory = ({ families: _f, type: _t, ...rest }) => rest;

  const openCreateCategory = () => setEdit({
    kind: 'category', mode: 'create',
    data: { num: '', name: '', description: '' },
  });
  const openEditCategory = (cat) => setEdit({
    kind: 'category', mode: 'edit',
    data: stripCategory(cat),
  });
  const openCreateRootFamily = (catId) => {
    const nextOrder = getNextChildOrder(null, catId, families);
    setEdit({
      kind: 'family', mode: 'create',
      data: { num: '', name: '', family_type: 'onetime', parent_cat_id: catId, parent_family_id: null, level_label: '', display_order: nextOrder },
    });
  };
  const openCreateSubFamily = (parentFamily) => {
    const nextOrder = getNextChildOrder(parentFamily.id, null, families);
    const autoNum = formatChildNum(parentFamily.num, nextOrder) || '';
    setEdit({
      kind: 'family', mode: 'create',
      data: {
        num: autoNum,
        name: '',
        family_type: parentFamily.family_type || 'onetime',
        parent_cat_id: null,
        parent_family_id: parentFamily.id,
        level_label: '',
        display_order: nextOrder,
      },
    });
  };
  const openEditFamily = (fam) => setEdit({
    kind: 'family', mode: 'edit',
    data: stripFamily(fam),
  });

  const handleSave = async () => {
    if (!edit.data.name?.trim()) { alert('שם הוא שדה חובה'); return; }
    try {
      if (edit.kind === 'category') {
        if (edit.mode === 'edit') await updateCat.mutateAsync({ id: edit.data.id, ...edit.data });
        else await createCat.mutateAsync(edit.data);
      } else {
        if (edit.mode === 'edit') await updateFam.mutateAsync({ id: edit.data.id, ...edit.data });
        else await createFam.mutateAsync(edit.data);
      }
      setEdit(null);
    } catch (err) { alert('שגיאה בשמירה: ' + (err.message || err)); }
  };

  const handleDelete = async () => {
    if (!del) return;
    try {
      if (del.kind === 'category') {
        const used = families.some(f => f.parent_cat_id === del.data.id);
        if (used) { alert('לא ניתן למחוק קטגוריה עם משפחות משויכות. הסר את המשפחות תחילה.'); return; }
        await deleteCat.mutateAsync(del.data.id);
      } else {
        const hasChildren = families.some(f => f.parent_family_id === del.data.id);
        if (hasChildren) { alert('לא ניתן למחוק משפחה עם תת־משפחות. מחק או העבר את הצאצאים תחילה.'); return; }
        await deleteFam.mutateAsync(del.data.id);
      }
      setDel(null);
    } catch (err) { alert('שגיאה במחיקה: ' + (err.message || err)); }
  };

  const renderFamilyNode = (fam) => {
    const id = `fam:${fam.id}`;
    const isCollapsed = collapsed.has(id);
    const depth = computeFamilyDepth(fam, families);
    const levelLabel = fam.level_label?.trim() || (levelDefs.find(d => d.depth === depth)?.name) || `רמה ${depth}`;
    const headerClass = depth === 1 ? 'is-family-root' : 'is-family-deep';
    const isDragging = dragState?.id === fam.id;
    const isDropTarget = dragOverId === fam.id;

    return (
      <div className="hier-node" key={fam.id}>
        <div
          className={`hier-node-header ${headerClass} ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
          draggable
          onDragStart={(e) => startDrag(e, fam, fam.parent_family_id, fam.parent_cat_id)}
          onDragOver={(e) => allowDrop(e, fam, fam.parent_family_id, fam.parent_cat_id)}
          onDragLeave={() => { if (dragOverId === fam.id) setDragOverId(null); }}
          onDrop={(e) => handleDrop(e, fam, fam.parent_family_id, fam.parent_cat_id)}
          onDragEnd={endDrag}
        >
          <span className="hier-drag-handle" title="גרור לשינוי סדר">⋮⋮</span>
          <button
            className={`hier-node-toggle ${fam.children?.length ? '' : 'empty'}`}
            onClick={() => toggle(id)}
            title={isCollapsed ? 'הרחב' : 'כווץ'}
          >{isCollapsed ? '+' : '−'}</button>
          <span className="hier-node-name">
            {fam.num && <bdi className="hier-num" style={{ color: '#F59E0B' }}>{fam.num}</bdi>}
            <bdi>{fam.name}</bdi>
          </span>
          <span className="hier-node-meta">· {levelLabel} · {fam.family_type === 'recurring' ? 'שוטף' : 'חד"פ'}</span>
          {!readOnly && (
            <span className="hier-node-actions">
              <button className="hier-node-action" title="הוסף תת־משפחה" onClick={() => openCreateSubFamily(fam)} aria-label="הוסף תת-משפחה"><i className="ti ti-plus" aria-hidden="true" /></button>
              <button className="hier-node-action" title="ערוך" onClick={() => openEditFamily(fam)} aria-label="ערוך"><i className="ti ti-edit" aria-hidden="true" /></button>
              <button className="hier-node-action danger" title="מחק" onClick={() => setDel({ kind: 'family', data: fam })} aria-label="מחק"><i className="ti ti-trash" aria-hidden="true" /></button>
            </span>
          )}
        </div>
        {!isCollapsed && fam.children?.length > 0 && (
          <div className="hier-children">
            {fam.children.map(renderFamilyNode)}
          </div>
        )}
      </div>
    );
  };

  const renderCategoryNode = (cat) => {
    const id = `cat:${cat.id}`;
    const isCollapsed = collapsed.has(id);
    return (
      <div className="hier-node" key={cat.id}>
        <div className="hier-node-header is-category">
          <button
            className={`hier-node-toggle ${cat.families?.length ? '' : 'empty'}`}
            onClick={() => toggle(id)}
            title={isCollapsed ? 'הרחב' : 'כווץ'}
          >{isCollapsed ? '+' : '−'}</button>
          <span className="hier-node-name">
            <span className="hier-cat-icon"><i className="ti ti-folder" aria-hidden="true" /></span>
            {cat.num && <bdi className="hier-num" style={{ color: '#92400E' }}>{cat.num}</bdi>}
            <bdi>{cat.name}</bdi>
          </span>
          <span className="hier-node-meta">· קטגוריה</span>
          {!readOnly && (
            <span className="hier-node-actions">
              <button className="hier-node-action" title="הוסף משפחת מוצר" onClick={() => openCreateRootFamily(cat.id)} aria-label="הוסף משפחת מוצר"><i className="ti ti-plus" aria-hidden="true" /></button>
              <button className="hier-node-action" title="ערוך" onClick={() => openEditCategory(cat)} aria-label="ערוך"><i className="ti ti-edit" aria-hidden="true" /></button>
              <button className="hier-node-action danger" title="מחק" onClick={() => setDel({ kind: 'category', data: cat })} aria-label="מחק"><i className="ti ti-trash" aria-hidden="true" /></button>
            </span>
          )}
        </div>
        {!isCollapsed && cat.families?.length > 0 && (
          <div className="hier-children">
            {cat.families.map(renderFamilyNode)}
          </div>
        )}
      </div>
    );
  };

  // ── Drag & drop reordering (siblings only) ─────────────────────────────────
  // dragState: { id, parent_family_id, parent_cat_id }
  const [dragState, setDragState] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const startDrag = (e, fam, parentFamilyId, parentCatId) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fam.id);
    setDragState({ id: fam.id, parent_family_id: parentFamilyId || null, parent_cat_id: parentCatId || null });
  };

  const allowDrop = (e, targetFam, targetParentFamilyId, targetParentCatId) => {
    if (!dragState) return;
    if (dragState.id === targetFam.id) return;
    const samePF = (dragState.parent_family_id || null) === (targetParentFamilyId || null);
    const samePC = (dragState.parent_cat_id || null) === (targetParentCatId || null);
    if (!samePF || !samePC) return; // only same parent
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== targetFam.id) setDragOverId(targetFam.id);
  };

  const endDrag = () => { setDragState(null); setDragOverId(null); };

  const handleDrop = async (e, targetFam, targetParentFamilyId, targetParentCatId) => {
    e.preventDefault();
    e.stopPropagation();
    const ds = dragState;
    setDragOverId(null);
    setDragState(null);
    if (!ds) return;
    const samePF = (ds.parent_family_id || null) === (targetParentFamilyId || null);
    const samePC = (ds.parent_cat_id || null) === (targetParentCatId || null);
    if (!samePF || !samePC) return;
    if (ds.id === targetFam.id) return;

    const siblings = getSiblings(targetParentFamilyId, targetParentCatId, families)
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || (a.name || '').localeCompare(b.name || '', 'he'));
    const dragged = siblings.find(s => s.id === ds.id);
    if (!dragged) return;
    const without = siblings.filter(s => s.id !== ds.id);
    const insertIdx = without.findIndex(s => s.id === targetFam.id);
    if (insertIdx < 0) return;
    without.splice(insertIdx, 0, dragged);

    const orderedIds = without.map(s => s.id);
    const parent = targetParentFamilyId ? families.find(f => f.id === targetParentFamilyId) : null;
    const updates = buildReorderUpdates(parent, orderedIds, families);
    if (updates.length === 0) return;

    try {
      await reorderMut.mutateAsync(updates);
    } catch (err) {
      alert('שגיאה בשינוי סדר: ' + (err.message || err));
    }
  };

  // Allowed parent families when editing a family — exclude self + descendants.
  const allowedParentFamilies = useMemo(() => {
    if (!edit || edit.kind !== 'family') return families;
    if (edit.mode !== 'edit') return families;
    const blocked = getDescendantFamilyIds(edit.data.id, families);
    blocked.add(edit.data.id);
    return families.filter(f => !blocked.has(f.id));
  }, [edit, families]);

  const totalNodes = categories.length + families.length;

  return (
    <div>
      <div className="hier-toolbar">
        <h3>היררכיית קטגוריות ומשפחות מוצר ({totalNodes} צמתים)</h3>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          ⋮⋮ גרור משפחה כדי לשנות סדר (המספור יתעדכן אוטומטית)
        </span>
        {!readOnly && (
          <>
            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setShowLevelDefs(true)}>
              הגדרת שמות רמות
            </button>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={openCreateCategory}>
              + קטגוריה חדשה
            </button>
          </>
        )}
      </div>

      <div className="hier-canvas">
        {tree.categories.length === 0 && tree.orphans.length === 0 ? (
          <div className="hier-empty">
            אין קטגוריות עדיין.<br />
            לחץ על "+ קטגוריה חדשה" כדי להתחיל.
          </div>
        ) : (
          <div className="hier-roots">
            {tree.categories.map(renderCategoryNode)}
            {tree.orphans.length > 0 && (
              <div className="hier-node">
                <div className="hier-node-header" style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}>
                  <span className="hier-node-toggle empty"></span>
                  <span className="hier-node-name"><i className="ti ti-alert-triangle" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> משפחות ללא שיוך</span>
                  <span className="hier-node-meta">· {tree.orphans.length} משפחות</span>
                </div>
                <div className="hier-children">
                  {tree.orphans.map(renderFamilyNode)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit/create modal */}
      {edit && (
        <div className="modal-overlay" onClick={() => setEdit(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>
                {edit.mode === 'edit' ? 'עריכת ' : 'הוספת '}
                {edit.kind === 'category' ? 'קטגוריה' : 'משפחת מוצר'}
              </h2>
              <button className="modal-close" onClick={() => setEdit(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label>מספר</label>
                <input value={edit.data.num || ''} onChange={e => setEdit(p => ({ ...p, data: { ...p.data, num: e.target.value } }))} dir="ltr" />
              </div>
              <div className="form-field">
                <label>שם *</label>
                <input autoFocus value={edit.data.name || ''} onChange={e => setEdit(p => ({ ...p, data: { ...p.data, name: e.target.value } }))} />
              </div>

              {edit.kind === 'category' && (
                <div className="form-field">
                  <label>תיאור</label>
                  <textarea rows={2} value={edit.data.description || ''} onChange={e => setEdit(p => ({ ...p, data: { ...p.data, description: e.target.value } }))} />
                </div>
              )}

              {edit.kind === 'family' && (
                <>
                  <div className="form-field">
                    <label>סוג משפחה</label>
                    <select value={edit.data.family_type || 'onetime'} onChange={e => setEdit(p => ({ ...p, data: { ...p.data, family_type: e.target.value } }))}>
                      {FAMILY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>קטגוריית אב</label>
                    {edit.data.parent_family_id ? (() => {
                      const effId = getEffectiveCategoryId(edit.data, families);
                      const eff = effId ? categories.find(c => c.id === effId) : null;
                      return (
                        <input
                          readOnly
                          value={eff ? `${eff.num ? `${eff.num} — ` : ''}${eff.name}` : '— ללא קטגוריה (תורש דרך משפחת אב) —'}
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)' }}
                          title="הקטגוריה נגזרת ממשפחת האב"
                        />
                      );
                    })() : (
                      <select
                        value={edit.data.parent_cat_id || ''}
                        onChange={e => setEdit(p => ({
                          ...p,
                          data: { ...p.data, parent_cat_id: e.target.value || null },
                        }))}
                      >
                        <option value="">-- ללא --</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.num ? `${c.num} — ` : ''}{c.name}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="form-field">
                    <label>משפחת אב (לתת־משפחה)</label>
                    <select
                      value={edit.data.parent_family_id || ''}
                      onChange={e => {
                        const pid = e.target.value;
                        const parent = pid ? families.find(f => f.id === pid) : null;
                        setEdit(p => ({
                          ...p,
                          data: {
                            ...p.data,
                            parent_family_id: pid || null,
                            parent_cat_id: parent ? null : p.data.parent_cat_id,
                            family_type: parent?.family_type || p.data.family_type,
                          },
                        }));
                      }}
                    >
                      <option value="">-- ללא (משפחה ראשית) --</option>
                      {allowedParentFamilies.map(f => {
                        const d = computeFamilyDepth(f, families);
                        return <option key={f.id} value={f.id}>{'— '.repeat(d - 1)}{f.num ? `${f.num} ` : ''}{f.name}</option>;
                      })}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>תווית רמה (אופציונלי)</label>
                    <input
                      value={edit.data.level_label || ''}
                      onChange={e => setEdit(p => ({ ...p, data: { ...p.data, level_label: e.target.value } }))}
                      placeholder='לדוגמה: "תת־קבוצה טכנית" (דורסת את שם הרמה הגלובלי)'
                    />
                  </div>
                </>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>ביטול</button>
                <button type="button" className="btn btn-primary" onClick={handleSave}>
                  {edit.mode === 'edit' ? 'עדכון' : 'יצירה'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {del && (
        <div className="modal-overlay" onClick={() => setDel(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>
              מחיקת {del.kind === 'category' ? 'קטגוריה' : 'משפחה'}
            </h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 20 }}>
              האם למחוק את <strong>{del.data.name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setDel(null)}>ביטול</button>
              <button className="btn btn-danger" onClick={handleDelete}>מחק</button>
            </div>
          </div>
        </div>
      )}

      {/* Level definitions modal */}
      {showLevelDefs && <LevelDefsModal onClose={() => setShowLevelDefs(false)} levelDefs={levelDefs} />}
    </div>
  );
}

// ─── Level definitions modal ─────────────────────────────────────────────
function LevelDefsModal({ onClose, levelDefs }) {
  const createMut = useCreateFamilyLevel();
  const updateMut = useUpdateFamilyLevel();
  const deleteMut = useDeleteFamilyLevel();
  const [newName, setNewName] = useState('');

  const sorted = [...levelDefs].sort((a, b) => a.depth - b.depth);
  const nextDepth = sorted.length ? sorted[sorted.length - 1].depth + 1 : 1;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createMut.mutateAsync({ depth: nextDepth, name: newName.trim() });
    setNewName('');
  };

  const handleRename = async (def, name) => {
    if (!name.trim() || name === def.name) return;
    await updateMut.mutateAsync({ id: def.id, depth: def.depth, name: name.trim() });
  };

  const handleDelete = async (def) => {
    if (!confirm(`למחוק את הגדרת רמה ${def.depth} (${def.name})?`)) return;
    await deleteMut.mutateAsync(def.id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h2>הגדרת שמות רמות בהיררכיה</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 12 }}>
            הגדר שם לכל רמת היררכיה. השם הזה יוצג בכל מקום שמופיעה משפחה ברמה זו (אלא אם נקבע שם מותאם לצומת ספציפי).
          </p>
          <table className="level-defs-table">
            <thead>
              <tr><th style={{ width: 60 }}>רמה</th><th>שם הרמה</th><th style={{ width: 60 }}></th></tr>
            </thead>
            <tbody>
              {sorted.map(def => (
                <LevelDefRow key={def.id} def={def} onRename={(n) => handleRename(def, n)} onDelete={() => handleDelete(def)} />
              ))}
              <tr>
                <td style={{ color: 'var(--text-3)' }}>{nextDepth}</td>
                <td>
                  <input
                    placeholder="שם רמה חדשה"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                  />
                </td>
                <td>
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 8px' }} onClick={handleAdd} disabled={createMut.isPending}>+</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LevelDefRow({ def, onRename, onDelete }) {
  const [val, setVal] = useState(def.name);
  return (
    <tr>
      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{def.depth}</td>
      <td>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => onRename(val)}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
        />
      </td>
      <td><button className="hier-node-action danger" onClick={onDelete} title="מחק"><i className="ti ti-trash" aria-hidden="true" /></button></td>
    </tr>
  );
}
