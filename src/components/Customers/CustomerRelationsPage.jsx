import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCustomer } from '../../hooks/useCustomers';
import { useDeals } from '../../hooks/useDeals';
import { useQuotes } from '../../hooks/useQuotes';
import { useOrders } from '../../hooks/useOrders';
import { useDeliveryNotes } from '../../hooks/useDeliveryNotes';
import { Icon, ICONS } from '../../utils/icons';
import ModuleTopbar from '../Layout/ModuleTopbar';
import './CustomerRelations.css';

// Visual constants
const NODE_W = 210;
const NODE_H = 78;
const V_GAP = 70;
const H_GAP = 18;

// Per-type styling
const TYPE_STYLE = {
  customer: { fill: '#FEF3C7', stroke: '#F59E0B', label: 'לקוח', icon: 'ti-user' },
  deal:     { fill: '#EDE9FE', stroke: '#7C3AED', label: 'עסקה', icon: 'ti-briefcase' },
  quote:    { fill: '#DBEAFE', stroke: '#3B82F6', label: 'הצעת מחיר', icon: 'ti-forms' },
  order:    { fill: '#D1FAE5', stroke: '#10B981', label: 'הזמנה', icon: 'ti-shopping-cart' },
  delivery: { fill: '#CFFAFE', stroke: '#06B6D4', label: 'תעודת משלוח', icon: 'ti-package' },
  return:   { fill: '#FEE2E2', stroke: '#EF4444', label: 'תעודת החזרה', icon: 'ti-arrow-back' },
};

