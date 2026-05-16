import { useState, useRef, useEffect } from 'react';
import { api } from '../../api/client';
import './AIAssistantPage.css';
import ModuleTopbar from '../Layout/ModuleTopbar';

const EXAMPLES = [
  'הצג את כל העסקאות הפתוחות',
  'כמה לקוחות פעילים יש במערכת?',
  'הצג את כל הצעות המחיר מהחודש האחרון',
  'מה ההסכמים שעומדים לפוג בקרוב?',
  'רשימת אנשי קשר של לקוח X',
  'סכם את כל העסקאות לפי שלב',
];

/** Simple markdown renderer: bold, tables, newlines */
function renderMarkdown(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Table row
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').filter(c => c.trim());
      // Separator row (---) — skip
      if (cells.every(c => /^[\s\-:]+$/.test(c))) return null;
      // Check if next line is separator => this is a header
      const isHeader = lines[i + 1] && /^\|[\s\-:|]+\|$/.test(lines[i + 1]);
      return (
        <div key={i} className="ai-md-table-row">
          {cells.map((cell, j) => (
            <div
              key={j}
              className={`ai-md-table-cell${isHeader ? ' ai-md-table-cell--header' : ''}`}
            >
              {cell.trim()}
            </div>
          ))}
        </div>
      );
    }
    // Empty line
    if (line.trim() === '') return <br key={i} />;
    // Bold (**text**) + bullet points
    const parts = [];
    let last = 0;
    const regex = /\*\*(.+?)\*\*/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > last) parts.push(line.slice(last, match.index));
      parts.push(<strong key={match.index}>{match[1]}</strong>);
      last = match.index + match[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return (
      <div key={i} style={{ fontSize: 13, lineHeight: 1.7 }}>
        {parts.length > 0 ? parts : line}
      </div>
    );
  }).filter(Boolean);
}

export default function AIAssistantPage() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Scroll to bottom when history or loading changes
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, loading]);

  const ask = async (q) => {
    const text = (q || question).trim();
    if (!text || loading) return;

    setQuestion('');
    setHistory(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      // Build a minimal context string (the server-side AI has the system prompt)
      // In the legacy app, full CRM data was sent as context.
      // Here we send a lighter context — the server endpoint accepts { question, context }.
      const data = await api.post('/api/ai/ask', {
        question: text,
        context: '',
      });
      setHistory(prev => [...prev, { role: 'ai', text: data.answer }]);
    } catch (err) {
      const msg = err.message || 'שגיאת תקשורת';
      setHistory(prev => [...prev, { role: 'error', text: msg }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  const clearChat = () => setHistory([]);

  return (
    <div className="ai-page animate-in">
      <ModuleTopbar icon="ti-robot" title="עוזר AI" />
      {/* Header */}
      <div className="ai-header">
        <div>
          <h2 className="ai-header-title">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="6" width="28" height="20" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
              <circle cx="11" cy="16" r="2" fill="currentColor"/>
              <circle cx="21" cy="16" r="2" fill="currentColor"/>
              <path d="M12 21c1.3 1.3 5.7 1.3 7 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M10 6V3M22 6V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {'\u200F'}
            עוזר חכם
          </h2>
          <div className="ai-header-subtitle">שאל שאלות וקבל תשובות מבוססות נתוני המערכת</div>
        </div>
        {history.length > 0 && (
          <button className="btn btn-ghost" onClick={clearChat}>נקה שיחה</button>
        )}
      </div>

      {/* Chat area */}
      <div className="ai-chat-container">
        {history.length === 0 ? (
          <div className="ai-empty-state">
            <div className="ai-empty-icon">AI</div>
            <div className="ai-empty-title">מה תרצה לדעת?</div>
            <div className="ai-empty-desc">
              שאל כל שאלה על הנתונים במערכת — לקוחות, מוצרים, עסקאות, הצעות מחיר ועוד
            </div>
            <div className="ai-suggestions">
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  className="ai-suggestion-chip"
                  onClick={() => { setQuestion(ex); ask(ex); }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {history.map((msg, i) => (
              <div key={i} className={`ai-message ai-message--${msg.role}`}>
                <div className={`ai-avatar ai-avatar--${msg.role}`}>
                  {msg.role === 'user' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  ) : msg.role === 'error' ? '!' : 'AI'}
                </div>
                <div className={`ai-bubble ai-bubble--${msg.role}`}>
                  {msg.role === 'user' ? msg.text : renderMarkdown(msg.text)}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="ai-loading">
                <div className="ai-avatar ai-avatar--ai">AI</div>
                <div className="ai-bubble ai-bubble--ai">
                  <div className="ai-loading-dots">
                    <div className="ai-loading-dot" />
                    <div className="ai-loading-dot" />
                    <div className="ai-loading-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="ai-input-area">
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="שאל שאלה על הנתונים במערכת... (Enter לשליחה, Shift+Enter לשורה חדשה)"
          rows={2}
        />
        <button
          className="btn btn-primary ai-send-btn"
          onClick={() => ask()}
          disabled={loading || !question.trim()}
        >
          {loading ? 'מעבד...' : 'שלח'}
        </button>
      </div>
    </div>
  );
}
