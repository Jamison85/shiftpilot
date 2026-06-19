const DATA_KEY = 'shiftpilot:data:v1';
const PREFS_KEY = 'shiftpilot:prefs:v2';
const PREP_TEMPLATE_ID = 'prep-5-hour-v1';

const PREP_TASKS = [
  ['Prep station reset: gloves, labels, pans, sanitizer', 10, 'high'],
  ['Make dough balls', 55, 'urgent'],
  ['Sandwiches for open-air cooler', 65, 'urgent'],
  ['Wraps for open-air cooler', 45, 'high'],
  ['Salads for open-air cooler', 45, 'high'],
  ['Stock open-air cooler and rotate dates', 25, 'high'],
  ['Final prep check and shortage note for Loretta', 15, 'normal'],
  ['Clean prep station and dishes reset', 20, 'normal'],
];

const nowDateKey = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const currentShift = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'morning';
  if (hour < 17) return 'mid';
  return 'night';
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const parseJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
};
const formatHHMM = date => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

function makePrepTask([title, minutes, priority], shift, order) {
  return {
    id: `${PREP_TEMPLATE_ID}-${shift}-${normalize(title).replace(/\s+/g, '-')}`,
    title,
    shift,
    minutes,
    priority,
    completed: false,
    completedAt: null,
    actualMinutes: null,
    milestone: false,
    excluded: false,
    owner: 'Me',
    type: 'prep-template',
    order: 20 + order,
    walkItems: null,
    handoff: false,
    createdAt: new Date().toISOString(),
    estimateSource: 'explicit',
    skipped: false,
    templateName: '5-Hour Prep Shift',
    templateDate: nowDateKey(),
  };
}

function buildFallbackData() {
  const today = nowDateKey();
  return {
    date: today,
    truckDay: false,
    templateName: '5-Hour Prep Shift',
    activeShift: currentShift(),
    shiftHours: { morning: 8, mid: 8, night: 8 },
    tasks: [],
    handoffNotes: { morning: '', mid: '', night: '' },
    extraCompleted: [],
    history: [],
    celebrated: {},
    interruptions: [],
  };
}

function prepNote(shift) {
  const label = shift === 'morning' ? 'Morning' : shift === 'mid' ? 'Mid' : 'Night';
  return `${label} prep shift today. Scope is only this 5-hour prep shift: sandwiches for open-air cooler, wraps, salads, dough balls, cooler stock/rotation, and prep cleanup.`;
}

function applyPrepShift() {
  const today = nowDateKey();
  const data = parseJson(DATA_KEY, buildFallbackData());
  const prefs = parseJson(PREFS_KEY, {
    clockOut: { morning: '14:30', mid: '18:00', night: '23:00' },
    shiftStart: { morning: '06:30', mid: '10:00', night: '15:00' },
    activeShift: currentShift(),
    lastFocusTaskId: null,
  });

  const shift = data.activeShift || prefs.activeShift || currentShift();
  const existingTitles = new Set((data.tasks || []).filter(task => task.shift === shift).map(task => normalize(task.title)));
  const prepTasks = PREP_TASKS
    .filter(task => !existingTitles.has(normalize(task[0])))
    .map((task, index) => makePrepTask(task, shift, index));

  const now = new Date();
  const clockOut = formatHHMM(addMinutes(now, 300));
  const existingNote = data.handoffNotes?.[shift] || '';
  const note = prepNote(shift);

  const nextData = {
    ...data,
    date: data.date || today,
    templateName: '5-Hour Prep Shift',
    activeShift: shift,
    shiftHours: { ...(data.shiftHours || {}), [shift]: 5 },
    tasks: [...(data.tasks || []), ...prepTasks],
    handoffNotes: {
      ...(data.handoffNotes || { morning: '', mid: '', night: '' }),
      [shift]: existingNote.includes(note) ? existingNote : [existingNote, note].filter(Boolean).join('\n\n'),
    },
    extraCompleted: data.extraCompleted || [],
    interruptions: data.interruptions || [],
  };

  const nextPrefs = {
    ...prefs,
    activeShift: shift,
    clockOut: { ...(prefs.clockOut || {}), [shift]: clockOut },
    shiftStart: { ...(prefs.shiftStart || {}), [shift]: formatHHMM(now) },
  };

  localStorage.setItem(DATA_KEY, JSON.stringify(nextData));
  localStorage.setItem(PREFS_KEY, JSON.stringify(nextPrefs));
  sessionStorage.setItem('shiftpilot:prep-loaded-message', prepTasks.length ? `Prep shift loaded: ${prepTasks.length} tasks added.` : 'Prep shift already loaded. Hours and clock-out refreshed.');
  window.location.reload();
}

