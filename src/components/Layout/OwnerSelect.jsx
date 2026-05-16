import { useUsers } from '../../hooks/useUsers';

/**
 * Shared owner/user dropdown — use in any entity form
 */
export default function OwnerSelect({ value, onChange, label = 'בעלים' }) {
  const { data } = useUsers();
  const users = data?.data || [];

  return (
    <div className="form-field">
      <label>{label}</label>
      <select value={value || ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">-- בחר משתמש --</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email || u.id}
          </option>
        ))}
      </select>
    </div>
  );
}
