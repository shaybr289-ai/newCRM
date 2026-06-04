import { useState, useRef, useMemo, useEffect } from 'react';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useBulkDeleteProducts, useFamilies, useCategories, useManufacturers } from '../../hooks/useProducts';
import { useFamilyLevels } from '../../hooks/useDataManagement';
import { getEffectiveCategoryId, sortSiblings } from '../../utils/familyHierarchy';
import FamilyCombobox from '../Layout/FamilyCombobox';
import { PRODUCTS_COLUMNS, EMPTY_PRODUCT, CURRENCIES, STATUS_OPTIONS } from '../../utils/constants';
import { Icon, ICONS } from '../../utils/icons';
import { exportToCSV, importCSV, findColumn } from '../../utils/exportCSV';
import { api } from '../../api/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import DataTable from '../Layout/DataTable';
import OwnerSelect from '../Layout/OwnerSelect';
import StatsBar from '../Layout/StatsBar';
import ModuleTopbar from '../Layout/ModuleTopbar';
import { usePerms } from '../../hooks/usePerms';
import DeleteConfirmModal from '../Layout/DeleteConfirmModal';
import '../Layout/EditorPage.css';
import '../Customers/CustomerModal.css';

export default function ProductsPage() {
  const { canView, canCreate, canEdit, canDelete, canUseButton } = usePerms('products');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterFamilyId, setFilterFamilyId] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [mfrDrop, setMfrDrop] = useState(false);
  const [mfrInput, setMfrInput] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showMovements, setShowMovements] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [importFile, setImportFile] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [importMapping, setImportMapping] = useState({});
  const [importHeaders, setImportHeaders] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const fileRef = useRef(null);
  const qc = useQueryClient();

  const { data, isLoading, error } = useProducts({ page, limit: 50, search, familyId: filterFamilyId });
  const { data: famData } = useFamilies();
  const { data: catData } = useCategories();
  const { data: mfrData } = useManufacturers();
  const { data: levelData } = useFamilyLevels();
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const deleteMut = useDeleteProduct();
  const bulkDeleteMut = useBulkDeleteProducts();

  const products = data?.data || [];
  const families = famData?.data || [];
  const categories = catData?.data || [];
  const manufacturers = mfrData?.data || [];
  const levelDefs = levelData?.data || [];

  const labelForDepth = (depth) => {
    const d = levelDefs.find(x => x.depth === depth);
    if (d?.name) return d.name;
    return depth === 1 ? 'משפחת מוצר' : `משפחת משנה רמה ${depth - 1}`;
  };

  // Build the chain root → leaf for the currently selected family_id.
  const familyChain = useMemo(() => {
    if (!editItem?.family_id) return [];
    const out = [];
    let cur = families.find(f => f.id === editItem.family_id);
    const seen = new Set();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      out.unshift(cur);
      if (!cur.parent_family_id) break;
      cur = families.find(f => f.id === cur.parent_family_id);
    }
    return out;
  }, [editItem?.family_id, families]);

  // Cascading dropdown levels for the editor: level 1 = top-level families;
  // level N>1 = children of the family selected at level N-1. Stop when no selection
  // OR the deepest selection has no children.
  const cascadingLevels = useMemo(() => {
    const levels = [];
    let options = sortSiblings(families.filter(f => !f.parent_family_id));
    let depth = 1;
    while (options.length > 0) {
      const selectedId = familyChain[depth - 1]?.id || '';
      levels.push({ depth, options, selectedId });
      if (!selectedId) break;
      const children = sortSiblings(families.filter(f => f.parent_family_id === selectedId));
      if (children.length === 0) break;
      options = children;
      depth++;
    }
    return levels;
  }, [families, familyChain]);

  const getFamilyName = (id) => { const f = families.find(f => f.id === id); return f ? `${f.num || ''} — ${f.name}` : '—'; };
  // Walk up the family chain (sub-family → parent family → … → root family) until we hit one with parent_cat_id.
  const getCatName = (famId) => {
    let f = families.find(f => f.id === famId);
    const seen = new Set();
    while (f && !f.parent_cat_id && f.parent_family_id && !seen.has(f.id)) {
      seen.add(f.id);
      f = families.find(x => x.id === f.parent_family_id);
    }
    if (!f?.parent_cat_id) return '—';
    const c = categories.find(c => c.id === f.parent_cat_id);
    return c ? c.name : '—';
  };

  const renderCell = (row, key) => {
    switch (key) {
      case 'family_id': return getFamilyName(row.family_id);
      case 'parent_cat': return row.parent_cat || getCatName(row.family_id);
      case 'product_type':
        return <span className={`badge ${row.product_type === 'recurring' ? 'badge-info' : 'badge-accent'}`}>
          {row.product_type === 'recurring' ? 'שוטף' : 'חד"פ'}</span>;
      case 'status':
        return <span className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
          {row.status === 'active' ? 'פעיל' : 'לא פעיל'}</span>;
      case 'unit_price':
      case 'sale_price':
        return row[key] ? `₪${Number(row[key]).toLocaleString()}` : '—';
      case 'last_purchase_date':
      case 'created_at':
        return row[key] ? new Date(row[key]).toLocaleDateString('he-IL') : '—';
      default: return row[key] || '—';
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const form = editItem;
    if (!form.name?.trim()) { alert('שם מוצר הוא שדה חובה'); return; }
    if (form.id) {
      await updateMut.mutateAsync({ id: form.id, ...form });
    } else {
      await createMut.mutateAsync(form);
    }
    setEditItem(null);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    await deleteMut.mutateAsync(confirmDel.id);
    if (editItem?.id === confirmDel.id) setEditItem(null);
    setConfirmDel(null);
  };

  const handleBulkDelete = async () => {
    await bulkDeleteMut.mutateAsync([...selectedIds]);
    setSelectedIds(new Set());
    setBulkConfirm(false);
  };

  const toggleSel = (id) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(p => p.size === products.length ? new Set() : new Set(products.map(p => p.id)));

  const upd = (k, v) => setEditItem(p => ({ ...p, [k]: v }));

  // ── Import/Export ────────────────────────────────────────────────────────
  const IMPORT_FIELDS = [
    { key: 'name', label: 'שם מוצר', required: true },
    { key: 'sku', label: 'מק"ט מוצר' },
    { key: 'status', label: 'סטטוס' },
    { key: 'family', label: 'משפחת מוצר' },
    { key: 'unitOfUse', label: 'יחידת שימוש' },
    { key: 'mfrSku', label: 'מק"ט יצרן' },
    { key: 'mfrName', label: 'שם יצרן' },
    { key: 'supplierSku', label: 'מק"ט ספק' },
    { key: 'supplierName', label: 'שם ספק' },
    { key: 'unitPrice', label: 'מחיר קנייה' },
    { key: 'lastPurchaseDate', label: 'תאריך קנייה אחרון' },
    { key: 'salePrice', label: 'מחיר מכירה' },
    { key: 'stockQty', label: 'כמות במלאי' },
  ];

  const handleExport = () => {
    const exportData = products.map(p => ({
      ...p,
      familyName: families.find(f => f.id === p.family_id)?.name || '',
      typeLabel: p.product_type === 'recurring' ? 'שוטף' : 'חד"פ',
      statusLabel: p.status === 'active' ? 'פעיל' : 'לא פעיל',
    }));
    exportToCSV(exportData,
      ['sku', 'name', 'familyName', 'typeLabel', 'statusLabel', 'unit_price', 'sale_price', 'mfr_name', 'mfr_sku', 'supplier_name', 'supplier_sku', 'unit_of_use', 'stock_qty'],
      ['מק"ט', 'שם מוצר', 'משפחת מוצר', 'סוג', 'סטטוס', 'מחיר קנייה', 'מחיר מכירה', 'שם יצרן', 'מק"ט יצרן', 'שם ספק', 'מק"ט ספק', 'יחידת שימוש', 'כמות במלאי'],
      'products'
    );
  };

  const downloadTemplate = () => {
    exportToCSV(
      [{ name: 'מוצר לדוגמא', sku: 'ABC-001', status: 'פעיל', family: '', unitOfUse: 'יחידה', mfrSku: '', mfrName: '', supplierSku: '', supplierName: '', unitPrice: '100', salePrice: '150', stockQty: '10' }],
      IMPORT_FIELDS.map(f => f.key),
      IMPORT_FIELDS.map(f => f.label),
      'products_template'
    );
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { headers, rows } = await importCSV(file);
      setImportHeaders(headers);
      setImportRows(rows);
      // Auto-map columns — exact match first, then partial (avoid "מחיר קנייה" matching "תאריך קנייה")
      const mapping = {};
      const usedHeaders = new Set();
      // Pass 1: exact match
      IMPORT_FIELDS.forEach(f => {
        const match = headers.find(h => !usedHeaders.has(h) && h === f.label);
        if (match) { mapping[f.key] = match; usedHeaders.add(match); }
      });
      // Pass 2: partial match (only if not already mapped)
      IMPORT_FIELDS.forEach(f => {
        if (mapping[f.key]) return;
        const match = headers.find(h => !usedHeaders.has(h) && (h.includes(f.label) || f.label.includes(h)));
        if (match) { mapping[f.key] = match; usedHeaders.add(match); }
      });
      setImportMapping(mapping);
      setImportStep(2);
    } catch (err) { alert('שגיאה: ' + err.message); }
    e.target.value = '';
  };

  const doImport = async () => {
    setImporting(true);
    setImportResult(null);
    let added = 0, skipped = 0, errors = [];

    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i];
      const get = (key) => (importMapping[key] && row[importMapping[key]] !== undefined && row[importMapping[key]] !== '') ? String(row[importMapping[key]]).trim() : '';
      // Convert Excel serial date numbers to ISO date strings
      const getDate = (key) => {
        const v = get(key);
        if (!v) return null;
        // Excel serial number (e.g. 45329)
        if (/^\d{4,5}$/.test(v)) {
          const d = new Date((parseInt(v) - 25569) * 86400000);
          return d.toISOString().split('T')[0];
        }
        // Already a date string
        if (/\d{4}-\d{2}-\d{2}/.test(v)) return v;
        return null;
      };
      const name = get('name');
      if (!name) { skipped++; continue; }

      const famName = get('family');
      const fam = famName ? families.find(f => f.name === famName || String(f.num) === famName) : null;
      const statusRaw = get('status');
      const status = statusRaw.includes('לא') || statusRaw.toLowerCase() === 'inactive' ? 'inactive' : 'active';

      try {
        await api.post('/api/products', {
          name,
          sku: get('sku') || null,
          status,
          family_id: fam?.id || null,
          product_type: fam?.family_type === 'recurring' ? 'recurring' : 'onetime',
          parent_cat: fam?.parent_cat_id ? (categories.find(c => c.id === fam.parent_cat_id)?.name || '') : '',
          unit_of_use: get('unitOfUse') || null,
          mfr_sku: get('mfrSku') || null,
          mfr_name: get('mfrName') || null,
          supplier_sku: get('supplierSku') || null,
          supplier_name: get('supplierName') || null,
          unit_price: get('unitPrice') || null,
          sale_price: get('salePrice') || null,
          stock_qty: get('stockQty') || null,
          last_purchase_date: getDate('lastPurchaseDate'),
          cost_currency: 'ILS',
          sale_currency: 'ILS',
        });
        added++;
      } catch (err) {
        skipped++;
        if (errors.length < 10) errors.push(`שורה ${i + 1} (${name}): ${err.message}`);
      }
      setImportProgress(`מייבא ${i + 1} מתוך ${importRows.length}... (${added} הצליחו)`);
    }
    setImportResult({ added, skipped, errors, total: importRows.length });
    setImporting(false);
    setImportProgress('');
    setImportStep(3);
    // Force refresh products list
    await qc.invalidateQueries({ queryKey: ['products'] });
    await qc.refetchQueries({ queryKey: ['products'] });
    setPage(1);
  };

  // When family changes, auto-set product type and category (resolved via chain).
  const onFamilyChange = (famId) => {
    if (!famId) {
      setEditItem(p => ({ ...p, family_id: null, parent_cat: '' }));
      return;
    }
    const fam = families.find(f => f.id === famId);
    if (!fam) { upd('family_id', famId); return; }
    const effCatId = getEffectiveCategoryId(fam, families);
    const cat = effCatId ? categories.find(c => c.id === effCatId) : null;
    setEditItem(p => ({
      ...p,
      family_id: famId,
      product_type: fam.family_type === 'recurring' ? 'recurring' : 'onetime',
      parent_cat: cat?.name || '',
    }));
  };

  // Auto-fill SKU as `${family.num}-XXX-XXX` whenever family_id changes for a NEW
  // product. Lives in an effect (not in onFamilyChange) so it reacts cleanly and
  // can cancel stale responses when the user picks another family quickly.
  useEffect(() => {
    if (!editItem) return;
    if (editItem.id) return;            // existing product — never overwrite SKU
    if (!editItem.family_id) return;
    let cancelled = false;
    api.get(`/api/products/next-sku?familyId=${encodeURIComponent(editItem.family_id)}`)
      .then(res => {
        if (cancelled) return;
        if (res?.sku) setEditItem(p => p ? { ...p, sku: res.sku } : p);
      })
      .catch(err => {
        if (!cancelled) console.error('Auto-SKU failed:', err);
      });
    return () => { cancelled = true; };
  }, [editItem?.id, editItem?.family_id]);

  // Cascading dropdown change handler: picking at depth K sets family_id to that pick;
  // clearing falls back to depth K-1's selection (or null).
  const onLevelChange = (depth, newId) => {
    if (newId) { onFamilyChange(newId); return; }
    const fallbackId = depth > 1 ? (familyChain[depth - 2]?.id || null) : null;
    onFamilyChange(fallbackId);
  };

  // Filtered manufacturers for dropdown
  const filteredMfrs = manufacturers.filter(m => (m.name || '').toLowerCase().includes((mfrInput || '').toLowerCase()));

  const prodStats = useMemo(() => {
    const total = data?.total || products.length;
    const active = products.filter(p => p.status === 'active').length;
    return [
      { label: 'סה"כ מוצרים', value: total, color: 'var(--warning)' },
      { label: 'פעילים', value: active, color: 'var(--success)' },
      { label: 'לא פעילים', value: total - active, color: 'var(--danger)' },
    ];
  }, [products, data?.total]);

  // ── List ───────────────────────────────────────────────────────────────
  return (
    <>
      {!editItem && (<>
      <ModuleTopbar icon="ti-barcode" title='מק"טים'>
        {canUseButton('btn_export') && (
          <button className="tdb-calendar-btn" onClick={handleExport}>
            <i className="ti ti-table-export" aria-hidden="true" /> יצוא Excel
          </button>
        )}
        {canUseButton('btn_import') && (
          <button className="tdb-calendar-btn" onClick={() => { setShowImport(p => !p); setImportStep(1); setImportResult(null); }}>
            <i className="ti ti-table-import" aria-hidden="true" /> ייבוא מוצרים
          </button>
        )}
        {canCreate && canUseButton('btn_new') && (
          <button className="tdb-calendar-btn" onClick={() => { setViewOnly(false); setEditItem({ ...EMPTY_PRODUCT }); setMfrInput(''); }} style={{ background: 'rgba(255,255,255,.25)', borderColor: 'rgba(255,255,255,.5)', fontWeight: 700 }}>
            <i className="ti ti-plus" aria-hidden="true" /> מק"ט חדש
          </button>
        )}
      </ModuleTopbar>
      <StatsBar stats={prodStats} />

      {/* Import Wizard */}
      {showImport && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          {/* Step 1: File */}
          {importStep === 1 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>שלב 1 — בחירת קובץ</div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12 }}>בחר קובץ Excel עם נתוני מוצרים</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="file" ref={fileRef} onChange={handleImportFile} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} />
                  <button className="btn btn-primary" onClick={() => fileRef.current?.click()} style={{ fontSize: 12 }}>בחר קובץ Excel</button>
                  <button className="btn btn-ghost" onClick={downloadTemplate} style={{ fontSize: 12 }}>הורד תבנית</button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Mapping */}
          {importStep === 2 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>שלב 2 — התאמת עמודות</div>
              <div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 14 }}>נטענו {importRows.length} שורות. התאם את עמודות הקובץ לשדות המערכת:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, marginBottom: 16 }}>
                {IMPORT_FIELDS.map(f => (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, minWidth: 110, color: f.required ? 'var(--danger)' : 'var(--text-2)' }}>
                      {f.label}{f.required ? ' *' : ''}
                    </span>
                    <select value={importMapping[f.key] || ''} onChange={e => setImportMapping(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}>
                      <option value="">— לא ממופה —</option>
                      {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {/* Preview */}
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>תצוגה מקדימה (5 שורות ראשונות):</div>
              <div style={{ overflowX: 'auto', marginBottom: 12 }}>
                <table className="dm-table" style={{ fontSize: 11 }}>
                  <thead><tr>{IMPORT_FIELDS.filter(f => importMapping[f.key]).map(f => <th key={f.key}>{f.label}</th>)}</tr></thead>
                  <tbody>
                    {importRows.slice(0, 5).map((row, i) => (
                      <tr key={i}>{IMPORT_FIELDS.filter(f => importMapping[f.key]).map(f => <td key={f.key}>{row[importMapping[f.key]] || '—'}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => setImportStep(1)}>חזרה</button>
                <button className="btn btn-primary" onClick={doImport} disabled={importing || !importMapping.name}>
                  {importing ? 'מייבא...' : `ייבא ${importRows.length} מוצרים`}
                </button>
                {importing && importProgress && (
                  <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, marginRight: 10 }}>{importProgress}</span>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {importStep === 3 && importResult && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: importResult.added > 0 ? '#10B981' : '#EF4444' }}>תוצאות הייבוא</div>
              <div style={{ display: 'flex', gap: 20, fontSize: 13, marginBottom: 8 }}>
                <span>סה"כ בקובץ: <strong>{importResult.total}</strong></span>
                <span style={{ color: '#10B981' }}>יובאו: <strong>{importResult.added}</strong></span>
                {importResult.skipped > 0 && <span style={{ color: '#EF4444' }}>נכשלו: <strong>{importResult.skipped}</strong></span>}
              </div>
              {importResult.errors.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  {importResult.errors.map((e, i) => <div key={i} style={{ color: '#EF4444', fontSize: 12 }}>• {e}</div>)}
                </div>
              )}
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setShowImport(false)}>סגור</button>
                <button className="btn btn-secondary" onClick={() => { setImportStep(1); setImportResult(null); }}>ייבוא נוסף</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk delete bar */}
      {selectedIds.size > 0 && (
        <div style={{ background: '#EF444411', border: '1px solid #EF444433', borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>נבחרו {selectedIds.size} מוצרים</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setSelectedIds(new Set())}>ביטול</button>
            <button className="btn btn-danger" onClick={() => setBulkConfirm(true)}>מחק נבחרים</button>
          </div>
        </div>
      )}

      <DataTable
        columns={PRODUCTS_COLUMNS}
        data={products}
        total={data?.total || 0}
        page={page}
        totalPages={data?.totalPages || 1}
        isLoading={isLoading}
        error={error}
        onSearchChange={s => { setSearch(s); setPage(1); }}
        onPageChange={setPage}
        onEdit={canEdit ? row => { setViewOnly(false); setEditItem({ ...row }); setMfrInput(row.mfr_name || ''); } : undefined}
        onView={!canEdit && canView ? row => { setViewOnly(true); setEditItem({ ...row }); setMfrInput(row.mfr_name || ''); } : undefined}
        onDelete={canDelete ? row => setConfirmDel(row) : undefined}
        renderCell={(row, key) => {
          if (key === PRODUCTS_COLUMNS[0].key) {
            // Add checkbox before first column
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={selectedIds.has(row.id)}
                  onChange={(e) => { e.stopPropagation(); toggleSel(row.id); }}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
                {renderCell(row, key)}
              </div>
            );
          }
          return renderCell(row, key);
        }}
        storageKey="biz_products_cols_v3"
        hideHeader
        extraSearchContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>משפחה:</span>
            <div style={{ minWidth: 180, maxWidth: 260 }}>
              <FamilyCombobox
                value={filterFamilyId}
                options={sortSiblings(families.filter(f => !f.parent_family_id))}
                searchAll={families}
                onChange={(id) => { setFilterFamilyId(id || ''); setPage(1); }}
                placeholder="כל המשפחות..."
              />
            </div>
            {filterFamilyId && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '3px 8px' }}
                onClick={() => { setFilterFamilyId(''); setPage(1); }}
              >× נקה</button>
            )}
          </div>
        }
      />
      </>)}

      {/* Edit/Create — shown instead of list via editItem check */}
      {editItem && (
        <div className="animate-in">
          <div className="tdb-topbar" style={{ marginBottom: 16 }}>
            <div className="tdb-topbar-left">
              <button className="tdb-calendar-btn" onClick={() => setEditItem(null)}>← חזרה למוצרים</button>
              <span className="tdb-topbar-icon"><i className="ti ti-box" aria-hidden="true" /></span>
              <h1 className="tdb-topbar-title">{viewOnly ? `צפייה — ${editItem.name || ''}` : editItem.id ? `עריכת מוצר — ${editItem.name || ''}` : 'מוצר חדש'}</h1>
              {viewOnly && <span style={{ fontSize: 11, background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B66', borderRadius: 999, padding: '2px 10px', fontWeight: 600 }}>צפייה בלבד</span>}
            </div>
            <div className="tdb-topbar-right">
              {!viewOnly && editItem.id && canUseButton('btn_movements') && (
                <button className="tdb-calendar-btn" onClick={() => setShowMovements(true)}>
                  <i className="ti ti-chart-bar" aria-hidden="true" /> תנועות מלאי לפריט
                </button>
              )}
              {!viewOnly && editItem.id && canDelete && canUseButton('btn_delete') && (
                <button className="tdb-calendar-btn" style={{ background: 'rgba(220,38,38,0.18)', borderColor: 'rgba(220,38,38,0.5)' }} onClick={() => setConfirmDel(editItem)}>
                  <i className="ti ti-trash" aria-hidden="true" /> מחק
                </button>
              )}
              {!viewOnly && canUseButton('btn_save') && (
                <button className="tdb-calendar-btn" style={{ background: 'rgba(255,255,255,0.9)', color: '#074876', fontWeight: 700 }} onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
                  {(createMut.isPending || updateMut.isPending) ? 'שומר...' : 'שמור'}
                </button>
              )}
            </div>
          </div>
          <div className="card">
          <fieldset disabled={viewOnly} style={{ border: 'none', padding: 0, margin: 0 }}>
              {/* Basic */}
              <div className="form-grid">
                <div className="form-field">
                  <label>שם מוצר *</label>
                  <input value={editItem.name || ''} onChange={e => upd('name', e.target.value)} autoFocus />
                </div>
                <div className="form-field">
                  <label>מק"ט</label>
                  <input value={editItem.sku || ''} onChange={e => upd('sku', e.target.value)} dir="ltr" />
                </div>
                {cascadingLevels.map(lvl => (
                  <div className="form-field" key={`flv-${lvl.depth}`}>
                    <label>{labelForDepth(lvl.depth)}</label>
                    <FamilyCombobox
                      value={lvl.selectedId}
                      options={lvl.options}
                      searchAll={families}
                      onChange={(id) => onLevelChange(lvl.depth, id)}
                      placeholder="הקלד שם או מספר..."
                    />
                  </div>
                ))}
                <div className="form-field">
                  <label>קטגוריה</label>
                  <input value={editItem.parent_cat || ''} readOnly style={{ background: 'var(--bg-elevated)' }} />
                </div>
                <div className="form-field">
                  <label>סוג</label>
                  <input value={editItem.product_type === 'recurring' ? 'שוטף' : 'חד"פ'} readOnly
                    style={{ background: 'var(--bg-elevated)', fontWeight: 600, color: editItem.product_type === 'recurring' ? 'var(--info)' : 'var(--accent)' }} />
                </div>
                <div className="form-field">
                  <label>סטטוס</label>
                  <select value={editItem.status || 'active'} onChange={e => upd('status', e.target.value)}>
                    {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              <h3 className="form-section-title">תמחור</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>מחיר קנייה</label>
                  <input type="number" value={editItem.unit_price || ''} onChange={e => upd('unit_price', e.target.value)} dir="ltr" min="0" step="0.01" />
                </div>
                <div className="form-field">
                  <label>מטבע קנייה</label>
                  <select value={editItem.cost_currency || 'ILS'} onChange={e => upd('cost_currency', e.target.value)}>
                    {CURRENCIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>מחיר מכירה</label>
                  <input type="number" value={editItem.sale_price || ''} onChange={e => upd('sale_price', e.target.value)} dir="ltr" min="0" step="0.01" />
                </div>
                <div className="form-field">
                  <label>מטבע מכירה</label>
                  <select value={editItem.sale_currency || 'ILS'} onChange={e => upd('sale_currency', e.target.value)}>
                    {CURRENCIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>כמות במלאי</label>
                  <input type="number" value={editItem.stock_qty || ''} onChange={e => upd('stock_qty', e.target.value)} dir="ltr" min="0" />
                </div>
                <div className="form-field">
                  <label>יחידת שימוש</label>
                  <input value={editItem.unit_of_use || ''} onChange={e => upd('unit_of_use', e.target.value)} placeholder={'יח\', ק"ג, מטר...'} />
                </div>
                <div className="form-field">
                  <label>תאריך קנייה אחרון</label>
                  <input type="date" value={editItem.last_purchase_date ? String(editItem.last_purchase_date).split('T')[0] : ''} onChange={e => upd('last_purchase_date', e.target.value)} dir="ltr" />
                </div>
                <div className="form-field">
                  <label>תחילת מבצע</label>
                  <input type="date" value={editItem.sale_start_date ? String(editItem.sale_start_date).split('T')[0] : ''} onChange={e => upd('sale_start_date', e.target.value)} dir="ltr" />
                </div>
                <div className="form-field">
                  <label>סיום מבצע</label>
                  <input type="date" value={editItem.sale_end_date ? String(editItem.sale_end_date).split('T')[0] : ''} onChange={e => upd('sale_end_date', e.target.value)} dir="ltr" />
                </div>
                <div className="form-field">
                  <label>תאריך הזנת מבצע</label>
                  <input type="date" value={editItem.sale_entry_date ? String(editItem.sale_entry_date).split('T')[0] : ''} onChange={e => upd('sale_entry_date', e.target.value)} dir="ltr" />
                </div>
              </div>

              <h3 className="form-section-title">יצרן וספק</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>שם יצרן</label>
                  <div style={{ position: 'relative' }}>
                    <input value={mfrInput} placeholder="חפש יצרן..."
                      onFocus={() => setMfrDrop(true)}
                      onChange={e => { setMfrInput(e.target.value); upd('mfr_name', e.target.value); setMfrDrop(true); }}
                      onBlur={() => setTimeout(() => setMfrDrop(false), 150)} />
                    {mfrDrop && filteredMfrs.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, maxHeight: 150, overflowY: 'auto', zIndex: 10, boxShadow: 'var(--shadow-md)' }}>
                        {filteredMfrs.map(m => (
                          <div key={m.id} onMouseDown={e => { e.preventDefault(); setMfrInput(m.name); upd('mfr_name', m.name); setMfrDrop(false); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}
                            onMouseOver={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                            onMouseOut={e => e.currentTarget.style.background = ''}>
                            {m.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-field">
                  <label>מק"ט יצרן</label>
                  <input value={editItem.mfr_sku || ''} onChange={e => upd('mfr_sku', e.target.value)} dir="ltr" />
                </div>
                <div className="form-field">
                  <label>שם ספק</label>
                  <input value={editItem.supplier_name || ''} onChange={e => upd('supplier_name', e.target.value)} />
                </div>
                <div className="form-field">
                  <label>מק"ט ספק</label>
                  <input value={editItem.supplier_sku || ''} onChange={e => upd('supplier_sku', e.target.value)} dir="ltr" />
                </div>
                <OwnerSelect value={editItem.created_by} onChange={v => upd('created_by', v)} label="בעלי רשומה מוצר" />
              </div>

              <div className="form-field" style={{ marginTop: 12 }}>
                <label>תיאור</label>
                <textarea value={editItem.description || ''} onChange={e => upd('description', e.target.value)} rows={3} />
              </div>

          </fieldset>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDel && (
        <DeleteConfirmModal
          title="מחיקת מוצר"
          name={confirmDel.name}
          cascade="מחיקת המוצר תשפיע על כל הרשומות המשויכות אליו: פריטי לקוח, שורות בהצעות מחיר והזמנות."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
          isPending={deleteMut.isPending}
        />
      )}

      {/* Inventory movements modal */}
      {showMovements && editItem && (
        <InventoryMovementsModal productId={editItem.id} productName={editItem.name} sku={editItem.sku} onClose={() => setShowMovements(false)} />
      )}

      {/* Bulk Delete Confirm */}
      {bulkConfirm && (
        <div className="modal-overlay" onClick={() => setBulkConfirm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 12 }}>מחיקה המונית</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 8 }}>
              האם למחוק <strong>{selectedIds.size}</strong> מוצרים?
            </p>
            <p style={{ color: 'var(--warning)', fontSize: 12, marginBottom: 20 }}>פעולה זו אינה הפיכה.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setBulkConfirm(false)}>ביטול</button>
              <button className="btn btn-danger" onClick={handleBulkDelete} disabled={bulkDeleteMut.isPending}>
                {bulkDeleteMut.isPending ? 'מוחק...' : `מחק ${selectedIds.size} מוצרים`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InventoryMovementsModal({ productId, productName, sku, onClose }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['product-movements', productId],
    queryFn: () => api.get(`/api/products/${productId}/movements`),
    enabled: !!productId,
  });
  const movements = data?.data || [];

  const typeLabel = (t) => ({ delivery: 'הנפקה ללקוח', return: 'החזרה מלקוח', reversal: 'ביטול', adjustment: 'התאמה' }[t] || t);
  const typeColor = (t) => ({ delivery: '#EF4444', return: '#10B981', reversal: '#94A3B8', adjustment: '#F59E0B' }[t] || '#6B7280');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 1100, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2><i className="ti ti-chart-bar" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 6 }} /> תנועות מלאי — {productName} {sku ? `(${sku})` : ''}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ overflow: 'auto' }}>
          {isLoading && <div style={{ padding: 20, textAlign: 'center' }}>טוען...</div>}
          {error && <div style={{ padding: 20, color: 'var(--danger)' }}>שגיאה בטעינת תנועות</div>}
          {!isLoading && !error && movements.length === 0 && (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-3)' }}>
              אין תנועות מלאי לפריט זה
            </div>
          )}
          {!isLoading && movements.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>תאריך</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>סוג תנועה</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>כמות</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>לקוח</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>הזמנה</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>תעודת משלוח</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>הערות</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => {
                    const qty = parseFloat(m.quantity);
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px' }}>{new Date(m.created_at).toLocaleString('he-IL')}</td>
                        <td style={{ padding: '8px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, background: typeColor(m.movement_type) + '22', color: typeColor(m.movement_type), fontWeight: 600, fontSize: 11 }}>
                            {typeLabel(m.movement_type)}
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: qty >= 0 ? '#10B981' : '#EF4444' }}>
                          {qty >= 0 ? '+' : ''}{qty}
                        </td>
                        <td style={{ padding: '8px' }}>{m.customer_name || '—'}</td>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{m.order_num || '—'}</td>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{m.note_num || '—'}</td>
                        <td style={{ padding: '8px', color: 'var(--text-2)', fontSize: 12 }}>{m.description || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost" onClick={onClose}>סגור</button>
        </div>
      </div>
    </div>
  );
}
