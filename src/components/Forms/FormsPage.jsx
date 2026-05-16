import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useForms, useCreateForm, useDuplicateForm,
  usePublishForm, useArchiveForm, useDeleteForm,
} from '../../hooks/useForms';
import ModuleTopbar from '../Layout/ModuleTopbar';
import './FormsPage.css';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  active:   { label: 'פעיל',     bg: '#E8F8F0', text: '#0A6B3C', dot: '#00C875' },
  draft:    { label: 'טיוטה',    bg: '#FFF8E1', text: '#7A5700', dot: '#FFB900' },
  archived: { label: 'לא פעיל', bg: '#F5F5F5', text: '#757575', dot: '#9E9E9E' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span className="fo-badge" style={{ background: cfg.bg, color: cfg.text }}>
      <span className="fo-badge-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function KpiStrip({ forms }) {
  const active   = forms.filter(f => f.status === 'active').length;
  const drafts   = forms.filter(f => f.status === 'draft').length;
  const archived = forms.filter(f => f.status === 'archived').length;

  const kpis = [
    { label: 'סה"כ טפסים', value: forms.length, color: 'var(--fo-dark)',    icon: <IconForms />,   sub: 'כולל כל המצבים'    },
    { label: 'פעילים',      value: active,        color: 'var(--fo-success)', icon: <IconActive />,  sub: 'מסונכרן למובייל'   },
    { label: 'טיוטות',      value: drafts,        color: 'var(--fo-warning)', icon: <IconDraft />,   sub: 'ממתין לפרסום'      },
    { label: 'לא פעילים',   value: archived,      color: 'var(--fo-muted)',   icon: <IconArchived />, sub: 'מוסתר ממשתמשים'   },
  ];

  return (
    <div className="fo-kpi-strip">
      {kpis.map((k, i) => (
        <div key={i} className="fo-kpi-card" style={{ animationDelay: (0.05 + i * 0.07) + 's' }}>
          <div className="fo-kpi-top">
            <div>
              <div className="fo-kpi-value" style={{ color: k.color }}>{k.value}</div>
              <div className="fo-kpi-label">{k.label}</div>
            </div>
            <div className="fo-kpi-icon">{k.icon}</div>
          </div>
          <div className="fo-kpi-sub">{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

function FormCard({ form, onEdit, onSubmissions, onTogglePublish, onDuplicate, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const isActive = form.status === 'active';

  return (
    <div
      className={`fo-card${hovered ? ' fo-card--hover' : ''}${isActive ? ' fo-card--active' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="fo-card-header">
        <div className="fo-card-icon-wrap" style={{ background: isActive ? 'var(--fo-b50)' : '#F5F5F5' }}>
          <span style={{ fontSize: 20 }}><i className={`ti ${form.icon || 'ti-forms'}`} aria-hidden="true" /></span>
        </div>
        <div className="fo-card-meta">
          <div className="fo-card-num">{form.form_num}</div>
          {form.category && <div className="fo-card-category">{form.category}</div>}
        </div>
        <StatusBadge status={form.status} />
      </div>

      {/* Name + description */}
      <h3 className="fo-card-name">{form.name}</h3>
      {form.description && <p className="fo-card-desc">{form.description}</p>}

      <div className="fo-card-version">גרסה {form.version}</div>

      {/* Actions */}
      <div className="fo-card-actions">
        <button className="fo-btn fo-btn--primary" onClick={() => onEdit(form)}>
          <IconEdit /> ערוך
        </button>
        <button className="fo-btn fo-btn--secondary" onClick={() => onSubmissions(form)}>
          <IconSubmissions /> הגשות
        </button>
        <button
          className={`fo-btn ${isActive ? 'fo-btn--warn' : 'fo-btn--success'}`}
          title={isActive ? 'השבת — יוסתר ממשתמשי המובייל' : 'הפעל — יסונכרן למובייל'}
          onClick={() => onTogglePublish(form)}
        >
          {isActive ? <><IconPause /> השבת</> : <><IconPlay /> הפעל</>}
        </button>
        <div className="fo-card-icons">
          <button className="fo-icon-btn" title="שכפל" onClick={() => onDuplicate(form)}>
            <IconDuplicate />
          </button>
          <button className="fo-icon-btn fo-icon-btn--danger" title="מחק" onClick={() => onDelete(form)}>
            <IconTrash />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FormsPage() {
  const navigate = useNavigate();
  const [search, setSearch]                 = useState('');
  const [filter, setFilter]                 = useState('');
  const [showNew, setShowNew]               = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);

  const { data, isLoading, error } = useForms({ limit: 200, search });
  const createMut    = useCreateForm();
  const duplicateMut = useDuplicateForm();
  const publishMut   = usePublishForm();
  const archiveMut   = useArchiveForm();
  const deleteMut    = useDeleteForm();

  const forms = data?.data || [];

  const filteredForms = useMemo(() => {
    if (!filter) return forms;
    return forms.filter(f => f.status === filter);
  }, [forms, filter]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreate = async (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const created = await createMut.mutateAsync({ name: trimmed, status: 'draft' });
    setShowNew(false);
    navigate(`/forms/${created.id}/edit`);
  };

  const handleDuplicate = async (form) => {
    const dup = await duplicateMut.mutateAsync(form.id);
    navigate(`/forms/${dup.id}/edit`);
  };

  const handleTogglePublish = (form) => {
    if (form.status === 'active') { setConfirmDeactivate(form); return; }
    publishMut.mutate(form.id);
  };

  const handleConfirmDeactivate = async () => {
    if (!confirmDeactivate) return;
    await archiveMut.mutateAsync(confirmDeactivate.id);
    setConfirmDeactivate(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteMut.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  const FILTERS = [
    { key: '',         label: 'הכל',       count: forms.length },
    { key: 'active',   label: 'פעילים',    count: forms.filter(f => f.status === 'active').length },
    { key: 'draft',    label: 'טיוטות',    count: forms.filter(f => f.status === 'draft').length },
    { key: 'archived', label: 'לא פעילים', count: forms.filter(f => f.status === 'archived').length },
  ];

  return (
    <div className="fo-page">

      <ModuleTopbar icon="ti-forms" title="טפסים דיגיטליים">
        <button className="tdb-calendar-btn" onClick={() => setShowNew(true)}>
          <i className="ti ti-plus" /> טופס חדש
        </button>
      </ModuleTopbar>

      {/* KPI Strip */}
      <KpiStrip forms={forms} />

      {/* Toolbar */}
      <div className="fo-toolbar">
        <div className="fo-search-wrap">
          <IconSearch />
          <input
            className="fo-search"
            placeholder="חיפוש לפי שם / מספר טופס..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="fo-pills">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`fo-pill${filter === f.key ? ' fo-pill--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className={`fo-pill-count${filter === f.key ? ' fo-pill-count--active' : ''}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* States */}
      {isLoading && (
        <div className="fo-state">
          <div className="fo-spinner" />
          <span>טוען טפסים...</span>
        </div>
      )}
      {error && (
        <div className="fo-state fo-state--error">שגיאה: {String(error.message || error)}</div>
      )}
      {!isLoading && !error && filteredForms.length === 0 && (
        <div className="fo-state">
          <div className="fo-empty-icon"><i className="ti ti-forms" aria-hidden="true" /></div>
          <div className="fo-empty-title">
            {filter ? `אין טפסים ב"${STATUS_CFG[filter]?.label || filter}"` : 'אין טפסים עדיין'}
          </div>
          <div className="fo-empty-sub">לחץ על "טופס חדש" כדי להתחיל לבנות</div>
        </div>
      )}

      {/* Grid */}
      {!isLoading && filteredForms.length > 0 && (
        <>
          <div className="fo-section-header">
            <span className="fo-section-count">{filteredForms.length} טפסים</span>
          </div>
          <div className="fo-grid">
            {filteredForms.map((f, i) => (
              <div key={f.id} style={{ animationDelay: (i * 0.06) + 's' }} className="fo-card-anim">
                <FormCard
                  form={f}
                  onEdit={form => navigate(`/forms/${form.id}/edit`)}
                  onSubmissions={form => navigate(`/forms/${form.id}/submissions`)}
                  onTogglePublish={handleTogglePublish}
                  onDuplicate={handleDuplicate}
                  onDelete={setConfirmDelete}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* FAB */}
      <button className="fo-fab" onClick={() => setShowNew(true)} title="טופס חדש">+</button>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {showNew && (
        <NewFormModal
          onClose={() => setShowNew(false)}
          onCreate={handleCreate}
          busy={createMut.isPending}
        />
      )}

      {confirmDeactivate && (
        <div className="fo-overlay" onClick={() => setConfirmDeactivate(null)}>
          <div className="fo-modal" onClick={e => e.stopPropagation()}>
            <div className="fo-modal-header">
              <h3>השבתת טופס</h3>
              <button className="fo-modal-close" onClick={() => setConfirmDeactivate(null)} aria-label="סגור"><i className="ti ti-x" aria-hidden="true" /></button>
            </div>
            <p className="fo-modal-body">
              האם להשבית את <strong>{confirmDeactivate.name}</strong>?
            </p>
            <ul className="fo-modal-list">
              <li>הטופס לא יוצג יותר למשתמשי אפליקציית המובייל</li>
              <li>סנכרון הבא ימחק אותו ממכשירי הקצה</li>
              <li>הגשות קודמות נשמרות ולא יושפעו</li>
              <li>תוכל להפעיל אותו שוב בכל עת</li>
            </ul>
            <div className="fo-modal-footer">
              <button className="fo-btn fo-btn--ghost" onClick={() => setConfirmDeactivate(null)}>ביטול</button>
              <button
                className="fo-btn fo-btn--warn"
                onClick={handleConfirmDeactivate}
                disabled={archiveMut.isPending}
              >
                {archiveMut.isPending ? 'משבית...' : 'השבת טופס'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fo-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="fo-modal" onClick={e => e.stopPropagation()}>
            <div className="fo-modal-header">
              <h3>מחיקת טופס</h3>
              <button className="fo-modal-close" onClick={() => setConfirmDelete(null)} aria-label="סגור"><i className="ti ti-x" aria-hidden="true" /></button>
            </div>
            <p className="fo-modal-body">
              האם למחוק את <strong>{confirmDelete.name}</strong>?<br />
              <span className="fo-modal-warning">פעולה זו תמחק גם את כל ההגשות ואינה ניתנת לביטול.</span>
            </p>
            <div className="fo-modal-footer">
              <button className="fo-btn fo-btn--ghost" onClick={() => setConfirmDelete(null)}>ביטול</button>
              <button
                className="fo-btn fo-btn--danger"
                onClick={handleDelete}
                disabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? 'מוחק...' : 'מחק לצמיתות'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Form Modal ───────────────────────────────────────────────────────────

function NewFormModal({ onClose, onCreate, busy }) {
  const [name, setName] = useState('');
  return (
    <div className="fo-overlay" onClick={onClose}>
      <div className="fo-modal" onClick={e => e.stopPropagation()}>
        <div className="fo-modal-header">
          <h3>טופס חדש</h3>
          <button className="fo-modal-close" onClick={onClose} aria-label="סגור"><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
        <p className="fo-modal-body">
          הטופס ייווצר במצב "טיוטה". לאחר העריכה תוכל לפרסם אותו והוא יסתנכרן לאפליקציות הסלולריות.
        </p>
        <div className="fo-field">
          <label className="fo-field-label">שם הטופס *</label>
          <input
            className="fo-field-input"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onCreate(name); }}
            placeholder='למשל: "סקר שביעות רצון", "טופס קבלת רכב"'
          />
        </div>
        <div className="fo-modal-footer">
          <button className="fo-btn fo-btn--ghost" onClick={onClose}>ביטול</button>
          <button
            className="fo-btn fo-btn--primary"
            onClick={() => onCreate(name)}
            disabled={busy || !name.trim()}
          >
            {busy ? 'יוצר...' : 'צור והמשך לעורך ←'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const I = ({ d, d2 }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />{d2 && <path d={d2} />}
  </svg>
);

const IconForms      = () => <I d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" d2="M9 3h6v4H9z M9 12h6 M9 16h4" />;
const IconActive     = () => <I d="M22 11.08V12a10 10 0 11-5.93-9.14" d2="M22 4L12 14.01l-3-3" />;
const IconDraft      = () => <I d="M12 20h9 M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />;
const IconArchived   = () => <I d="M21 8v13H3V8 M1 3h22v5H1z M10 12h4" />;
const IconEdit       = () => <I d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" d2="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />;
const IconSubmissions= () => <I d="M4 4h16v16H4z M9 9h6 M9 13h6 M9 17h4" />;
const IconPlay       = () => <I d="M5 3l14 9-14 9V3z" />;
const IconPause      = () => <I d="M6 4h4v16H6z M14 4h4v16h-4z" />;
const IconDuplicate  = () => <I d="M20 9H11a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z" d2="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />;
const IconTrash      = () => <I d="M3 6h18 M19 6l-1 14H6L5 6 M8 6V4h8v2" />;
const IconSearch     = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
