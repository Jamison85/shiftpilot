import { useEffect, useMemo, useState } from 'react';
import { SHIFT_LABELS, STORAGE_KEY, formatDuration } from './modelV2.js';

const INCIDENT_KEY = 'shiftpilot:incidents:v1';
const NOTIFY_OPTIONS = ['Loretta', 'Richard', 'IT / Tech Support'];
const IMPACT_OPTIONS = [
  'Power outage',
  'Network/computers down',
  'Registers/POS impacted',
  'Phone or IT support time',
  'Water or safety issue',
  'Short staffed',
  'Customer flow coverage',
  'Bookwork delayed',
];

function todayKey() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5);
}

function timeMinus(minutes) {
  const value = new Date(Date.now() - minutes * 60000);
  return value.toTimeString().slice(0, 5);
}

function parseDateTime(dateKey, hhmm) {
  if (!dateKey || !hhmm) return null;
  const [hour, minute] = String(hhmm).split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  const value = new Date(`${dateKey}T00:00:00`);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function minutesBetween(start, end) {
  if (!start || !end) return 0;
  let diff = Math.round((end.getTime() - start.getTime()) / 60000);
  if (diff < 0) diff += 24 * 60;
  return Math.max(0, diff);
}

function formatDate(dateKey) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(`${dateKey}T12:00:00`));
}

function formatTimeValue(dateKey, hhmm) {
  const parsed = parseDateTime(dateKey, hhmm);
  if (!parsed) return hhmm || 'Not set';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(parsed);
}

function safeJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value || fallback;
  } catch {
    return fallback;
  }
}

function loadShiftData() {
  return safeJson(STORAGE_KEY, null);
}

function loadIncidents() {
  const value = safeJson(INCIDENT_KEY, []);
  return Array.isArray(value) ? value : [];
}

function blankDraft(appData) {
  const shift = appData?.activeShift || 'morning';
  return {
    id: null,
    date: appData?.date || todayKey(),
    shift,
    title: '',
    type: 'Operational disruption',
    severity: 'Medium',
    status: 'Resolved / stable',
    startTime: timeMinus(30),
    endTime: currentTime(),
    durationOverride: '',
    impacts: [],
    notified: NOTIFY_OPTIONS.reduce((acc, name) => ({ ...acc, [name]: false }), {}),
    customNotified: '',
    impactSummary: '',
    staffingContext: '',
    actionsTaken: '',
    delayReason: '',
    tasksPushed: [],
    followUp: '',
  };
}

function weatherSystemsDraft(appData) {
  return {
    ...blankDraft(appData),
    title: 'Weather power outage / store systems down',
    type: 'Systems outage',
    severity: 'High',
    status: 'Resolved / stable',
    startTime: timeMinus(120),
    endTime: currentTime(),
    impacts: ['Power outage', 'Network/computers down', 'Registers/POS impacted', 'Phone or IT support time', 'Bookwork delayed'],
    notified: { Loretta: true, Richard: true, 'IT / Tech Support': true },
    impactSummary: 'Weather knocked out power and store systems were down or rebooting for about two hours. Network/computers/register screens were impacted, and normal office work could not be completed while systems were unavailable.',
    staffingContext: 'Short staffed. I opened the store, covered register/customer flow, handled the outage, and worked with tech support while still being responsible for bookwork.',
    actionsTaken: 'Notified Loretta, kept Richard informed, contacted IT/tech support, monitored systems until they restored, and kept customer/safety needs prioritized.',
    delayReason: 'Bookwork and routine shift tasks were delayed because systems were unavailable and I could not be in the office, on register, on the phone with tech support, and handling customers at the same time. Physics remains annoyingly undefeated.',
    followUp: 'Finish bookwork and any delayed routine tasks once systems and staffing allow. Review any safety issues from the outage/water leak before considering the situation fully closed.',
  };
}

function uniqueSelected(list) {
  return Array.from(new Set((list || []).filter(Boolean)));
}

function summarizeNotifications(incident) {
  const selected = Object.entries(incident.notified || {}).filter(([, checked]) => checked).map(([name]) => name);
  const custom = String(incident.customNotified || '').split(',').map(item => item.trim()).filter(Boolean);
  return [...selected, ...custom];
}

function incidentDuration(incident) {
  const override = Number(incident.durationOverride);
  if (override > 0) return override;
  return minutesBetween(parseDateTime(incident.date, incident.startTime), parseDateTime(incident.date, incident.endTime));
}