function addSinglePrepTask(title, minutes, priority = 'normal') {
  const data = parseJson(DATA_KEY, buildFallbackData());
  const prefs = parseJson(PREFS_KEY, { activeShift: currentShift(), clockOut: {}, shiftStart: {} });
  const shift = data.activeShift || prefs.activeShift || currentShift();
  const exists = (data.tasks || []).some(task => task.shift === shift && normalize(task.title) === normalize(title));
  if (exists) return;
  const task = {
    id: makeId(),
    title,
    shift,
    minutes,
    priority,
    completed: false,
    completedAt: null,
    actualMinutes: null,
    milestone: false,
    excluded: false,
    owner: 'Me',
    type: 'custom',
    order: 99,
    walkItems: null,
    handoff: false,
    createdAt: new Date().toISOString(),
    estimateSource: 'explicit',
    skipped: false,
    templateName: 'Prep Quick Add',
    templateDate: nowDateKey(),
  };
  localStorage.setItem(DATA_KEY, JSON.stringify({ ...data, tasks: [...(data.tasks || []), task] }));
  sessionStorage.setItem('shiftpilot:prep-loaded-message', `${title} added.`);
  window.location.reload();
}

function injectStyles() {
  if (document.getElementById('shiftpilot-prep-styles')) return;
  const style = document.createElement('style');
  style.id = 'shiftpilot-prep-styles';
  style.textContent = `
    .sp-prep-card {
      margin: 16px 0;
      padding: 16px;
      border: 1px solid rgba(15, 118, 110, 0.18);
      border-radius: 24px;
      background: linear-gradient(135deg, rgba(240, 253, 250, 0.96), rgba(255, 251, 235, 0.94));
      box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
    }
    .sp-prep-card span {
      display: block;
      color: #0f766e;
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: .12em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .sp-prep-card h2 { margin: 0 0 6px; font-size: 1.25rem; color: #102a43; }
    .sp-prep-card p { margin: 0 0 14px; color: #486581; line-height: 1.35; }
    .sp-prep-actions { display: grid; gap: 10px; grid-template-columns: 1fr; }
    .sp-prep-primary, .sp-prep-chip {
      border: 0;
      border-radius: 999px;
      cursor: pointer;
      font-weight: 850;
    }
    .sp-prep-primary {
      padding: 13px 15px;
      color: white;
      background: #0f766e;
      box-shadow: 0 10px 20px rgba(15, 118, 110, .22);
    }
    .sp-prep-chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
    .sp-prep-chip { padding: 10px 12px; color: #0f3f3a; background: rgba(255, 255, 255, .8); border: 1px solid rgba(15, 118, 110, .16); }
    .sp-prep-toast {
      position: fixed;
      left: 16px;
      right: 16px;
      bottom: 90px;
      z-index: 10000;
      padding: 14px 16px;
      border-radius: 18px;
      background: #0f766e;
      color: white;
      box-shadow: 0 18px 45px rgba(15, 23, 42, .22);
      font-weight: 800;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
}

function showPrepToast(message) {
  if (!message) return;
  const toast = document.createElement('div');
  toast.className = 'sp-prep-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3600);
}

function injectPrepCard() {
  injectStyles();
  const todayPage = document.querySelector('.sp-page .sp-voice')?.closest('.sp-page');
  if (!todayPage) return;
  if (todayPage.querySelector('.sp-prep-card')) return;

  const card = document.createElement('section');
  card.className = 'sp-prep-card';
  card.innerHTML = `
    <span>Prep shift</span>
    <h2>5-hour prep run</h2>
    <p>Loads sandwiches for open-air cooler, wraps, salads, dough balls, cooler rotation, and cleanup into this shift only.</p>
    <div class="sp-prep-actions">
      <button class="sp-prep-primary" type="button">Load 5-hour prep shift</button>
      <div class="sp-prep-chip-row">
        <button class="sp-prep-chip" type="button" data-task="sandwiches">Sandwiches</button>
        <button class="sp-prep-chip" type="button" data-task="wraps">Wraps</button>
        <button class="sp-prep-chip" type="button" data-task="salads">Salads</button>
        <button class="sp-prep-chip" type="button" data-task="dough">Dough balls</button>
      </div>
    </div>
  `;
  card.querySelector('.sp-prep-primary')?.addEventListener('click', applyPrepShift);
  card.querySelector('[data-task="sandwiches"]')?.addEventListener('click', () => addSinglePrepTask('Sandwiches for open-air cooler', 65, 'urgent'));
  card.querySelector('[data-task="wraps"]')?.addEventListener('click', () => addSinglePrepTask('Wraps for open-air cooler', 45, 'high'));
  card.querySelector('[data-task="salads"]')?.addEventListener('click', () => addSinglePrepTask('Salads for open-air cooler', 45, 'high'));
  card.querySelector('[data-task="dough"]')?.addEventListener('click', () => addSinglePrepTask('Make dough balls', 55, 'urgent'));

  const anchor = todayPage.querySelector('.sp-voice');
  anchor.insertAdjacentElement('afterend', card);
}

function initPrepPatch() {
  injectPrepCard();
  showPrepToast(sessionStorage.getItem('shiftpilot:prep-loaded-message'));
  sessionStorage.removeItem('shiftpilot:prep-loaded-message');
  const observer = new MutationObserver(() => injectPrepCard());
  observer.observe(document.body, { childList: true, subtree: true });
  window.ShiftPilotPrep = { applyPrepShift, addSinglePrepTask };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPrepPatch);
} else {
  initPrepPatch();
}
