import React from 'react';
import ReactDOM from 'react-dom/client';
import './interruptionInputPatch.js';
import './prepShiftPatch.js';
import AppV2 from './AppV2.jsx';
import IncidentReporter from './IncidentReporter.jsx';
import './appV2.css';
import './managementV3.css';
import './premium-theme.css';
import './finishPolish.css';
import './incidentReporter.css';
import './retailFinal.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppV2 />
    <IncidentReporter />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
