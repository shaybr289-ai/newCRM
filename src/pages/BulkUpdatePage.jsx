import { useState } from 'react';
import FilterBuilder from '../components/BulkUpdate/FilterBuilder';
import BulkUpdateResults from '../components/BulkUpdate/BulkUpdateResults';
import BulkUpdateFieldSelect from '../components/BulkUpdate/BulkUpdateFieldSelect';
import BulkUpdateConfirm from '../components/BulkUpdate/BulkUpdateConfirm';
import BulkUpdateUndoBar from '../components/BulkUpdate/BulkUpdateUndoBar';
import { useBulkUpdate } from '../hooks/useBulkUpdate';

const STEPS = ['סינון רשומות', 'בחירת רשומות', 'עדכון שדה'];

export default function BulkUpdatePage() {
  const [step, setStep] = useState(0);
  const [moduleDef, setModuleDef] = useState(null);
  const [results, setResults] = useState(null);    // { data, total }
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmPayload, setConfirmPayload] = useState(null); // { field, value }
  const [lastUpdate, setLastUpdate] = useState(null); // { count, sessionId, entity }

  const bulkUpdateMut = useBulkUpdate(moduleDef?.endpoint || '');

  function handleResults(result, def, filters) {
    setResults(result);
    setSelectedIds(new Set());
    setStep(1);
  }

  function handleModuleChange(def) {
    setModuleDef(def);
    setResults(null);
    setSelectedIds(new Set());
    if (step > 0) setStep(0);
  }

  function handleExecuteRequest(payload) {
    setConfirmPayload(payload);
  }

  async function handleConfirm() {
    if (!confirmPayload || !moduleDef) return;
    try {
      const ids = [...selectedIds];
      const res = await bulkUpdateMut.mutateAsync({
        ids,
        field: confirmPayload.field,
        value: confirmPayload.value,
      });
      setLastUpdate({ count: res.updated, sessionId: res.sessionId, entity: moduleDef.endpoint });
      setConfirmPayload(null);
      setSelectedIds(new Set());
      setStep(0);
      setResults(null);
    } catch (err) {
      alert('שגיאה בעדכון: ' + err.message);
    }
  }

  const canProceedToStep2 = results && results.data && results.data.length > 0;
  const canProceedToStep3 = selectedIds.size > 0;

  const fieldDef = confirmPayload
    ? moduleDef?.fields?.find(f => f.key === confirmPayload.field)
    : null;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }} dir="rtl">

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
          עדכון המוני לרשומות
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
          סנן רשומות, בחר אותן ועדכן שדה בכולן בבת אחת
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
        {STEPS.map((label, i) => {
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 8,
                  background: isActive ? 'var(--accent)' : isDone ? 'var(--accent-light)' : 'var(--bg-page)',
                  border: `1px solid ${isActive ? 'var(--accent)' : isDone ? 'var(--accent)' : 'var(--border)'}`,
                  color: isActive ? '#fff' : isDone ? 'var(--accent)' : 'var(--text-2)',
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: isDone ? 'pointer' : 'default',
                  flex: 1, justifyContent: 'center',
                }}
                onClick={() => { if (isDone) setStep(i); }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: isActive ? 'rgba(255,255,255,0.25)' : isDone ? 'var(--accent)' : 'var(--border)',
                  color: isActive ? '#fff' : isDone ? '#fff' : 'var(--text-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {isDone ? '✓' : i + 1}
                </span>
                {label}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 20, height: 2, background: i < step ? 'var(--accent)' : 'var(--border)', flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12,
        border: '1px solid var(--border)', padding: '24px',
      }}>

        {/* Step 0: Filter */}
        {step === 0 && (
          <FilterBuilder
            onResults={handleResults}
            onModuleChange={handleModuleChange}
          />
        )}

        {/* Step 1: Select records */}
        {step === 1 && results && moduleDef && (
          <div>
            <BulkUpdateResults
              data={results.data}
              total={results.total}
              moduleDef={moduleDef}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setStep(0)}>חזור לסינון</button>
              <button
                className="btn btn-primary"
                disabled={!canProceedToStep3}
                onClick={() => setStep(2)}
              >
                המשך לעדכון ({selectedIds.size} רשומות)
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Field update */}
        {step === 2 && moduleDef && (
          <div>
            <BulkUpdateFieldSelect
              moduleDef={moduleDef}
              selectedCount={selectedIds.size}
              onExecute={handleExecuteRequest}
              isUpdating={bulkUpdateMut.isPending}
            />
            <div style={{ marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>חזור לבחירת רשומות</button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirmPayload && (
        <BulkUpdateConfirm
          count={selectedIds.size}
          fieldLabel={fieldDef?.label || confirmPayload.field}
          value={confirmPayload.value}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmPayload(null)}
          isUpdating={bulkUpdateMut.isPending}
        />
      )}

      {/* Undo snackbar */}
      {lastUpdate && (
        <BulkUpdateUndoBar
          updatedCount={lastUpdate.count}
          sessionId={lastUpdate.sessionId}
          entity={lastUpdate.entity}
          onDismiss={() => setLastUpdate(null)}
        />
      )}
    </div>
  );
}