function buildReport(incident, appData) {
  const duration = incidentDuration(incident);
  const tasks = uniqueSelected(incident.tasksPushed);
  const notified = summarizeNotifications(incident);
  const shift = SHIFT_LABELS[incident.shift] || incident.shift;
  return [
    `Incident / Disruption Report - ${formatDate(incident.date)}`,
    '',
    `Shift: ${shift}`,
    `Type: ${incident.type}`,
    `Severity: ${incident.severity}`,
    `Status: ${incident.status}`,
    `Time: ${formatTimeValue(incident.date, incident.startTime)} to ${formatTimeValue(incident.date, incident.endTime)} (${formatDuration(duration)})`,
    '',
    'What happened:',
    incident.title || 'Operational disruption',
    incident.impactSummary || 'No additional details entered.',
    '',
    incident.impacts?.length ? `Impact areas: ${incident.impacts.join(', ')}` : 'Impact areas: Not specified',
    notified.length ? `Notified: ${notified.join(', ')}` : 'Notified: Not recorded',
    '',
    'Actions taken:',
    incident.actionsTaken || 'No actions recorded.',
    '',
    'Staffing/context:',
    incident.staffingContext || 'No staffing context recorded.',
    '',
    'Delayed, pushed, or not completed:',
    tasks.length ? tasks.map(task => `• ${task}`).join('\n') : 'No specific delayed tasks selected.',
    '',
    'Reason for delay:',
    incident.delayReason || 'No delay reason recorded.',
    '',
    'Follow-up needed:',
    incident.followUp || 'No follow-up recorded.',
    '',
    `Logged in ShiftPilot at ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date())}`,
    appData?.templateName ? `Day template: ${appData.templateName}` : '',
  ].filter(Boolean).join('\n');
}

function Field({ label, children }) {
  return <label className="ir-field"><span>{label}</span>{children}</label>;
}

