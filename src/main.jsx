import React from 'react';
import ReactDOM from 'react-dom/client';
import Root from './Root.jsx';
import './styles.css';
import './timebudget.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
