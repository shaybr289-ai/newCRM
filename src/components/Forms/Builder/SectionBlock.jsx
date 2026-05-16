import { useState } from 'react';
import FieldBlock from './FieldBlock';
import { getDragPayload, clearDragPayload, log } from './dragState';

/**
 * Section card — header + 2-column grid of fields.
 * Drop a palette item anywhere on the section → field is appended.
 */
export default function SectionBlock({
  section,
  fields,                      // already sorted by sort_order
  selectedFieldId,
  selectedSectionId,
  onSelectSection,
  onSelectField,
  onFieldDelete,
  onFieldMoveUp,
  onFieldMoveDown,
  onFieldToggleFullWidth,
  onSectionEdit,
  onSectionDelete,
  onDropField,
}) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsOver(true);
  };
  const handleDragLeave = (e) => {
    if (e.currentTarget === e.target) setIsOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    const type = getDragPayload() || e.dataTransfer.getData('text/plain');
    clearDragPayload();
    if (!type) return;
    log(`drop on section=${section.title || section.id.slice(0,4)} type=${type}`);
    onDropField(section.id, type);
  };

  const isSelected = selectedSectionId === section.id;

  return (
    <div
      className={`section-block ${isSelected ? 'is-selected' : ''}`}
      onClick={() => onSelectSection(section.id)}
    >
      <div className="section-block-header">
        <input
          className="section-title-input"
          value={section.title || ''}
          placeholder="כותרת אזור..."
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onSectionEdit(section.id, { title: e.target.value })}
        />
        <button
          className="btn-icon-sm danger"
          title="מחק אזור (כולל השדות שבו)"
          onClick={(e) => { e.stopPropagation(); onSectionDelete(section.id); }}
        aria-label="מחק אזור"><i className="ti ti-trash" aria-hidden="true" /></button>
      </div>

      <div
        className={`section-block-grid ${isOver ? 'is-drop-target' : ''}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {fields.length === 0 && (
          <div className="section-empty">
            גרור שדה מהספרייה משמאל, או לחץ עליו כדי להוסיף לכאן
          </div>
        )}
        {fields.map((f, i) => (
          <FieldBlock
            key={f.id}
            field={f}
            selected={selectedFieldId === f.id}
            onSelect={onSelectField}
            onDelete={onFieldDelete}
            onMoveUp={onFieldMoveUp}
            onMoveDown={onFieldMoveDown}
            onToggleFullWidth={onFieldToggleFullWidth}
            isFirst={i === 0}
            isLast={i === fields.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
