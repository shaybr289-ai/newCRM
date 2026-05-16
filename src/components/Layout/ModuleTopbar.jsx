import '../Tasks/TasksDashboard.css';

/**
 * Standard blue top-bar for module list pages.
 * icon   — tabler icon class, e.g. "ti-users"
 * title  — Hebrew module name
 * children — action buttons rendered on the left side
 */
export default function ModuleTopbar({ icon, title, children }) {
  return (
    <div className="tdb-topbar" style={{ borderRadius: 14, marginBottom: 12 }}>
      <div className="tdb-topbar-left">
        {icon && (
          <span className="tdb-topbar-icon">
            <i className={`ti ${icon}`} aria-hidden="true" />
          </span>
        )}
        <h1 className="tdb-topbar-title">{title}</h1>
      </div>
      {children && (
        <div className="tdb-topbar-right">{children}</div>
      )}
    </div>
  );
}
