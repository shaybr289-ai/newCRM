import { useState, useEffect, useRef } from 'react';
import { useGeofenceZones, useCreateGeofenceZone, useUpdateGeofenceZone, useDeleteGeofenceZone } from '../../hooks/useAttendance';
import { api } from '../../api/client';

const EMPTY_ZONE = { name: '', description: '', polygon: null, center_lat: null, center_lng: null, radius_meters: null, enforce: true, status: 'active', customer_id: null, site_id: null };

export default function GeofenceAdmin() {
  const { data, isLoading } = useGeofenceZones();
  const createZone = useCreateGeofenceZone();
  const updateZone = useUpdateGeofenceZone();
  const deleteZone = useDeleteGeofenceZone();

  const zones = data?.data || [];
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_ZONE);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [sites, setSites] = useState([]);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const drawnLayerRef = useRef(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Load customers + sites for the link dropdown
  useEffect(() => {
    api.get('/api/customers?limit=500').then(d => setCustomers(d?.data || [])).catch(() => {});
    api.get('/api/sites?limit=500').then(d => setSites(d?.data || [])).catch(() => {});
  }, []);

  // Load Leaflet dynamically
  useEffect(() => {
    if (window.L) { setMapReady(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const drawLink = document.createElement('link');
    drawLink.rel = 'stylesheet';
    drawLink.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css';
    document.head.appendChild(drawLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const drawScript = document.createElement('script');
      drawScript.src = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js';
      drawScript.onload = () => setMapReady(true);
      document.head.appendChild(drawScript);
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const L = window.L;
    if (leafletRef.current) return; // already initialized

    const map = L.map('geofence-map').setView([31.5, 34.8], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    drawnItems.addTo(map);
    drawnLayerRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems },
      draw: {
        polygon: { showArea: true },
        polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false,
      },
    });
    map.addControl(drawControl);

    map.on('draw:created', (e) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      const geoJson = e.layer.toGeoJSON().geometry;
      // Compute centroid and radius
      const coords = geoJson.coordinates[0];
      const lats = coords.map(c => c[1]);
      const lngs = coords.map(c => c[0]);
      const center_lat = lats.reduce((a,b) => a+b, 0) / lats.length;
      const center_lng = lngs.reduce((a,b) => a+b, 0) / lngs.length;
      let maxDist = 0;
      for (const [lng, lat] of coords) {
        const d = Math.sqrt((lat - center_lat)**2 + (lng - center_lng)**2) * 111000;
        if (d > maxDist) maxDist = d;
      }
      // Auto-open the new-zone form if no zone is currently selected,
      // so the user gets a name field + save button immediately after drawing.
      if (!selectedRef.current) {
        setSelected('new');
        setForm({ ...EMPTY_ZONE, polygon: geoJson, center_lat, center_lng, radius_meters: Math.round(maxDist) });
      } else {
        setForm(f => ({ ...f, polygon: geoJson, center_lat, center_lng, radius_meters: Math.round(maxDist) }));
      }
    });

    leafletRef.current = map;
  }, [mapReady]);

  // Show existing zones on map
  useEffect(() => {
    if (!leafletRef.current || zones.length === 0) return;
    const L = window.L;
    const map = leafletRef.current;
    // Add zone polygons as non-editable layers
    zones.forEach(z => {
      if (!z.polygon?.coordinates) return;
      const poly = L.geoJSON(z.polygon, { style: { color: '#3B82F6', weight: 2, opacity: 0.6, fillOpacity: 0.1 } });
      poly.bindTooltip(z.name);
      poly.addTo(map);
    });
  }, [zones, mapReady]);

  const selectZone = (z) => {
    setSelected(z.id);
    setForm({
      name: z.name, description: z.description || '',
      polygon: z.polygon, center_lat: z.center_lat, center_lng: z.center_lng, radius_meters: z.radius_meters,
      enforce: z.enforce, status: z.status,
      customer_id: z.customer_id || null, site_id: z.site_id || null,
    });
    setError('');
  };

  const openNew = () => {
    setSelected('new');
    setForm(EMPTY_ZONE);
    setError('');
    if (drawnLayerRef.current) drawnLayerRef.current.clearLayers();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name) return setError('שם חובה');
    if (!form.polygon) return setError('יש לצייר פוליגון על המפה');
    try {
      const payload = { ...form, polygon: JSON.stringify(form.polygon) };
      if (selected === 'new') await createZone.mutateAsync(payload);
      else await updateZone.mutateAsync({ id: selected, ...payload });
      setSelected(null);
    } catch (err) { setError(err?.message || 'שגיאה בשמירה'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('למחוק אזור זה?')) return;
    await deleteZone.mutateAsync(id);
    setSelected(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="att-section-title" style={{ margin: 0 }}>ניהול אזורי גיאו-גידור</p>
        <button className="btn btn-primary" onClick={openNew}>+ אזור חדש</button>
      </div>

      <div className="geofence-admin">
        {/* Sidebar: zone list + form */}
        <div className="geofence-sidebar">
          {isLoading && <p style={{ color: 'var(--text-2)', fontSize: 13 }}>טוען...</p>}

          {!selected && (
            <div style={{
              background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10,
              padding: 14, fontSize: 12, color: '#1E40AF', lineHeight: 1.6,
            }}>
              <strong>איך יוצרים אזור?</strong><br />
              1. לחץ <b>"+ אזור חדש"</b> או צייר ישירות פוליגון על המפה (אייקון המחומש בצד שמאל)<br />
              2. תפתח טופס: שם, לקוח/אתר, אכיפה<br />
              3. לחץ <b>"שמור"</b>
            </div>
          )}

          {selected && (
            <div className="att-table-wrap" style={{ padding: 16 }}>
              <form onSubmit={handleSave}>
                <div className="att-form-row full">
                  <label className="att-label">שם האזור *</label>
                  <input className="att-input" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div className="att-form-row full">
                  <label className="att-label">תיאור</label>
                  <input className="att-input" value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
                <div className="att-form-row full">
                  <label className="att-label">קישור ללקוח (אופציונלי)</label>
                  <select className="att-input" value={form.customer_id || ''} onChange={e => set('customer_id', e.target.value || null)}>
                    <option value="">-- לא משויך --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name || c.name || c.cust_num}</option>
                    ))}
                  </select>
                </div>
                <div className="att-form-row full">
                  <label className="att-label">קישור לאתר/סניף (אופציונלי)</label>
                  <select className="att-input" value={form.site_id || ''} onChange={e => set('site_id', e.target.value || null)}>
                    <option value="">-- לא משויך --</option>
                    {sites
                      .filter(s => !form.customer_id || s.customer_id === form.customer_id)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.site_name || s.name}</option>
                      ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <input type="checkbox" id="enforce-chk" checked={form.enforce} onChange={e => set('enforce', e.target.checked)} />
                  <label htmlFor="enforce-chk" style={{ fontSize: 13, cursor: 'pointer' }}>
                    אכוף (חסום דיווח מחוץ לאזור)
                  </label>
                </div>
                {form.polygon && (
                  <p style={{ fontSize: 11, color: '#10B981', marginBottom: 10 }}><i className="ti ti-circle-check" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> פוליגון מוגדר ({form.polygon.coordinates[0].length - 1} נקודות)</p>
                )}
                {!form.polygon && (
                  <p style={{ fontSize: 11, color: '#F59E0B', marginBottom: 10 }}><i className="ti ti-alert-triangle" aria-hidden="true" style={{ verticalAlign: '-2px', marginLeft: 4 }} /> צייר פוליגון על המפה</p>
                )}
                {error && <p style={{ color: '#EF4444', fontSize: 13 }}>{error}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={createZone.isPending || updateZone.isPending}>שמור</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>ביטול</button>
                </div>
              </form>
            </div>
          )}

          {zones.map(z => (
            <div key={z.id} className={`geofence-zone-card ${selected === z.id ? 'selected' : ''}`} onClick={() => selectZone(z)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{z.name}</div>
                  {z.description && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{z.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span style={{ fontSize: 10, background: z.enforce ? '#D1FAE5' : '#F3F4F6', color: z.enforce ? '#065F46' : '#6B7280', padding: '2px 6px', borderRadius: 99 }}>
                    {z.enforce ? 'אכוף' : 'אזהרה'}
                  </span>
                  <button className="btn btn-danger" style={{ fontSize: 10, padding: '2px 8px' }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(z.id); }}>
                    מחק
                  </button>
                </div>
              </div>
            </div>
          ))}

          {zones.length === 0 && !isLoading && (
            <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', padding: 20 }}>
              אין אזורים מוגדרים.<br />לחץ "אזור חדש" וצייר פוליגון על המפה.
            </p>
          )}
        </div>

        {/* Map */}
        <div id="geofence-map" ref={mapRef} style={{ minHeight: 500 }}>
          {!mapReady && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-2)', fontSize: 13 }}>
              טוען מפה...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
