import { useState, useEffect } from 'react';
import './ScrollButtons.css';

export default function ScrollButtons() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 100 || document.documentElement.scrollHeight > window.innerHeight + 100);
    onScroll();
    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);

  if (!visible) return null;

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

  return (
    <div className="scroll-buttons">
      <button type="button" className="scroll-btn" onClick={scrollToTop} title="גלול למעלה" aria-label="גלול למעלה">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
      <button type="button" className="scroll-btn" onClick={scrollToBottom} title="גלול למטה" aria-label="גלול למטה">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
