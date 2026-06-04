import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// react-grid-layout v2 changed its API completely.  The "legacy" module is the official
// v1-compatible shim that maps old flat props (cols, rowHeight, margin, isDraggable …)
// to the new v2 internals — import from here so all props are respected.
import GridLayout from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './Dashboard.css';

import { useDashboard, useAddWidget, useUpdateWidget, useDeleteWidget, useSaveLayout } from '../../hooks/useDashboards';
import { useUsers } from '../../hooks/useUsers';
import WidgetWrapper    from './WidgetWrapper';
import WidgetConfigPanel from './WidgetConfigPanel/WidgetConfigPanel';

// ── Widget catalog ────────────────────────────────────────────────────────────

const CATALOG = [
  {
    type: 'kpi',
    label: 'KPI / מספר',
    icon: 'ti-123',
    defaultTitle: 'סה"כ',
    // w=3 on a 24-col grid → 8 KPIs per row fit comfortably
    defaultLayout: { w: 3, h: 3, minW: 2, minH: 2 },
    defaultData: { endpoint: '/api/orders', metric: 'count' },
  },
  {
    type: 'bar_chart',
    label: 'גרף עמודות',
    icon: 'ti-chart-bar',
    defaultTitle: 'גרף',
    defaultLayout: { w: 8, h: 5, minW: 3, minH: 3 },
    defaultData: { endpoint: '/api/orders', metric: 'count', groupBy: 'status' },
  },
  {
    type: 'column_chart',
    label: 'גרף טורים',
    icon: 'ti-chart-bar',
    defaultTitle: 'גרף טורים',
    defaultLayout: { w: 8, h: 5, minW: 3, minH: 3 },
    defaultData: { endpoint: '/api/orders', metric: 'count', groupBy: 'status' },
  },
  {
    type: 'table',
    label: 'טבלה',
    icon: 'ti-table',
    defaultTitle: 'טבלת נתונים',
    defaultLayout: { w: 10, h: 6, minW: 4, minH: 3 },
    defaultData: { endpoint: '/api/orders', columns: ['order_num','order_name','status','created_at'], limit: 10, fetchLimit: 10 },
  },
];

