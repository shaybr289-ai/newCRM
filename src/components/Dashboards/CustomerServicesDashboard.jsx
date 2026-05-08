import { useState, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useCustomers } from '../../hooks/useCustomers';
import { useFamilies, useCategories, useProducts } from '../../hooks/useProducts';
import { useFamilyLevels } from '../../hooks/useDataManagement';
import { computeFamilyDepth, sortSiblings } from '../../utils/familyHierarchy';
import FamilyCombobox from '../Layout/FamilyCombobox';
import './CustomerServicesDashboard.css';

const ITEM_TYPE_OPTIONS = [
  ['service',      'שירות',     '#10B981'],
  ['connectivity', 'תקשורת',    '#06B6D4'],
  ['hardware',     'חומרה',     '#F97316'],
  ['software',     'תוכנה',     '#8B5CF6'],
  ['license',      'רישיון',    '#EAB308'],
  ['other',        'אחר',       '#94A3B8'],
];
const ALL_TYPES = ITEM_TYPE_OPTIONS.map(([k]) => k);

export default function CustomerServicesDashboard({ customerId: customerIdProp } = {}) {
  const [internalCustomerId, setInternalCustomerId] = useState('');
  const customerId = customerIdProp || internalCustomerId;
  const [itemTypes, setItemTypes] = useState(ALL_TYPES);
  const toggleType = (k) => setItemTypes(p => p.includes(k) ? p.filter(t => t !== k) : [...p, k]);

  const { data: custData } = useCustomers({ limit: 1000 });
  const { data: famData } = useFamilies();
  const { data: catData } = useCategories();
  const { data: levelData } = useFamilyLevels();
  const { data: prodData } = useProducts({ limit: 5000 });

  const customers = custData?.data || [];
  const families = famData?.data || [];
  const categories = catData?.data || [];
  const levelDefs = levelData?.data || [];
  const products = prodData?.data || [];

  // Customer combobox needs id/num/name — adapt customers list to match.
  const customerOptions = useMemo(() => customers.map(c => ({
    id: c.id,
    num: c.cust_num || '',
    name: c.company_name || '',
  })), [customers]);

  // Aggregate fully on the client to avoid depending on a backend endpoint:
  // 1) cust_items for the customer (filtered by item_type) → counts per family
  // 2) orders for the customer → fetch each order's items in parallel
  // 3) order items mapped via sku → product → family_id → revenue
  const { data: custItemsData, isLoading: l1, error: e1 } = useQuery({
    queryKey: ['cust-items-dashboard', customerId],
    queryFn: () => api.get(`/api/cust-items?customerId=${customerId}&limit=5000`),
    enabled: !!customerId,
    staleTime: 30000,
  });
  const { data: ordersData, isLoading: l2, error: e2 } = useQuery({
    queryKey: ['orders-dashboard', customerId],
    queryFn: () => api.get(`/api/orders?customerId=${customerId}&limit=5000`),
    enabled: !!customerId,
    staleTime: 30000,
  });

  const orders = ordersData?.data || [];
  const orderItemsQueries = useQueries({
    queries: orders.map(o => ({
      queryKey: ['order-items-dashboard', o.id],
      queryFn: () => api.get(`/api/orders/${o.id}/items`),
      enabled: !!customerId,
      staleTime: 30000,
    })),
  });
  const isLoading = !!customerId && (l1 || l2 || orderItemsQueries.some(q => q.isLoading));
  const error = e1 || e2 || orderItemsQueries.find(q => q.error)?.error;

  // Build the cust_items count per family (active + matching item_type)
  const custCounts = useMemo(() => {
    const out = {};
    const items = custItemsData?.data || [];
    for (const it of items) {
      if (it.status !== 'active') continue;
      if (!itemTypes.includes(it.item_type)) continue;
      const fid = it.product_family_id;
      if (!fid) continue;
      out[fid] = (out[fid] || 0) + 1;
    }
    return out;
  }, [custItemsData, itemTypes]);

  // Build revenue per family from order items: sku → product → family_id
  const orderRev = useMemo(() => {
    const out = {};
    const skuToFamily = new Map(products.filter(p => p.sku && p.family_id).map(p => [p.sku, p.family_id]));
    for (let i = 0; i < orders.length; i++) {
      const ord = orders[i];
      if ((ord.status || '').toLowerCase() === 'cancelled' || (ord.status || '').toLowerCase() === 'canceled') continue;
      const items = orderItemsQueries[i]?.data?.data || [];
      for (const it of items) {
        const fid = skuToFamily.get(it.sku);
        if (!fid) continue;
        const qty = parseFloat(it.quantity) || 0;
        const price = parseFloat(it.unit_price) || 0;
        const disc = parseFloat(it.discount) || 0;
        const total = qty * price * (1 - disc / 100);
        const bucket = (it.cost_type === 'recurring') ? 'recurring' : 'onetime';
        if (!out[fid]) out[fid] = { onetime: 0, recurring: 0 };
        out[fid][bucket] += total;
      }
    }
    return out;
  }, [orders, orderItemsQueries, products]);

  // Build per-family direct totals.
  const directByFamily = useMemo(() => {
    const map = new Map();
    for (const fid of new Set([...Object.keys(custCounts), ...Object.keys(orderRev)])) {
      const rev = orderRev[fid] || { onetime: 0, recurring: 0 };
      map.set(fid, {
        count: custCounts[fid] || 0,
        onetime: rev.onetime || 0,
        recurring: rev.recurring || 0,
      });
    }
    return map;
  }, [custCounts, orderRev]);

  // Build the rolled-up tree: categories → root families → sub-families recursively.
  // Each node carries its own (direct) counts and the rollup (own + descendants).
  const tree = useMemo(() => {
    const familiesByParentFam = new Map();
    const familiesByCat = new Map();
    for (const f of families) {
      if (f.parent_family_id) {
        const arr = familiesByParentFam.get(f.parent_family_id) || [];
        arr.push(f);
        familiesByParentFam.set(f.parent_family_id, arr);
      } else if (f.parent_cat_id) {
        const arr = familiesByCat.get(f.parent_cat_id) || [];
        arr.push(f);
        familiesByCat.set(f.parent_cat_id, arr);
      }
    }

    const buildFamily = (fam) => {
      const direct = directByFamily.get(fam.id) || { count: 0, onetime: 0, recurring: 0 };
      const children = sortSiblings(familiesByParentFam.get(fam.id) || []).map(buildFamily);
      const total = { ...direct };
      for (const c of children) {
        total.count += c.total.count;
        total.onetime += c.total.onetime;
        total.recurring += c.total.recurring;
      }
      return { ...fam, direct, children, total };
    };

    const cats = categories.map(cat => {
      const roots = sortSiblings(familiesByCat.get(cat.id) || []).map(buildFamily);
      const total = { count: 0, onetime: 0, recurring: 0 };
      for (const r of roots) {
        total.count += r.total.count;
        total.onetime += r.total.onetime;
        total.recurring += r.total.recurring;
      }
      return { ...cat, families: roots, total };
    });
    // Only keep categories with at least one service-or-revenue family beneath
    return cats.filter(c => c.total.count > 0 || c.total.onetime > 0 || c.total.recurring > 0);
  }, [families, categories, directByFamily]);

  const grandTotals = useMemo(() => {
    const t = { count: 0, onetime: 0, recurring: 0 };
    for (const cat of tree) {
      t.count += cat.total.count;
      t.onetime += cat.total.onetime;
      t.recurring += cat.total.recurring;
    }
    return t;
  }, [tree]);

  const fmtMoney = (n) => `₪${(Number(n) || 0).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const labelForDepth = (depth) => {
    const d = levelDefs.find(x => x.depth === depth);
    if (d?.name) return d.name;
    return depth === 1 ? 'משפחת מוצר ראשית' : `משפחת משנה רמה ${depth - 1}`;
  };

  const selectedCustomer = customers.find(c => c.id === customerId);

  return (
    <div className={customerIdProp ? undefined : 'animate-in csd-page'}>
      {!customerIdProp && (
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div>
            <h1 className="page-title">360 לקוח</h1>
            <p className="page-subtitle">תצוגה הירארכית של שירותים פעילים ללקוח לפי קטגוריות ומשפחות מוצר</p>
          </div>
        </div>
      )}

      {/* Customer picker + item type filter — hidden when customer id is passed via prop */}
      <div className="card csd-picker">
        {!customerIdProp && (
          <>
            <label style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6, display: 'block' }}>בחר לקוח</label>
            <FamilyCombobox
              value={internalCustomerId}
              options={customerOptions}
              onChange={(id) => setInternalCustomerId(id || '')}
              placeholder="הקלד שם או מספר לקוח..."
            />
          </>
        )}
        <div style={!customerIdProp ? { marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' } : undefined}>
          <label style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8, display: 'block' }}>סנן לפי סוג פריט</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ITEM_TYPE_OPTIONS.map(([k, label, color]) => {
              const on = itemTypes.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleType(k)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 999,
                    border: `1.5px solid ${on ? color : 'var(--border)'}`,
                    background: on ? `${color}22` : 'transparent',
                    color: on ? color : 'var(--text-3)',
                    fontSize: 12,
                    fontWeight: on ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {on ? '✓ ' : ''}{label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!customerId && !customerIdProp && (
        <div className="card csd-empty">
          <span style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>👆</span>
          בחר לקוח כדי לצפות בדשבורד השירותים שלו
        </div>
      )}

      {customerId && isLoading && (
        <div className="card csd-empty">טוען נתונים...</div>
      )}

      {customerId && error && (
        <div className="card csd-empty" style={{ color: 'var(--danger)' }}>
          שגיאה בטעינת הנתונים: {error.message}
        </div>
      )}

      {customerId && !isLoading && !error && (
        <>
          {/* Top stats */}
          <div className="csd-stats">
            <div className="csd-stat">
              <div className="csd-stat-value">{grandTotals.count.toLocaleString('he-IL')}</div>
              <div className="csd-stat-label">סה"כ שירותים פעילים</div>
            </div>
            <div className="csd-stat" style={{ borderColor: '#3B82F655' }}>
              <div className="csd-stat-value" style={{ color: '#3B82F6' }}>{fmtMoney(grandTotals.onetime)}</div>
              <div className="csd-stat-label">סה"כ הכנסה חד"פ</div>
            </div>
            <div className="csd-stat" style={{ borderColor: '#10B98155' }}>
              <div className="csd-stat-value" style={{ color: '#10B981' }}>{fmtMoney(grandTotals.recurring)}</div>
              <div className="csd-stat-label">סה"כ הכנסה חודשית</div>
            </div>
          </div>

          {tree.length === 0 ? (
            <div className="card csd-empty">
              ל־<strong>{selectedCustomer?.company_name}</strong> אין כרגע שירותים פעילים או הזמנות עם פריטים.
            </div>
          ) : (
            <div className="csd-categories">
              {tree.map(cat => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  fmtMoney={fmtMoney}
                  labelForDepth={labelForDepth}
                  families={families}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoryCard({ cat, fmtMoney, labelForDepth, families }) {
  return (
    <div className="csd-cat card">
      <div className="csd-cat-head">
        <div className="csd-cat-title">
          <span style={{ fontSize: 18 }}>🗂</span>
          {cat.num && <bdi className="csd-num">{cat.num}</bdi>}
          <bdi style={{ fontSize: 16, fontWeight: 700 }}>{cat.name}</bdi>
        </div>
        <div className="csd-cat-totals">
          <span className="csd-pill">📦 {cat.total.count} שירותים</span>
          {cat.total.onetime > 0 && <span className="csd-pill csd-pill-blue">חד"פ {fmtMoney(cat.total.onetime)}</span>}
          {cat.total.recurring > 0 && <span className="csd-pill csd-pill-green">חודשי {fmtMoney(cat.total.recurring)}</span>}
        </div>
      </div>

      <div className="csd-fam-list">
        <div className="csd-fam-row csd-fam-head">
          <div className="csd-fam-name">משפחה</div>
          <div className="csd-fam-cell">כמות</div>
          <div className="csd-fam-cell">הכנסה חד"פ</div>
          <div className="csd-fam-cell">הכנסה חודשית</div>
        </div>
        {cat.families.map(f => (
          <FamilyRows key={f.id} fam={f} depth={1} fmtMoney={fmtMoney} labelForDepth={labelForDepth} families={families} />
        ))}
      </div>
    </div>
  );
}

function FamilyRows({ fam, depth, fmtMoney, labelForDepth, families }) {
  // Skip families that have no count and no revenue across the whole subtree
  if (fam.total.count === 0 && fam.total.onetime === 0 && fam.total.recurring === 0) return null;

  return (
    <>
      <div className="csd-fam-row" style={{ paddingRight: 8 + (depth - 1) * 22 }}>
        <div className="csd-fam-name">
          <span className="csd-tree-marker" aria-hidden>{depth > 1 ? '↳' : '•'}</span>
          {fam.num && <bdi className="csd-num">{fam.num}</bdi>}
          <bdi>{fam.name}</bdi>
          <span className="csd-fam-meta">— {labelForDepth(computeFamilyDepth(fam, families))}</span>
        </div>
        <div className="csd-fam-cell">{fam.total.count > 0 ? fam.total.count.toLocaleString('he-IL') : '—'}</div>
        <div className="csd-fam-cell">{fam.total.onetime > 0 ? fmtMoney(fam.total.onetime) : '—'}</div>
        <div className="csd-fam-cell">{fam.total.recurring > 0 ? fmtMoney(fam.total.recurring) : '—'}</div>
      </div>
      {fam.children.map(c => (
        <FamilyRows key={c.id} fam={c} depth={depth + 1} fmtMoney={fmtMoney} labelForDepth={labelForDepth} families={families} />
      ))}
    </>
  );
}
