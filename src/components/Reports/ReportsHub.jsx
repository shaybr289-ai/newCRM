import { useState } from 'react';
import useAuthStore from '../../store/authStore';
import TaskSubmissionsReport from './TaskSubmissionsReport';
import EmployeeAttendanceReport from '../Attendance/EmployeeAttendanceReport';
import AttendanceReportPage from '../Attendance/AttendanceReportPage';
import PolygonReport from '../Attendance/PolygonReport';
import ReportsPage from './ReportsPage';
import '../Tasks/TasksDashboard.css';

const STORAGE_KEY = 'biz_reports_v1';
function loadCustomReports() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }

const REPORT_TYPE_LABEL = { standard: 'מודולים', submissions: 'טפסים' };

// ── System reports registry ─────────────────────────────────────────────────
const SYSTEM_REPORTS = [
  {
    moduleId: 'tasks',
    moduleLabel: 'משימות',
    moduleIcon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4h6v3H9z"/><path d="M8 12l2 2 4-4"/>
      </svg>
    ),
    reports: [
      { id: 'task-submissions', label: 'דוח דיווחי משימות', desc: 'צפייה בהגשות טפסים לפי משימה, עובד ולקוח', component: <TaskSubmissionsReport /> },
    ],
  },
  {
    moduleId: 'attendance',
    moduleLabel: 'נוכחות',
    moduleIcon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    reports: [
      { id: 'attendance-employee', label: 'דוח נוכחות לעובד', desc: 'סיכום חודשי — ימי עבודה, שעות נטו ושעות נוספות', component: <EmployeeAttendanceReport /> },
      { id: 'attendance-visits', label: 'דוח ביקורי לקוחות', desc: 'פירוט יומי עם ביקורי לקוח, הפסקות ואנומליות', component: <AttendanceReportPage /> },
      { id: 'attendance-polygon', label: 'דוח נוכחות לפי פוליגון', desc: 'סיכום שעות לפי אזור גיאוגרפי / לקוח', component: <PolygonReport /> },
    ],
  },
];

