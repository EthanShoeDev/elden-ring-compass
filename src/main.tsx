import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.tsx';
import './index.css';
import { Providers } from './components/providers/providers.tsx';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const root = document.getElementById('root');

if (!root) {
  throw new Error('No root element found');
}

if (!import.meta.env.DEV)
  window.addEventListener('error', () => {
    console.log('Error detected, clearing local storage');
    localStorage.clear();
    console.log('Reload window');
    window.location.reload();
  });

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
);
