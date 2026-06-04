import { useMemo } from 'react';
import { useWidgetData } from '../../hooks/useWidgetData';
import { useUsers } from '../../hooks/useUsers';
import KpiCard         from './Widgets/KpiCard';
import BarChartWidget  from './Widgets/BarChartWidget';
import TableWidget     from './Widgets/TableWidget';
import ReportWidget    from './Widgets/ReportWidget';

const REGISTRY = {
  kpi:          KpiCard,
  bar_chart:    BarChartWidget,
  column_chart: BarChartWidget,
  table:        TableWidget,
  report:       ReportWidget,
};

const DEFAULT_STYLE = {
  backgroundColor: '#FFFFFF',
  chartPalette: ['#7C3AED','#10B981','#F97316','#3B82F6','#EAB308','#EF4444'],
  conditionalColors: { positive: '#10B981', negative: '#EF4444' },
  showGrid: true,
  showLegend: false,
};

export default function WidgetWrapper({ widget, editMode, onEdit, onDelete, globalFilters }) {
  const config = widget.data_config  || {};
  const style  = { ...DEFAULT_STYLE, ...(widget.style_config || {}) };

  const { chartData, rows, isLoading, error } = useWidgetData(config, globalFilters);

  const { data: usersRaw } = useUsers({ limit: 500 });
  const usersById = useMemo(() => {
    const list = usersRaw?.data || (Array.isArray(usersRaw) ? usersRaw : []);
    const map = {};
    for (const u of list) {
      map[String(u.id)] = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || String(u.id);
    }
    return map;
  }, [usersRaw]);

  const Component = REGISTRY[widget.widget_type];

  return (
    <div
      className="widget-card"
      style={{ background: style.backgroundColor }}
    >
      {/* Header / drag handle */}
      <div className="widget-header widget-drag-handle">
        <span className="widget-title">{widget.title || '—'}</span>
        <div className="widget-actions" onMouseDown={e => e.stopPropagation()}>
          {/* Edit button — always visible so user can configure without scrolling */}
          <button
            className="widget-btn-edit"
            title="ערוך וידג׳יט"
            onClick={e => onEdit?.(widget, e)}
          >
            <i className="ti ti-settings" />
          </button>
          {editMode && (
            <button className="widget-btn danger" title="מחק" onClick={() => onDelete?.(widget)}>
              <i className="ti ti-trash" />
            </button>
          )}
        </div>
      </div>

      {/* Subtitle */}
      {config.subtitle && (
        <div className="widget-subtitle">{config.subtitle}</div>
      )}

      {/* Body */}
      <div className="widget-body">
        {isLoading && <div className="widget-loading"><div className="widget-spinner" /></div>}
        {!isLoading && error && (
          <div className="widget-error">
            <i className="ti ti-alert-circle" /> שגיאה בטעינת נתונים
          </div>
        )}
        {!isLoading && !error && Component && (
          <Component
            chartData={chartData}
            rows={rows}
            config={config}
            style={style}
            widgetType={widget.widget_type}
            usersById={usersById}
          />
        )}
        {!isLoading && !error && !Component && (
          <div className="widget-empty">סוג וידג׳יט לא נתמך: {widget.widget_type}</div>
        )}
      </div>
    </div>
  );
}
