import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { getAccessToken } from './api/client';
import './styles/theme.css';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';

// Bridge for shared field components (e.g. ModuleLookupField) — exposes the
// in-memory access token and the API base path so /api lookups stay authenticated.
if (typeof window !== 'undefined') {
  window.__API_BASE__ = '/api';
  window.__GET_AUTH_HEADER__ = () => {
    const tok = getAccessToken();
    return tok ? { Authorization: `Bearer ${tok}` } : {};
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
