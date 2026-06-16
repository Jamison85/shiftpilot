import React from 'react';
import ReactDOM from 'react-dom/client';
import AppV2 from './AppV2.jsx';
import './appV2.css';
import './managementV3.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><AppV2 /></React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