export default function IncidentReporter() {
  const [open, setOpen] = useState(false);
  const [appData, setAppData] = useState(loadShiftData);
  const [incidents, setIncidents] = useState(loadIncidents);
  const [draft, setDraft] = useState(() => blankDraft(loadShiftData()));
  const [previewId, setPreviewId] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    localStorage.setItem(INCIDENT_KEY, JSON.stringify(incidents));
  }, [incidents]);

  useEffect(() => {
    if (!open) return;
    setAppData(loadShiftData());
  }, [open]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const todayIncidents = useMemo(() => incidents.filter(item => item.date === (appData?.date || todayKey())), [incidents, appData?.date]);
  const pendingTasks = useMemo(() => {
    const selectedShift = draft.shift || appData?.activeShift || 'morning';
    return (appData?.tasks || []).filter(task => task.shift === selectedShift && !task.completed && !task.excluded).map(task => task.title);
  }, [appData, draft.shift]);
  const report = useMemo(() => buildReport(draft, appData), [draft, appData]);

  const updateDraft = patch => setDraft(current => ({ ...current, ...patch }));
  const toggleImpact = value => setDraft(current => ({ ...current, impacts: current.impacts.includes(value) ? current.impacts.filter(item => item !== value) : [...current.impacts, value] }));
  const toggleTask = value => setDraft(current => ({ ...current, tasksPushed: current.tasksPushed.includes(value) ? current.tasksPushed.filter(item => item !== value) : [...current.tasksPushed, value] }));
  const toggleNotified = value => setDraft(current => ({ ...current, notified: { ...current.notified, [value]: !current.notified?.[value] } }));

  const saveIncident = () => {
    const clean = { ...draft, id: draft.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, loggedAt: draft.loggedAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    setIncidents(current => [clean, ...current.filter(item => item.id !== clean.id)].slice(0, 60));
    setDraft(blankDraft(appData));
    setPreviewId(clean.id);
    setToast('Incident saved');
  };

  const editIncident = incident => {
    setDraft({ ...blankDraft(appData), ...incident });
    setPreviewId(null);
  };

  const deleteIncident = incidentId => {
    setIncidents(current => current.filter(item => item.id !== incidentId));
    if (previewId === incidentId) setPreviewId(null);
    setToast('Incident deleted');
  };

  const shareReport = async (incident = draft) => {
    const text = buildReport(incident, appData);
    try {
      if (navigator.share) await navigator.share({ title: 'ShiftPilot Incident Report', text });
      else {
        await navigator.clipboard.writeText(text);
        setToast('Report copied');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setToast('Share did not open. The report is still here.');
    }
  };

  const previewIncident = previewId ? incidents.find(item => item.id === previewId) : null;
  const activeReport = previewIncident ? buildReport(previewIncident, appData) : report;

  return <>
    <button className="ir-fab" onClick={() => setOpen(true)} aria-label="Open incident reporter">
      <span>!</span>
      <b>Incident</b>
      {todayIncidents.length > 0 && <i>{todayIncidents.length}</i>}
    </button>

    {open && <div className="ir-backdrop" onMouseDown={event => event.target === event.currentTarget && setOpen(false)}>
      <section className="ir-panel" role="dialog" aria-modal="true" aria-label="Incident reporter">
        <header className="ir-header">
          <div><span>MANAGER RECORD</span><h2>Incident Reporter</h2><p>Log outages, callouts, safety problems, and the reason work got pushed.</p></div>
          <button onClick={() => setOpen(false)} aria-label="Close incident reporter">×</button>
        </header>

        <div className="ir-quick-row">
          <button onClick={() => { setDraft(weatherSystemsDraft(appData)); setPreviewId(null); }}>Use today’s outage template</button>
          <button onClick={() => { setDraft(blankDraft(appData)); setPreviewId(null); }}>Start blank</button>
        </div>

        <div className="ir-layout">
          <form className="ir-form" onSubmit={event => { event.preventDefault(); saveIncident(); }}>
            <div className="ir-grid two">
              <Field label="Title"><input value={draft.title} onChange={event => updateDraft({ title: event.target.value })} placeholder="Example: Power outage / systems down" /></Field>
              <Field label="Shift"><select value={draft.shift} onChange={event => updateDraft({ shift: event.target.value, tasksPushed: [] })}>{Object.entries(SHIFT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            </div>

            <div className="ir-grid three">
              <Field label="Start"><input type="time" value={draft.startTime} onChange={event => updateDraft({ startTime: event.target.value })} /></Field>
              <Field label="End"><input type="time" value={draft.endTime} onChange={event => updateDraft({ endTime: event.target.value })} /></Field>
              <Field label="Duration override"><input type="number" min="0" value={draft.durationOverride} onChange={event => updateDraft({ durationOverride: event.target.value })} placeholder={`${incidentDuration(draft)} min`} /></Field>
            </div>

            <div className="ir-grid two">
              <Field label="Type"><select value={draft.type} onChange={event => updateDraft({ type: event.target.value })}><option>Operational disruption</option><option>Systems outage</option><option>Staffing issue</option><option>Safety / facilities</option><option>Customer incident</option><option>Other</option></select></Field>
              <Field label="Severity"><select value={draft.severity} onChange={event => updateDraft({ severity: event.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></Field>
            </div>

            <section className="ir-cardlet"><span>Impact areas</span><div className="ir-chip-grid">{IMPACT_OPTIONS.map(option => <button type="button" key={option} className={draft.impacts.includes(option) ? 'active' : ''} onClick={() => toggleImpact(option)}>{option}</button>)}</div></section>

            <section className="ir-cardlet"><span>Who was notified</span><div className="ir-checks">{NOTIFY_OPTIONS.map(option => <label key={option}><input type="checkbox" checked={!!draft.notified?.[option]} onChange={() => toggleNotified(option)} />{option}</label>)}</div><input value={draft.customNotified} onChange={event => updateDraft({ customNotified: event.target.value })} placeholder="Other notified people, comma separated" /></section>

            <Field label="What happened / operational impact"><textarea value={draft.impactSummary} onChange={event => updateDraft({ impactSummary: event.target.value })} placeholder="What happened, what systems/areas were affected, and what customers or employees experienced." /></Field>
            <Field label="Staffing context"><textarea value={draft.staffingContext} onChange={event => updateDraft({ staffingContext: event.target.value })} placeholder="Callouts, short staffing, covering register, opening alone, etc." /></Field>
            <Field label="Actions taken"><textarea value={draft.actionsTaken} onChange={event => updateDraft({ actionsTaken: event.target.value })} placeholder="Who you called, what you cleaned up, what IT said, what got stabilized." /></Field>

            <section className="ir-cardlet"><span>Tasks delayed or pushed</span><div className="ir-task-picks">{pendingTasks.length ? pendingTasks.map(task => <button type="button" key={task} className={draft.tasksPushed.includes(task) ? 'active' : ''} onClick={() => toggleTask(task)}>{task}</button>) : <p>No unfinished tasks showing for this shift.</p>}</div></section>

            <Field label="Reason work was delayed"><textarea value={draft.delayReason} onChange={event => updateDraft({ delayReason: event.target.value })} placeholder="Explain why things were not completed on the original timeline." /></Field>
            <Field label="Follow-up needed"><textarea value={draft.followUp} onChange={event => updateDraft({ followUp: event.target.value })} placeholder="What still needs done, who should know, and what should be checked later." /></Field>
            <Field label="Status"><select value={draft.status} onChange={event => updateDraft({ status: event.target.value })}><option>Open</option><option>Resolved / stable</option><option>Monitoring</option><option>Needs follow-up</option></select></Field>

            <div className="ir-actions"><button type="button" onClick={() => shareReport()}>Share preview</button><button type="submit" className="primary">Save incident</button></div>
          </form>

          <aside className="ir-preview">
            <div className="ir-preview-head"><span>Report preview</span><button onClick={() => navigator.clipboard?.writeText(activeReport).then(() => setToast('Report copied'))}>Copy</button></div>
            <pre>{activeReport}</pre>
            <div className="ir-saved">
              <h3>Today’s saved incidents</h3>
              {todayIncidents.length ? todayIncidents.map(item => <article key={item.id} className={previewId === item.id ? 'active' : ''}><button onClick={() => setPreviewId(item.id)}><strong>{item.title || item.type}</strong><small>{formatTimeValue(item.date, item.startTime)} · {formatDuration(incidentDuration(item))}</small></button><div><button onClick={() => editIncident(item)}>Edit</button><button onClick={() => shareReport(item)}>Share</button><button onClick={() => deleteIncident(item.id)}>Delete</button></div></article>) : <p>No incidents saved today. Suspiciously peaceful, or the app just got invited too late.</p>}
            </div>
          </aside>
        </div>
      </section>
    </div>}

    {toast && <div className="ir-toast">{toast}</div>}
  </>;
}
