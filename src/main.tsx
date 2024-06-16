import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.tsx';
import './index.css';
import { Providers } from './components/providers.tsx';
import { Analytics } from '@vercel/analytics/react';

const root = document.getElementById('root');

if (!root) {
  throw new Error('No root element found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Providers>
      <App />
      <Analytics />
    </Providers>
  </React.StrictMode>
);
