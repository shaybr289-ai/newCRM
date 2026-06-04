import { useState, useEffect } from 'react';
import DataSourceSelector from './DataSourceSelector';
import FilterBuilder      from './FilterBuilder';
import StyleEditor        from './StyleEditor';

const CHART_TYPES = [
  { key: 'kpi',          label: 'KPI / מספר',    icon: 'ti-123' },
  { key: 'bar_chart',    label: 'עמודות',         icon: 'ti-chart-bar' },
  { key: 'column_chart', label: 'טורים אופקיים',  icon: 'ti-chart-bar' },
  { key: 'table',        label: 'טבלה',           icon: 'ti-table' },
];

const TABS = [
  { key: 'data',   label: 'נתונים',  icon: 'ti-database' },
  { key: 'filter', label: 'פילטרים', icon: 'ti-filter' },
  { key: 'style',  label: 'עיצוב',   icon: 'ti-palette' },
];

export default function WidgetConfigPanel({ widget, panelPos, onSave, onClose }) {
  const [tab, setTab] = useState('data');
  const [title, setTitle]           = useState(widget?.title || '');
  const [widgetType, setWidgetType] = useState(widget?.widget_type || 'kpi');
  const [dataConfig, setDataConfig] = useState(widget?.data_config  || {});
  const [styleConfig, setStyleConfig] = useState(widget?.style_config || {});

  // Sync when widget changes (open different widget)
  useEffect(() => {
    setTitle(widget?.title || '');
    setWidgetType(widget?.widget_type || 'kpi');
    setDataConfig(widget?.data_config  || {});
    setStyleConfig(widget?.style_config || {});
    setTab('data');
  }, [widget?.id]);

  const handleSave = () => {
    onSave({
      widgetId:     widget.id,
      title,
      widget_type:  widgetType,
      data_config:  dataConfig,
      style_config: styleConfig,
    });
  };

  if (!widget) return null;

  const posStyle = panelPos
    ? { top: panelPos.top, left: panelPos.left }
    : { top: 80, left: 200 };

  return (
    <div className="cfg-panel" style={posStyle}>
      {/* Header */}
      <div className="cfg-panel-head">
        <span className="cfg-panel-title">הגדרות וידג׳יט</span>
        <button className="widget-btn" onClick={onClose}>
          <i className="ti ti-x" />
        </button>
      </div>

      {/* Title field */}
      <div style={{ padding: '12px 16px 0' }}>
        <div className="cfg-label">כותרת</div>
        <input
          className="cfg-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="כותרת הוידג׳יט..."
        />
      </div>

      {/* Chart type selector */}
      <div style={{ padding: '12px 16px 0' }}>
        <div className="cfg-label">סוג תצוגה</div>
        <div className="cfg-type-grid">
          {CHART_TYPES.map(t => (
            <button
              key={t.key}
              type="button"
              className={`cfg-type-btn${widgetType === t.key ? ' active' : ''}`}
              onClick={() => setWidgetType(t.key)}
            >
              <i className={`ti ${t.icon}`} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="cfg-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`cfg-tab${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <i className={`ti ${t.icon}`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="cfg-body">
        {tab === 'data' && (
          <DataSourceSelector config={dataConfig} onChange={setDataConfig} />
        )}
        {tab === 'filter' && (
          <FilterBuilder config={dataConfig} onChange={setDataConfig} />
        )}
        {tab === 'style' && (
          <StyleEditor style={styleConfig} onChange={setStyleConfig} />
        )}
      </div>

      {/* Footer */}
      <div className="cfg-panel-footer">
        <button className="btn btn-ghost" onClick={onClose}>ביטול</button>
        <button className="btn btn-primary" onClick={handleSave}>שמור שינויים</button>
      </div>
    </div>
  );
}