// ── Shared back header ──────────────────────────────────────────────────────
function ReportHeader({ moduleLabel, label, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}>
        ← חזרה לדוחות
      </button>
      {moduleLabel && <><span style={{ fontSize: 12, color: 'var(--text-3)' }}>{moduleLabel}</span><span style={{ fontSize: 12, color: 'var(--text-3)' }}>›</span></>}
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{label}</span>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────
function canViewReport(rpt, user) {
  if (!user) return false;
  const hasProfiles = rpt.viewerProfileIds?.length > 0;
  const hasUsers = rpt.viewerUserIds?.length > 0;
  if (!hasProfiles && !hasUsers) return true; // no restriction
  if (rpt.createdBy && rpt.createdBy === user.id) return true;
  if (hasProfiles && user.profile_id && rpt.viewerProfileIds.includes(user.profile_id)) return true;
  if (hasUsers && rpt.viewerUserIds.includes(user.id)) return true;
  return false;
}

export default function ReportsHub() {
  const [activeReport, setActiveReport] = useState(null);
  const [customReports, setCustomReports] = useState(loadCustomReports);
  const [search, setSearch] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const user = useAuthStore(s => s.user);

  const refreshCustom = () => setCustomReports(loadCustomReports());

  const openSystem = (group, report) =>
    setActiveReport({ type: 'system', moduleLabel: group.moduleLabel, label: report.label, component: report.component });

  const openCustom = (rpt) =>
    setActiveReport({ type: 'custom', label: rpt.name, runReport: rpt });

  const handlePickType = (type) => {
    setShowTypePicker(false);
    const defaultEditReport = type === 'submissions'
      ? { id: null, type: 'submissions', name: '', formId: '', columns: [], joinCustomers: false, viewerProfileIds: [], viewerUserIds: [] }
      : { id: null, type: 'standard', name: '', module: 'customers', joinModules: [], columns: [], filters: [], groupBy: '', viewerProfileIds: [], viewerUserIds: [] };
    setActiveReport({ type: 'custom', label: 'דוח חדש', runReport: null, defaultView: 'build', defaultEditReport });
  };

  const handleBack = () => { refreshCustom(); setActiveReport(null); };

  // ── Full-screen mode ──────────────────────────────────────────────────────
  if (activeReport) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <ReportHeader moduleLabel={activeReport.moduleLabel} label={activeReport.label} onBack={handleBack} />
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeReport.type === 'system'
            ? activeReport.component
            : <ReportsPage
                defaultView={activeReport.defaultView || (activeReport.runReport ? 'run' : 'list')}
                defaultRunReport={activeReport.runReport || null}
                defaultEditReport={activeReport.defaultEditReport || null}
                onBack={handleBack}
              />
          }
        </div>
      </div>
    );
  }

  // ── Two-panel view ────────────────────────────────────────────────────────
  const visibleCustom = customReports.filter(r => canViewReport(r, user));
  const filteredCustom = search
    ? visibleCustom.filter(r => r.name.includes(search))
    : visibleCustom;

  const allSystemMatchCount = search
    ? SYSTEM_REPORTS.flatMap(g => g.reports).filter(r => r.label.includes(search) || r.desc?.includes(search)).length
    : null;

  return (
    <>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', gap: 12, padding: '0 18px 14px', boxSizing: 'border-box' }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="tdb-topbar">
        <div className="tdb-topbar-left">
          <span className="tdb-topbar-icon">
            <i className="ti ti-chart-bar" aria-hidden="true" />
          </span>
          <h1 className="tdb-topbar-title">דוחות</h1>
        </div>
        <div className="tdb-topbar-right">
          <button
            className="tdb-calendar-btn"
            onClick={() => setShowTypePicker(true)}
            style={{ background: 'rgba(255,255,255,.25)', borderColor: 'rgba(255,255,255,.5)', fontWeight: 700 }}
          >
            <i className="ti ti-plus" aria-hidden="true" /> דוח חדש
          </button>
        </div>
      </div>

      {/* ── Toolbar / search ─────────────────────────────────────────────── */}
      <div className="tdb-toolbar">
        <label className="tdb-filter-label">חיפוש:</label>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש דוח..."
          style={{ flex: '0 0 240px', padding: '5px 10px', borderRadius: 8, border: '1.5px solid #C5E3F7', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5B7FA6', fontSize: 12, padding: '2px 6px' }}
          >× נקה</button>
        )}
      </div>

      {/* ── Two panels ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 14 }}>

        {/* ── Right panel: System reports (45%) ──────────────────────────── */}
        <div style={{ flex: '0 0 45%', borderRadius: 12, border: '1.5px solid #C5E3F7', background: '#fff', overflow: 'auto', padding: '18px 16px' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#042C53', marginBottom: 16, marginTop: 0 }}>דוחות מערכת</h2>

          {SYSTEM_REPORTS.map(group => {
            const groupReports = search
              ? group.reports.filter(r => r.label.includes(search) || r.desc?.includes(search))
              : group.reports;
            if (search && !groupReports.length) return null;
            return (
              <div key={group.moduleId} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, paddingBottom: 5, borderBottom: '1px solid #C5E3F7' }}>
                  <span style={{ color: '#0A5E9A' }}>{group.moduleIcon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#5B7FA6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{group.moduleLabel}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {groupReports.map(report => (
                    <button key={report.id} onClick={() => openSystem(group, report)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '10px 12px', borderRadius: 8, border: '1.5px solid #C5E3F7', background: '#F0F7FF', cursor: 'pointer', textAlign: 'right', width: '100%', transition: 'border-color .15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#1A91D9'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#C5E3F7'}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#042C53' }}>{report.label}</span>
                      {report.desc && <span style={{ fontSize: 11, color: '#5B7FA6' }}>{report.desc}</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {search && allSystemMatchCount === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#5B7FA6', fontSize: 12 }}>לא נמצאו דוחות</div>
          )}
        </div>

        {/* ── Left panel: Custom reports (55%) ───────────────────────────── */}
        <div style={{ flex: 1, borderRadius: 12, border: '1.5px solid #C5E3F7', background: '#fff', overflow: 'auto', padding: '18px 16px' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#042C53', marginBottom: 16, marginTop: 0 }}>דוחות מותאמים</h2>

          {filteredCustom.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#5B7FA6', fontSize: 13 }}>
              {search ? 'לא נמצאו דוחות' : 'אין דוחות שמורים. צור דוח חדש.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {filteredCustom.map(rpt => (
                <button key={rpt.id} onClick={() => openCustom(rpt)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #C5E3F7', background: '#F0F7FF', cursor: 'pointer', textAlign: 'right', width: '100%', transition: 'border-color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#1A91D9'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#C5E3F7'}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#042C53' }}>{rpt.name}</span>
                    <span style={{ fontSize: 11, color: '#5B7FA6' }}>{REPORT_TYPE_LABEL[rpt.type] || rpt.type} · עודכן {rpt.updatedAt || '—'}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#0A5E9A' }}>פתח ←</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>

    {/* ── Type picker modal ────────────────────────────────────────────── */}
    {showTypePicker && (
      <div className="modal-overlay" onClick={() => setShowTypePicker(false)}>
        <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, padding: 28 }}>
          <h3 style={{ marginBottom: 6 }}>איזה סוג דוח לבנות?</h3>
          <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 22 }}>
            בחר את סוג הדוח שמתאים למה שאתה רוצה להציג.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button
              onClick={() => handlePickType('standard')}
              style={{ padding: 18, border: '1.5px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit' }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}><i className="ti ti-chart-bar" aria-hidden="true" /></div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>דוח מודולים</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                שילוב נתונים מהמודולים: לקוחות, אנשי קשר, עסקאות, הזמנות וכד'.
              </div>
            </button>
            <button
              onClick={() => handlePickType('submissions')}
              style={{ padding: 18, border: '1.5px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit' }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}><i className="ti ti-forms" aria-hidden="true" /></div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>דוח טפסים דיגיטליים</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                כל ההגשות של טופס מסוים בטבלה. כל שדה — עמודה, כל הגשה — שורה.
              </div>
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn-ghost" onClick={() => setShowTypePicker(false)}>ביטול</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
