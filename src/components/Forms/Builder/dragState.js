/**
 * Module-level state for the currently dragged field type.
 *
 * React's synthetic dragOver/drop events combined with HTML5 dataTransfer
 * have cross-browser quirks (especially when dragging from a button-like
 * element). Using a plain JS variable here is more reliable: drag start
 * sets it, drag end clears it, drop reads it.
 */
let _dragType = null;
const _listeners = new Set();
const _events = [];

export function setDragPayload(type) {
  _dragType = type;
  log(`setDragPayload(${type})`);
}
export function getDragPayload()      { return _dragType; }
export function clearDragPayload()    {
  _dragType = null;
  log('clearDragPayload');
}

// ── Lightweight event log for in-UI debugging ───────────────────────────
export function log(msg) {
  const stamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  const line = `[${stamp}] ${msg}`;
  console.log('[builder]', line);
  _events.push(line);
  if (_events.length > 25) _events.shift();
  for (const cb of _listeners) try { cb([..._events]); } catch {}
}
export function subscribeLog(cb) {
  _listeners.add(cb);
  cb([..._events]);
  return () => _listeners.delete(cb);
}
export function clearLog() { _events.length = 0; for (const cb of _listeners) try { cb([]); } catch {} }
