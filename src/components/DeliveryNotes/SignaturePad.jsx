import { useRef, useEffect, useState } from 'react';
import '../Customers/CustomerModal.css';

export default function SignaturePad({ onSave, onClose }) {
  const canvasRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Resize canvas to actual size
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e3a8a';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0] || e.changedTouches?.[0];
    return {
      x: (touch?.clientX ?? e.clientX) - rect.left,
      y: (touch?.clientY ?? e.clientY) - rect.top,
    };
  };

  const drawing = useRef(false);
  const lastPos = useRef(null);

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setIsEmpty(false);
  };

  const end = () => { drawing.current = false; lastPos.current = null; };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (isEmpty) { alert('לא נחתמה חתימה'); return; }
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, padding: 24 }}>
        <h3 style={{ marginBottom: 16 }}>חתימת לקוח</h3>
        <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 12 }}>
          חתום על האזור למטה עם האצבע / סטיילוס
        </p>
        <canvas
          ref={canvasRef}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          style={{
            width: '100%', height: 250, border: '2px dashed var(--accent)',
            borderRadius: 'var(--radius-md)', background: '#fff',
            cursor: 'crosshair', touchAction: 'none', display: 'block',
          }}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-start' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={isEmpty}>שמור חתימה</button>
          <button className="btn btn-secondary" onClick={handleClear}>נקה</button>
          <button className="btn btn-ghost" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </div>
  );
}
