import { useEffect, useRef, useState, useCallback } from 'react';
import useAuthStore from '../store/authStore';

const WARN_BEFORE_MS = 2 * 60 * 1000; // warn 2 minutes before logout
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

export function useSessionTimeout(timeoutMinutes) {
  const logout = useAuthStore(s => s.logout);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const logoutTimerRef = useRef(null);
  const warnTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const timeoutMs = timeoutMinutes ? timeoutMinutes * 60 * 1000 : 0;

  const clearAllTimers = useCallback(() => {
    clearTimeout(logoutTimerRef.current);
    clearTimeout(warnTimerRef.current);
    clearInterval(countdownRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    if (!timeoutMs || !isAuthenticated) return;
    clearAllTimers();
    setShowWarning(false);

    // Warning timer
    const warnMs = timeoutMs - WARN_BEFORE_MS;
    if (warnMs > 0) {
      warnTimerRef.current = setTimeout(() => {
        setShowWarning(true);
        setSecondsLeft(Math.floor(WARN_BEFORE_MS / 1000));
        countdownRef.current = setInterval(() => {
          setSecondsLeft(s => {
            if (s <= 1) { clearInterval(countdownRef.current); return 0; }
            return s - 1;
          });
        }, 1000);
      }, warnMs);
    } else {
      // timeout < 2 min — skip warning, just logout
    }

    // Logout timer
    logoutTimerRef.current = setTimeout(() => {
      setShowWarning(false);
      clearAllTimers();
      logout('session_expired');
    }, timeoutMs);
  }, [timeoutMs, isAuthenticated, logout, clearAllTimers]);

  // Activity listener resets timers
  useEffect(() => {
    if (!timeoutMs || !isAuthenticated) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimers, { passive: true }));
    resetTimers();

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimers));
      clearAllTimers();
    };
  }, [timeoutMs, isAuthenticated, resetTimers, clearAllTimers]);

  const stayActive = useCallback(() => {
    setShowWarning(false);
    resetTimers();
  }, [resetTimers]);

  return { showWarning, secondsLeft, stayActive };
}