const COLS      = 24;
const ROW_HEIGHT = 40;

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextPosition(widgets, w, h) {
  const occupied = new Set();
  for (const wg of widgets) {
    const { x = 0, y = 0, w: ww = 6, h: hh = 4 } = wg.layout || {};
    for (let row = y; row < y + hh; row++)
      for (let col = x; col < x + ww; col++)
        occupied.add(`${col},${row}`);
  }
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x <= COLS - w; x++) {
      let fits = true;
      outer: for (let row = y; row < y + h; row++)
        for (let col = x; col < x + w; col++)
          if (occupied.has(`${col},${row}`)) { fits = false; break outer; }
      if (fits) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

// ── useGridWidth ──────────────────────────────────────────────────────────────
// Uses a callback ref so the measurement fires whenever the DOM element mounts
// or unmounts — not just on the first component mount.
//
// Why a callback ref (not useRef + useLayoutEffect):
//   The DashboardBuilder has an early return while loading (db-grid-inner is not
//   in the DOM yet). useLayoutEffect([]) runs once on component mount — at that
//   point ref.current is null and the ResizeObserver is never wired up.  When
//   data arrives and db-grid-inner appears, the effect doesn't re-run.
//   A callback ref fires every time the DOM element mounts/unmounts, so the
//   observer is always attached to the actual element.

function useGridWidth() {
  const [width, setWidth] = useState(0);
  const roRef = useRef(null);          // keeps the current ResizeObserver

  const ref = useCallback((node) => {
    // Clean up previous observer when the element changes or unmounts
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (!node) return;

    const measure = () => {
      // getBoundingClientRect is direction-agnostic and works even in RTL parents
      const w = node.getBoundingClientRect().width;
      if (w > 0) setWidth(Math.floor(w));
    };

    measure();                        // immediate synchronous measurement

    roRef.current = new ResizeObserver(measure);
    roRef.current.observe(node);
  }, []);                             // stable callback — no deps needed

  // Clean up on component unmount
  useEffect(() => () => { roRef.current?.disconnect(); }, []);

  return [ref, width];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardBuilder() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const { data: dashboard, isLoading } = useDashboard(id);
  const addWidget    = useAddWidget();
  const updateWidget = useUpdateWidget();
  const deleteWidget = useDeleteWidget();
  const saveLayout   = useSaveLayout();

  const [editMode,        setEditMode]        = useState(false);
  const [showCatalog,     setShowCatalog]     = useState(false);
  const [showReportPicker, setShowReportPicker] = useState(false);
  const [editingWidget,   setEditingWidget]   = useState(null);
  const [panelPos,      setPanelPos]      = useState({ top: 80, left: 200 });
  const [deletedWidget, setDeletedWidget] = useState(null);

  // Global filter state
  const [globalFilters,    setGlobalFilters]    = useState({ dateFrom: '', dateTo: '', userId: '' });
  const [showGlobalFilter, setShowGlobalFilter] = useState(false);

  const { data: usersRaw } = useUsers({ limit: 500 });
  const usersList = usersRaw?.data || (Array.isArray(usersRaw) ? usersRaw : []);

  // Report picker helpers
  const STORAGE_KEY = 'biz_reports_v1';
  const savedReports = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
  }, []);

  const SYSTEM_REPORTS_FOR_WIDGET = [
    { id: 'sys_orders', type: 'standard', name: 'הזמנות', module: 'orders', joinModules: ['customers'], columns: ['orders:order_num','orders:order_name','customers:company_name','orders:status','orders:total','orders:created_at'], filters: [], groupBy: '' },
    { id: 'sys_deals', type: 'standard', name: 'עסקאות', module: 'deals', joinModules: ['customers'], columns: ['deals:deal_num','deals:deal_name','customers:company_name','deals:stage','deals:expected_close_date'], filters: [], groupBy: '' },
    { id: 'sys_quotes', type: 'standard', name: 'הצעות מחיר', module: 'quotes', joinModules: ['customers'], columns: ['quotes:quote_num','quotes:quote_name','customers:company_name','quotes:stage','quotes:created_at'], filters: [], groupBy: '' },
    { id: 'sys_customers', type: 'standard', name: 'לקוחות', module: 'customers', joinModules: [], columns: ['customers:cust_num','customers:company_name','customers:city','customers:phone','customers:status'], filters: [], groupBy: '' },
  ];
  const allReportOptions = [...SYSTEM_REPORTS_FOR_WIDGET, ...savedReports.filter(r => r.type === 'standard')];

  // Grid width — measured via callback ref (see useGridWidth above)
  const [gridContainerRef, gridWidth] = useGridWidth();

  // pendingLayoutRef: the latest layout received from onLayoutChange during edit mode.
  // Flushed immediately when the user clicks "done editing" so no drag is ever lost.
  const pendingLayoutRef = useRef(null);
  const saveTimerRef     = useRef(null);
  const undoTimerRef     = useRef(null);

  const widgets = dashboard?.widgets || [];

  const layouts = widgets.map(w => ({
    i:    String(w.id),
    x:    w.layout?.x    ?? 0,
    y:    w.layout?.y    ?? 0,
    w:    w.layout?.w    ?? 6,
    h:    w.layout?.h    ?? 4,
    minW: w.layout?.minW ?? 2,
    minH: w.layout?.minH ?? 2,
  }));

  // Called by GridLayout after every drag/resize.
  // Debounces the actual save by 800 ms and also keeps pendingLayoutRef up-to-date
  // so handleExitEditMode can flush it immediately if the user clicks "done" first.
  const handleLayoutChange = useCallback((newLayouts) => {
    if (!editMode) return;
    pendingLayoutRef.current = newLayouts;   // remember the latest layout
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveLayout.mutate({
        dashboardId: id,
        layouts: newLayouts.map(l => ({
          id: parseInt(l.i, 10), x: l.x, y: l.y, w: l.w, h: l.h,
        })),
      });
      pendingLayoutRef.current = null;
    }, 800);
  }, [editMode, id, saveLayout]);

  // Exit edit mode: flush any unsaved drag immediately instead of waiting for the timer.
  const handleExitEditMode = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    if (pendingLayoutRef.current) {
      saveLayout.mutate({
        dashboardId: id,
        layouts: pendingLayoutRef.current.map(l => ({
          id: parseInt(l.i, 10), x: l.x, y: l.y, w: l.w, h: l.h,
        })),
      });
      pendingLayoutRef.current = null;
    }
    setEditMode(false);
    setShowCatalog(false);
  }, [id, saveLayout]);

  const handleAddWidget = async (item) => {
    const { x, y } = nextPosition(widgets, item.defaultLayout.w, item.defaultLayout.h);
    await addWidget.mutateAsync({
      dashboardId: id,
      widget_type:  item.type,
      title:        item.defaultTitle,
      layout:       { x, y, ...item.defaultLayout },
      data_config:  item.defaultData,
      style_config: {},
    });
    setShowCatalog(false);
  };

  const handleAddReportWidget = async (report) => {
    const defaultLayout = { w: 12, h: 8, minW: 6, minH: 4 };
    const { x, y } = nextPosition(widgets, defaultLayout.w, defaultLayout.h);
    await addWidget.mutateAsync({
      dashboardId: id,
      widget_type: 'report',
      title: report.name,
      layout: { x, y, ...defaultLayout },
      data_config: { reportDef: report, limit: 50 },
      style_config: {},
    });
    setShowReportPicker(false);
    setShowCatalog(false);
  };

  const handleDeleteWidget = (widget) => {
    setDeletedWidget(widget);
    if (editingWidget?.id === widget.id) setEditingWidget(null);
    deleteWidget.mutate({ dashboardId: id, widgetId: widget.id });
    clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setDeletedWidget(null), 5000);
  };

  const handleEditWidget = (widget, e) => {
    setEditingWidget(widget);
    if (e) {
      const PANEL_W = 330;
      const PANEL_H = 520;
      const x    = e.clientX;
      const y    = e.clientY;
      const left = x + PANEL_W + 20 > window.innerWidth ? x - PANEL_W - 10 : x + 20;
      const top  = Math.min(y - 20, window.innerHeight - PANEL_H - 10);
      setPanelPos({ top: Math.max(10, top), left: Math.max(10, left) });
    }
  };

  const handleSaveConfig = async ({ widgetId, title, widget_type, data_config, style_config }) => {
    await updateWidget.mutateAsync({
      dashboardId: id,
      widgetId,
      title,
      widget_type,
      data_config,
      style_config,
    });
    setEditingWidget(null);
  };

  if (isLoading) {
    return (
      <div className="db-loading animate-in">
        <div className="db-spinner" /><p>טוען דשבורד...</p>
      </div>
    );
  }
  if (!dashboard) {
    return (
      <div className="db-loading">
        <p>דשבורד לא נמצא</p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboards')}>חזרה לרשימה</button>
      </div>
    );
  }

  const hasGlobalFilter = globalFilters.dateFrom || globalFilters.dateTo || globalFilters.userId;

  return (
    // direction:ltr is set in CSS (.db-builder) as an author-level rule so it wins
    // over body{direction:rtl}.  RTL content inside widgets / toolbar is restored via
    // explicit direction:rtl on those descendant elements.
    <div className="db-builder animate-in">

      {/* ── Toolbar — RTL restored via .db-toolbar{direction:rtl} ── */}
      <div className="db-toolbar">
        <div className="db-toolbar-right">
          <button className="btn btn-ghost" onClick={() => navigate('/dashboards')}>
            <i className="ti ti-arrow-right" /> חזרה
          </button>
          <h2 className="db-toolbar-title">{dashboard.name}</h2>
        </div>

        <div className="db-toolbar-left">
          <button
            className={`btn ${hasGlobalFilter ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowGlobalFilter(s => !s)}
            title="פילטר גלובלי"
          >
            <i className="ti ti-filter" />
            {hasGlobalFilter ? 'פילטר פעיל' : 'פילטר'}
          </button>

          {editMode && (
            <button className="btn btn-secondary" onClick={() => setShowCatalog(s => !s)}>
              <i className="ti ti-plus" /> הוסף וידג׳יט
            </button>
          )}

          {/* Toggle edit mode.  Entering edit: just flip the flag.
              Exiting edit: flush any pending drag save immediately. */}
          <button
            className={`btn ${editMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => editMode ? handleExitEditMode() : setEditMode(true)}
          >
            <i className={`ti ti-${editMode ? 'check' : 'edit'}`} />
            {editMode ? 'סיום עריכה' : 'ערוך'}
          </button>
        </div>
      </div>

      {/* ── Global filter bar — RTL restored via .db-global-filter{direction:rtl} ── */}
      {showGlobalFilter && (
        <div className="db-global-filter">
          <span className="cfg-label" style={{ marginBottom: 0 }}>טווח תאריכים:</span>
          <input
            type="date"
            className="cfg-input"
            style={{ width: 160 }}
            value={globalFilters.dateFrom}
            onChange={e => setGlobalFilters(f => ({ ...f, dateFrom: e.target.value }))}
          />
          <span style={{ color: 'var(--text-3)', fontSize: 13 }}>עד</span>
          <input
            type="date"
            className="cfg-input"
            style={{ width: 160 }}
            value={globalFilters.dateTo}
            onChange={e => setGlobalFilters(f => ({ ...f, dateTo: e.target.value }))}
          />
          <select
            className="cfg-input"
            style={{ width: 180 }}
            value={globalFilters.userId}
            onChange={e => setGlobalFilters(f => ({ ...f, userId: e.target.value }))}
          >
            <option value="">כל הנציגים</option>
            {usersList.map(u => (
              <option key={u.id} value={String(u.id)}>
                {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
              </option>
            ))}
          </select>
          {hasGlobalFilter && (
            <button
              className="btn btn-ghost"
              onClick={() => setGlobalFilters({ dateFrom: '', dateTo: '', userId: '' })}
            >
              <i className="ti ti-x" /> נקה
            </button>
          )}
        </div>
      )}

      <div className="db-main">

        {/* ── Widget Catalog Panel ── */}
        {showCatalog && (
          <div className="db-catalog">
            <div className="db-catalog-head">
              <span>בחר סוג וידג׳יט</span>
              <button className="widget-btn" onClick={() => setShowCatalog(false)}>
                <i className="ti ti-x" />
              </button>
            </div>
            {CATALOG.map(item => (
              <button
                key={item.type}
                className="db-catalog-item"
                onClick={() => handleAddWidget(item)}
                disabled={addWidget.isPending}
              >
                <i className={`ti ${item.icon}`} />
                <span>{item.label}</span>
              </button>
            ))}
            <button
              className="db-catalog-item"
              onClick={() => setShowReportPicker(true)}
            >
              <i className="ti ti-file-analytics" />
              <span>מדוח קיים</span>
            </button>
          </div>
        )}

        {/* ── Grid area ──
            db-grid-wrap:  scrolling container (overflow-y: auto).
            db-grid-inner: zero-padding measurement target for the callback ref;
                           getBoundingClientRect().width equals the exact pixel
                           budget for the grid — no manual subtraction needed.      */}
        <div className="db-grid-wrap">
          <div className="db-grid-inner" ref={gridContainerRef}>

            {widgets.length === 0 && (
              <div className="db-empty">
                <i className="ti ti-layout-dashboard" style={{ fontSize: 48, marginBottom: 12, display: 'block' }} />
                <p>{editMode ? 'לחץ על הוסף וידג׳יט כדי להתחיל' : 'לחץ על ערוך והוסף וידג׳יטים'}</p>
              </div>
            )}

            {/* Only render the grid after a real width measurement.
                Passing width=0 (the initial state before the callback ref fires)
                would give react-grid-layout a wrong column width, making drag
                coordinates shift and the right side of the grid unreachable.     */}
            {widgets.length > 0 && gridWidth > 0 && (
              <GridLayout
                className="db-grid"
                layout={layouts}
                cols={COLS}
                rowHeight={ROW_HEIGHT}
                width={gridWidth}
                onLayoutChange={handleLayoutChange}
                draggableHandle=".widget-drag-handle"
                isResizable={editMode}
                isDraggable={editMode}
                compactType={null}
                preventCollision={true}   // prevent widgets from overlapping each other
                margin={[10, 10]}
              >
                {widgets.map(w => (
                  <div key={String(w.id)} className="db-grid-item">
                    <WidgetWrapper
                      widget={w}
                      editMode={editMode}
                      onEdit={handleEditWidget}
                      onDelete={handleDeleteWidget}
                      globalFilters={globalFilters}
                    />
                  </div>
                ))}
              </GridLayout>
            )}

          </div>
        </div>

        {/* ── Config panel (floating) ── */}
        {editingWidget && (
          <WidgetConfigPanel
            widget={editingWidget}
            panelPos={panelPos}
            onSave={handleSaveConfig}
            onClose={() => setEditingWidget(null)}
          />
        )}
      </div>

      {/* ── Undo toast ── */}
      {deletedWidget && (
        <div className="db-toast">וידג׳יט נמחק</div>
      )}

      {/* ── Report picker modal ── */}
      {showReportPicker && (
        <div className="modal-overlay" onClick={() => setShowReportPicker(false)}>
          <div className="modal-box" style={{ width: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head" style={{ direction: 'rtl' }}>
              <h3>בחר דוח</h3>
              <button className="widget-btn" onClick={() => setShowReportPicker(false)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div style={{ padding: '12px 20px 20px', maxHeight: 420, overflowY: 'auto', direction: 'rtl' }}>
              {allReportOptions.length === 0 ? (
                <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '40px 0' }}>
                  אין דוחות שמורים. צור דוח בדף הדוחות תחילה.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allReportOptions.map(rpt => (
                    <button
                      key={rpt.id}
                      className="db-catalog-item"
                      style={{ width: '100%', justifyContent: 'flex-start', gap: 10 }}
                      onClick={() => handleAddReportWidget(rpt)}
                      disabled={addWidget.isPending}
                    >
                      <i className="ti ti-file-analytics" style={{ fontSize: 18, color: 'var(--accent)' }} />
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600 }}>{rpt.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {rpt.isSystem ? 'דוח מערכת' : 'דוח מותאם'} · {(rpt.columns || []).length} עמודות
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
