import { useState, useEffect } from 'react';
import { authApi } from '../../api/client';

export default function MfaSetupModal({ onClose, onEnabled }) {
  const [step, setStep] = useState('loading'); // loading | scan | verify | done | disable
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);

  useEffect(() => {
    authApi.mfa.status().then(d => {
      setMfaEnabled(d.mfaEnabled);
      setStep(d.mfaEnabled ? 'disable' : 'scan');
      if (!d.mfaEnabled) startSetup();
    }).catch(() => setStep('scan'));
  }, []);

  const startSetup = async () => {
    setStep('loading');
    try {
      const data = await authApi.mfa.setup();
      setQrDataUrl(data.qrDataUrl);
      setSecret(data.secret);
      setStep('scan');
    } catch (err) {
      setError(err.message || 'שגיאה בהגדרת MFA');
      setStep('scan');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      await authApi.mfa.verifySetup(code.replace(/\s/g, ''));
      setStep('done');
      onEnabled?.(true);
    } catch (err) {
      setError(err.message || 'קוד שגוי — נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authApi.mfa.disable(password);
      onEnabled?.(false);
      onClose();
    } catch (err) {
      setError(err.message || 'שגיאה בביטול MFA');
    } finally {
      setLoading(false);
    }
  };

  const overlay = { position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,direction:'rtl' };
  const card = { background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:28,width:420,maxWidth:'90vw' };
  const title = { fontSize:18,fontWeight:700,color:'var(--text-1)',margin:'0 0 20px' };
  const field = { marginBottom:14 };
  const label = { display:'block',fontSize:13,color:'var(--text-2)',marginBottom:5,fontWeight:500 };
  const input = { width:'100%',padding:'9px 12px',border:'1px solid var(--border)',borderRadius:7,background:'var(--bg-elevated)',color:'var(--text-1)',fontSize:14,outline:'none',boxSizing:'border-box' };
  const btn = (primary) => ({ padding:'9px 18px',borderRadius:7,fontSize:13,fontWeight:600,cursor:'pointer',border:`1px solid ${primary?'var(--accent)':'var(--border)'}`,background:primary?'var(--accent)':'var(--bg-elevated)',color:primary?'#fff':'var(--text-1)',transition:'opacity 0.15s' });
  const errBox = { background:'#fee2e2',border:'1px solid #fca5a5',color:'#dc2626',padding:'8px 12px',borderRadius:7,fontSize:13,marginBottom:12 };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={card}>
        {step === 'loading' && (
          <p style={{ color:'var(--text-3)',textAlign:'center' }}>טוען...</p>
        )}

        {step === 'scan' && qrDataUrl && (
          <>
            <h2 style={title}>הגדרת אימות דו-שלבי (MFA)</h2>
            <p style={{ fontSize:13,color:'var(--text-2)',lineHeight:1.6,marginBottom:16 }}>
              סרוק את הקוד הבא באפליקציה כגון <strong>Google Authenticator</strong> או <strong>Authy</strong>:
            </p>
            <div style={{ textAlign:'center',marginBottom:16 }}>
              <img src={qrDataUrl} alt="QR Code" style={{ width:180,height:180,border:'4px solid #fff',borderRadius:8 }} />
            </div>
            <p style={{ fontSize:12,color:'var(--text-3)',textAlign:'center',marginBottom:16 }}>
              או הזן ידנית: <code style={{ background:'var(--bg-elevated)',padding:'2px 8px',borderRadius:5,fontSize:12,letterSpacing:2 }}>{secret}</code>
            </p>
            <form onSubmit={handleVerify}>
              {error && <div style={errBox}>{error}</div>}
              <div style={field}>
                <label style={label}>קוד אימות (6 ספרות)</label>
                <input
                  style={{ ...input, textAlign:'center',fontSize:20,letterSpacing:6 }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g,'')); setError(''); }}
                  placeholder="000000"
                  dir="ltr"
                  autoFocus
                />
              </div>
              <div style={{ display:'flex',gap:10,justifyContent:'flex-end',marginTop:8 }}>
                <button type="button" style={btn(false)} onClick={onClose}>ביטול</button>
                <button type="submit" style={btn(true)} disabled={loading || code.length < 6}>
                  {loading ? 'מאמת...' : 'אפשר MFA'}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign:'center',padding:'16px 0' }}>
            <i className="ti ti-shield-check" style={{ fontSize:52,color:'#16a34a' }} />
            <h2 style={{ color:'var(--text-1)',marginTop:12 }}>MFA הופעל בהצלחה!</h2>
            <p style={{ color:'var(--text-2)',fontSize:14 }}>מעכשיו תדרש להזין קוד בכל כניסה למערכת.</p>
            <button style={{ ...btn(true),marginTop:20 }} onClick={onClose}>סגור</button>
          </div>
        )}

        {step === 'disable' && (
          <>
            <h2 style={title}>ביטול אימות דו-שלבי</h2>
            <p style={{ fontSize:13,color:'var(--text-2)',marginBottom:16 }}>MFA פעיל על החשבון שלך. לביטול, הזן את הסיסמא שלך:</p>
            <form onSubmit={handleDisable}>
              {error && <div style={errBox}>{error}</div>}
              <div style={field}>
                <label style={label}>סיסמא</label>
                <input
                  style={input}
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="הסיסמא הנוכחית"
                  dir="ltr"
                  autoFocus
                />
              </div>
              <div style={{ display:'flex',gap:10,justifyContent:'flex-end',marginTop:8 }}>
                <button type="button" style={btn(false)} onClick={onClose}>ביטול</button>
                <button type="submit" style={{ ...btn(true),background:'#dc2626',borderColor:'#dc2626' }} disabled={loading}>
                  {loading ? 'מבטל...' : 'בטל MFA'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
