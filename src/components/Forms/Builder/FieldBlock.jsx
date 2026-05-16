/**
 * Grid-based FieldBlock — a card in a 2-column flow (no drag/resize).
 * Selected card shows a floating action bar (move up/down, full-width toggle, delete).
 */
export default function FieldBlock({
  field,
  selected,
  onSelect,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleFullWidth,
  isFirst,
  isLast,
}) {
  const isFull = !!field?.style_overrides?.full_width;

  return (
    <div
      className={`field-block ${selected ? 'is-selected' : ''} ${isFull ? 'full-width' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(field.id); }}
    >
      <div className="field-block-content">
        <FieldPreview field={field} />
      </div>

      {selected && (
        <div className="field-block-actions" onClick={(e) => e.stopPropagation()}>
          <span className="action-key" title="מפתח השדה">{field.field_key}</span>
          <button
            className="action-btn"
            onClick={() => onMoveUp(field.id)}
            disabled={isFirst}
            title="הזז למעלה"
          >↑</button>
          <button
            className="action-btn"
            onClick={() => onMoveDown(field.id)}
            disabled={isLast}
            title="הזז למטה"
          >↓</button>
          <button
            className={`action-btn ${isFull ? 'is-active' : ''}`}
            onClick={() => onToggleFullWidth(field.id)}
            title={isFull ? 'חצי רוחב' : 'רוחב מלא (שתי עמודות)'}
          >{isFull ? <i className="ti ti-layout-columns" aria-hidden="true" /> : <i className="ti ti-layout-sidebar" aria-hidden="true" />}</button>
          <button
            className="action-btn danger"
            onClick={() => onDelete(field.id)}
            title="מחק שדה"
            aria-label="מחק שדה"
          ><i className="ti ti-trash" aria-hidden="true" /></button>
        </div>
      )}
    </div>
  );
}

// ─── Preview ───────────────────────────────────────────────────────────
function FieldPreview({ field }) {
  const required = field.required ? <span style={{ color: '#DC2626' }}> *</span> : null;

  switch (field.field_type) {
    case 'heading':
      return <h3 className="preview-heading">{field.label || 'כותרת'}</h3>;
    case 'paragraph':
      return <p className="preview-paragraph">{field.label || 'טקסט פסקה...'}</p>;
    case 'divider':
      return <hr className="preview-divider" />;

    case 'textarea':
      return (
        <>
          <label className="preview-label">{field.label || field.field_key}{required}</label>
          <textarea className="preview-input" placeholder={field.placeholder || ''} disabled rows={3} />
        </>
      );

    case 'select':
      return (
        <>
          <label className="preview-label">{field.label || field.field_key}{required}</label>
          <select className="preview-input" disabled>
            <option>{field.placeholder || '-- בחר --'}</option>
            {(field.options || []).map((o, i) => <option key={i}>{o.label || o.value}</option>)}
          </select>
        </>
      );

    case 'radio':
      return (
        <>
          <label className="preview-label">{field.label || field.field_key}{required}</label>
          <div className="preview-options">
            {(field.options || []).map((o, i) => (
              <label key={i}><input type="radio" disabled /> {o.label || o.value}</label>
            ))}
          </div>
        </>
      );

    case 'checkbox':
      return (
        <>
          <label className="preview-label">{field.label || field.field_key}{required}</label>
          <div className="preview-options">
            {(field.options || []).map((o, i) => (
              <label key={i}><input type="checkbox" disabled /> {o.label || o.value}</label>
            ))}
          </div>
        </>
      );

    case 'toggle':
      return (
        <>
          <label className="preview-label">{field.label || field.field_key}{required}</label>
          <div className="preview-toggle">
            <span className="toggle-track"><span className="toggle-thumb" /></span>
            {field.placeholder || 'הפעל'}
          </div>
        </>
      );

    case 'multi_select':
      return (
        <>
          <label className="preview-label">{field.label || field.field_key}{required}</label>
          <div className="preview-options">
            {(field.options || []).map((o, i) => (
              <label key={i}><input type="checkbox" disabled /> {o.label || o.value}</label>
            ))}
          </div>
        </>
      );

    case 'rating': {
      const max = Number(field.validation?.max) || 5;
      return (
        <>
          <label className="preview-label">{field.label || field.field_key}{required}</label>
          <div className="preview-rating">
            {Array.from({ length: max }, (_, i) => <span key={i} className="preview-star">☆</span>)}
          </div>
        </>
      );
    }

    case 'slider': {
      const min = field.validation?.min ?? 0;
      const max2 = field.validation?.max ?? 100;
      return (
        <>
          <label className="preview-label">{field.label || field.field_key}{required}</label>
          <div className="preview-slider-wrap">
            <input type="range" min={min} max={max2} disabled className="preview-slider" />
            <span className="preview-slider-val">{min}</span>
          </div>
        </>
      );
    }

    case 'signature':
      return (
        <>
          <label className="preview-label">{field.label || field.field_key}{required}</label>
          <div className="preview-signature"><i className="ti ti-signature" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> חתימה דיגיטלית</div>
        </>
      );

    case 'file':
      return (
        <>
          <label className="preview-label">{field.label || field.field_key}{required}</label>
          <div className="preview-file"><i className="ti ti-file-upload" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> בחר קובץ...</div>
        </>
      );

    case 'image':
      return (
        <>
          <label className="preview-label">{field.label || field.field_key}{required}</label>
          <div className="preview-file"><i className="ti ti-camera" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> תמונה / צילום</div>
        </>
      );

    case 'module_lookup': {
      const mod = field.module_link?.module || '';
      return (
        <>
          <label className="preview-label">{field.label || field.field_key}{required}</label>
          <div className="preview-lookup"><i className="ti ti-search" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> חיפוש{mod ? ` ב${mod}` : ''}...</div>
        </>
      );
    }

    case 'spacer':
      return <div className="preview-spacer" style={{ height: 16 }} />;

    default: {
      const typeMap = {
        email: 'email', phone: 'tel', url: 'url', number: 'number',
        currency: 'number', percentage: 'number',
        date: 'date', time: 'time', datetime: 'datetime-local',
      };
      const inputType = typeMap[field.field_type] || 'text';
      return (
        <>
          <label className="preview-label">{field.label || field.field_key}{required}</label>
          <input className="preview-input" type={inputType} placeholder={field.placeholder || ''} disabled />
        </>
      );
    }
  }
}
