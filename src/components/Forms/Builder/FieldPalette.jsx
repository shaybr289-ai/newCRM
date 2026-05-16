import { FIELD_TYPES_BY_CATEGORY } from './FIELD_TYPES';
import { setDragPayload, clearDragPayload, log } from './dragState';

/**
 * Left panel — categorized list of draggable field types.
 * Drag uses a module-level payload (not dataTransfer) for reliability across
 * browsers, especially with React synthetic events.
 */
export default function FieldPalette({ onAddField, disabled }) {
  return (
    <aside className="builder-palette">
      <h3 className="palette-title"><i className="ti ti-package" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> ספריית שדות</h3>
      <p className="palette-hint">גרור לקאנבס, או לחץ להוספה לאזור הנבחר</p>

      {Object.entries(FIELD_TYPES_BY_CATEGORY).map(([category, items]) => (
        <div key={category} className="palette-category">
          <h4>{category}</h4>
          <div className="palette-grid">
            {items.map((ft) => (
              <div
                key={ft.type}
                className={`palette-item ${disabled ? 'is-disabled' : ''}`}
                draggable={!disabled}
                onDragStart={(e) => {
                  log(`dragStart palette type=${ft.type}`);
                  setDragPayload(ft.type);
                  try {
                    e.dataTransfer.setData('text/plain', ft.type);
                    e.dataTransfer.setData('application/x-biz-field-type', ft.type);
                    e.dataTransfer.effectAllowed = 'copy';
                  } catch (err) { log(`setData error: ${err?.message}`); }
                }}
                onDragEnd={() => { log('dragEnd palette'); clearDragPayload(); }}
                onClick={() => !disabled && onAddField(ft.type)}
                onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) onAddField(ft.type); }}
                role="button"
                tabIndex={disabled ? -1 : 0}
                title={ft.label}
              >
                <span className="palette-item-icon">
                  {ft.icon && ft.icon.startsWith('ti-')
                    ? <i className={`ti ${ft.icon}`} aria-hidden="true" />
                    : ft.icon}
                </span>
                <span className="palette-item-label">{ft.label}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