export default function CustomerRelationsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: customer, isLoading: custLoading } = useCustomer(id);
  const { data: dealsData, isLoading: l1 } = useDeals({ customerId: id, limit: 500 });
  const { data: quotesData, isLoading: l2 } = useQuotes({ customerId: id, limit: 500 });
  const { data: ordersData, isLoading: l3 } = useOrders({ customerId: id, limit: 500 });
  const { data: notesData,  isLoading: l4 } = useDeliveryNotes({ customerId: id, limit: 500 });

  const isLoading = custLoading || l1 || l2 || l3 || l4;

  const deals  = dealsData?.data  || [];
  const quotes = quotesData?.data || [];
  const orders = ordersData?.data || [];
  const notes  = notesData?.data  || [];

  // Build the tree.
  const tree = useMemo(() => {
    if (!customer) return null;

    const buildNote = (n) => ({
      id: `note-${n.id}`,
      type: n.note_type === 'return' ? 'return' : 'delivery',
      data: n,
      title: n.note_num || '—',
      subtitle: n.delivery_date ? new Date(n.delivery_date).toLocaleDateString('he-IL') : '',
      status: n.status,
      onClick: () => navigate(`/delivery-notes?edit=${n.id}`),
      children: [],
    });

    const buildOrder = (o) => {
      const myNotes = notes.filter(n => n.order_id === o.id);
      // Show deliveries first, then returns (kept by sort)
      const sorted = [...myNotes].sort((a, b) => {
        if (a.note_type !== b.note_type) return a.note_type === 'delivery' ? -1 : 1;
        return (a.note_num || '').localeCompare(b.note_num || '');
      });
      return {
        id: `order-${o.id}`,
        type: 'order',
        data: o,
        title: o.order_num || '—',
        subtitle: o.order_name || '',
        status: o.status,
        onClick: () => navigate(`/orders?edit=${o.id}`),
        children: sorted.map(buildNote),
      };
    };

    const buildQuote = (q) => {
      const myOrders = orders.filter(o => o.quote_id === q.id);
      return {
        id: `quote-${q.id}`,
        type: 'quote',
        data: q,
        title: q.quote_num || '—',
        subtitle: q.quote_name || '',
        status: q.stage,
        onClick: () => navigate(`/quotes/${q.id}/edit`),
        children: myOrders.map(buildOrder),
      };
    };

    const buildDeal = (d) => {
      const myQuotes = quotes.filter(q => q.deal_id === d.id);
      return {
        id: `deal-${d.id}`,
        type: 'deal',
        data: d,
        title: d.deal_num || '—',
        subtitle: d.deal_name || '',
        status: d.stage,
        onClick: () => navigate(`/deals?edit=${d.id}`),
        children: myQuotes.map(buildQuote),
      };
    };

    // Quotes that have no deal_id — attached directly under customer
    const orphanQuotes = quotes.filter(q => !q.deal_id);

    // Orders that have no quote_id (and we want to show them too — directly under deal? or customer?)
    // Per the user's spec: chain is customer → (deal or quote) → quote → order → notes.
    // If an order has no quote, attach it directly under customer for visibility.
    const orphanOrders = orders.filter(o => !o.quote_id);

    return {
      id: `cust-${customer.id}`,
      type: 'customer',
      data: customer,
      title: customer.cust_num || '',
      subtitle: customer.company_name || 'לקוח',
      status: customer.status,
      onClick: () => navigate(`/customers/${customer.id}`),
      children: [
        ...deals.map(buildDeal),
        ...orphanQuotes.map(buildQuote),
        ...orphanOrders.map(buildOrder),
      ],
    };
  }, [customer, deals, quotes, orders, notes, navigate]);

  // Layout — recursive top-down tree.
  const layout = useMemo(() => {
    if (!tree) return null;
    const computeWidth = (n) => {
      if (!n.children?.length) return NODE_W;
      const w = n.children.reduce((s, c) => s + computeWidth(c), 0) + H_GAP * (n.children.length - 1);
      return Math.max(NODE_W, w);
    };
    const positions = new Map();
    const place = (node, x, y) => {
      const w = computeWidth(node);
      const cx = x + w / 2;
      positions.set(node.id, { node, x: cx, y });
      let curX = x;
      for (const child of node.children || []) {
        const cw = computeWidth(child);
        place(child, curX, y + NODE_H + V_GAP);
        curX += cw + H_GAP;
      }
      return w;
    };
    const totalWidth = place(tree, 20, 20);
    let totalDepth = 0;
    const measureDepth = (n, d = 0) => {
      totalDepth = Math.max(totalDepth, d);
      n.children?.forEach(c => measureDepth(c, d + 1));
    };
    measureDepth(tree);
    const totalHeight = (totalDepth + 1) * (NODE_H + V_GAP);
    return { positions, totalWidth: totalWidth + 40, totalHeight };
  }, [tree]);

  if (isLoading) return <div className="card" style={{ padding: 40, textAlign: 'center' }}>טוען מפת קשרים...</div>;
  if (!customer) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>לקוח לא נמצא</div>;

  // Walk all positioned nodes
  const allNodes = layout ? [...layout.positions.values()] : [];

  // Build edges (parent → child)
  const edges = [];
  if (tree) {
    const walk = (n) => {
      const p = layout.positions.get(n.id);
      for (const c of n.children || []) {
        const cp = layout.positions.get(c.id);
        edges.push({ from: p, to: cp, type: c.type });
        walk(c);
      }
    };
    walk(tree);
  }

  // Counts for stats
  const dealCount = deals.length;
  const quoteCount = quotes.length;
  const orderCount = orders.length;
  const deliveryCount = notes.filter(n => n.note_type !== 'return').length;
  const returnCount = notes.filter(n => n.note_type === 'return').length;

  return (
    <div className="animate-in">
      <ModuleTopbar icon="ti-hierarchy" title="מפת קשרים">
        <Link to={`/customers/${customer.id}`} className="tdb-calendar-btn">
          <Icon svg={ICONS.back} size={16} /> חזרה לפרטי לקוח
        </Link>
      </ModuleTopbar>

      {/* Stats */}
      <div className="rel-stats">
        <Stat label="עסקאות" count={dealCount} color="#7C3AED" />
        <Stat label="הצעות מחיר" count={quoteCount} color="#3B82F6" />
        <Stat label="הזמנות" count={orderCount} color="#10B981" />
        <Stat label="תעודות משלוח" count={deliveryCount} color="#06B6D4" />
        <Stat label="תעודות החזרה" count={returnCount} color="#EF4444" />
      </div>

      {tree?.children.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
          ללקוח זה אין עסקאות, הצעות מחיר או הזמנות עדיין.
        </div>
      ) : (
        <div className="rel-canvas-wrap card">
          <svg
            className="rel-canvas"
            width={layout?.totalWidth || 800}
            height={layout?.totalHeight || 400}
            viewBox={`0 0 ${layout?.totalWidth || 800} ${layout?.totalHeight || 400}`}
          >
            {/* Edges */}
            {edges.map((e, i) => {
              const px = e.from.x;
              const py = e.from.y + NODE_H;
              const cx = e.to.x;
              const cy = e.to.y;
              const midY = (py + cy) / 2;
              const d = `M ${px} ${py} C ${px} ${midY}, ${cx} ${midY}, ${cx} ${cy}`;
              const color = TYPE_STYLE[e.type]?.stroke || '#94A3B8';
              return <path key={i} d={d} stroke={color} strokeWidth={1.5} fill="none" opacity={0.5} />;
            })}

            {/* Nodes */}
            {allNodes.map(({ node, x, y }) => {
              const style = TYPE_STYLE[node.type] || TYPE_STYLE.customer;
              return (
                <g
                  key={node.id}
                  transform={`translate(${x - NODE_W / 2}, ${y})`}
                  className="rel-node"
                  onClick={node.onClick}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={1.5}
                    rx={10}
                  />
                  <text x={10} y={18} fontSize={11} fill={style.stroke} fontWeight={700}>
                    {style.label}
                  </text>
                  <foreignObject x={10} y={22} width={NODE_W - 20} height={NODE_H - 28}>
                    <div className="rel-node-body" dir="rtl">
                      <div className="rel-node-title">
                        {node.title && <bdi className="rel-node-num">{node.title}</bdi>}
                        {node.subtitle && <bdi className="rel-node-sub">{node.subtitle}</bdi>}
                      </div>
                      {node.status && <span className="rel-node-status">{node.status}</span>}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

function Stat({ label, count, color }) {
  return (
    <div className="rel-stat" style={{ borderColor: color + '55' }}>
      <div className="rel-stat-count" style={{ color }}>{count}</div>
      <div className="rel-stat-label">{label}</div>
    </div>
  );
}
