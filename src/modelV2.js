export const STORAGE_KEY = 'shiftpilot:data:v1';
export const PREFS_KEY = 'shiftpilot:prefs:v2';
export const LEARNING_KEY = 'shiftpilot:learning:v1';
export const SHIFT_ORDER = ['morning', 'mid', 'night'];
export const SHIFT_LABELS = { morning: 'Morning', mid: 'Mid', night: 'Night' };
export const PRIORITY_LABELS = { urgent: 'Urgent', required: 'Routine', high: 'High', normal: 'Normal', low: 'Low' };
const priorityRank = { urgent: 0, required: 1, high: 2, normal: 3, low: 4 };
const priorityWeight = { urgent: 1.7, required: 1.45, high: 1.25, normal: 1, low: 0.75 };

export const WALK_ITEMS = [
  ['appearance', 'Store appearance'], ['restrooms', 'Restrooms'], ['cooler', 'Cooler & freezer'], ['trash', 'Trash'],
  ['coffee', 'Coffee & fountain area'], ['cups', 'Cups filled', 'coffee'], ['lids', 'Lids filled', 'coffee'], ['straws', 'Straws filled', 'coffee'],
  ['bibs', 'BIBs'], ['bibs-check', 'Check bag-in-box supplies', 'bibs'], ['bibs-replace', 'Replace low or empty BIBs', 'bibs'], ['bibs-order', 'Flag flavors needing an order', 'bibs'],
  ['warmers', 'Food warmers'], ['gaps', 'Stock gaps'], ['safety', 'Safety issues'], ['handoff', 'Handoff items'],
];

const rules = [
  [/\b(bookwork|books|daily books|cash reconciliation)\b/i, 45, 'Bookwork'],
  [/\bsmart counts?\b/i, 30, 'Smart Counts'],
  [/\b(daily walk|store walk|walk routine|walkthrough)\b/i, 20, 'Store walk'],
  [/\b(truck|put away delivery|unload|freight)\b/i, 90, 'Truck work'],
  [/\b(reset|planogram|pog|display|power wing|endcap)\b/i, 45, 'Reset or display'],
  [/\b(candy backstock|work candy|stock candy|candy aisle)\b/i, 30, 'Candy stocking'],
  [/\b(beer cooler|stock beer|fill beer)\b/i, 30, 'Beer cooler'],
  [/\b(cooler|freezer)\b.*\b(stock|fill|work|organize)\b|\b(stock|fill|work|organize)\b.*\b(cooler|freezer)\b/i, 25, 'Cooler or freezer'],
  [/\b(cigarette|tobacco)\b.*\b(count|audit|inventory)\b|\b(count|audit|inventory)\b.*\b(cigarette|tobacco)\b/i, 25, 'Tobacco count'],
  [/\b(count|audit|inventory)\b/i, 20, 'Count or audit'],
  [/\b(price tags?|shelf tags?|missing tags?|map|signage)\b/i, 25, 'Tags and signage'],
  [/\b(bibs?|bag[- ]?in[- ]?box|soda boxes?)\b/i, 12, 'BIBs'],
  [/\b(food warmers?|warmer)\b/i, 10, 'Food warmers'],
  [/\b(coffee|fountain)\b/i, 15, 'Coffee and fountain'],
  [/\b(cups?|lids?|straws?)\b.*\b(fill|stock|refill)\b|\b(fill|stock|refill)\b.*\b(cups?|lids?|straws?)\b/i, 10, 'Fountain supplies'],
  [/\b(restrooms?|bathrooms?)\b/i, 15, 'Restrooms'], [/\b(trash|garbage)\b/i, 10, 'Trash'],
  [/\b(sweep|mop|floors?)\b/i, 20, 'Floors'], [/\b(clean|wipe|sanitize)\b/i, 15, 'Cleaning'],
  [/\b(backstock|stock|fill|face|front)\b/i, 25, 'Stocking'], [/\b(order|vendor|receive|invoice)\b/i, 20, 'Vendor or order'],
  [/\b(call|text|email|message)\b/i, 5, 'Communication'], [/\b(check|inspect|verify|review)\b/i, 10, 'Check or review'],
];

export const nowDateKey = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
export const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const normalizeKey = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, '-');

export function defaultWalkItems() {
  return WALK_ITEMS.map(([idValue, label, parent]) => ({ id: idValue, label, parent: parent || null, checked: false }));
}

export function seedTasks() {
  return [
    makeTask('Bookwork', 'morning', { id: 'bookwork', type: 'bookwork', minutes: 45, priority: 'required', milestone: true, order: 0 }),
    makeTask('Smart Counts', 'morning', { id: 'smart-counts', type: 'smart-counts', minutes: 30, priority: 'required', milestone: true, order: 1 }),
    ...SHIFT_ORDER.map((shift) => makeTask(`${SHIFT_LABELS[shift]} Daily Walk`, shift, {
      id: `${shift}-walk`, type: 'walk', minutes: 20, priority: 'required', order: shift === 'morning' ? 2 : 0, walkItems: defaultWalkItems(),
    })),
  ];
}

export function makeTask(title, shift, options = {}) {
  return {
    id: options.id || id(), title: String(title).trim(), shift, minutes: options.minutes ?? 15, priority: options.priority || 'normal',
    completed: options.completed || false, completedAt: options.completedAt || null, actualMinutes: options.actualMinutes || null,
    milestone: options.milestone || false, excluded: options.excluded || false, owner: options.owner || 'Me', type: options.type || 'custom',
    order: options.order ?? 99, walkItems: options.walkItems || null, handoff: options.handoff || false, createdAt: options.createdAt || new Date().toISOString(),
    estimateSource: options.estimateSource || 'smart', skipped: options.skipped || false,
  };
}

export function defaultData() {
  return {
    date: nowDateKey(), truckDay: false, activeShift: currentShift(), shiftHours: { morning: 8, mid: 8, night: 8 },
    tasks: seedTasks(), handoffNotes: { morning: '', mid: '', night: '' }, extraCompleted: [], history: [], celebrated: {}, interruptions: [],
  };
}

export function defaultPrefs() {
  return {
    clockOut: { morning: '14:30', mid: '18:00', night: '23:00' },
    shiftStart: { morning: '06:30', mid: '10:00', night: '15:00' },
    activeShift: currentShift(), lastFocusTaskId: null,
  };
}

export function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return defaultData();
    const migrated = { ...defaultData(), ...saved, tasks: (saved.tasks || seedTasks()).map(migrateTask), interruptions: saved.interruptions || [] };
    if (migrated.date !== nowDateKey()) {
      const snapshot = snapshotDay(migrated);
      return { ...defaultData(), history: [snapshot, ...(migrated.history || [])].slice(0, 30) };
    }
    return migrated;
  } catch { return defaultData(); }
}

export function loadPrefs() {
  try { return { ...defaultPrefs(), ...(JSON.parse(localStorage.getItem(PREFS_KEY)) || {}) }; }
  catch { return defaultPrefs(); }
}
export function loadLearning() {
  try { return JSON.parse(localStorage.getItem(LEARNING_KEY)) || {}; }
  catch { return {}; }
}
export function saveData(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
export function savePrefs(prefs) { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }
export function saveLearning(learning) { localStorage.setItem(LEARNING_KEY, JSON.stringify(learning)); }

function migrateTask(task) {
  const base = makeTask(task.title || 'Untitled task', task.shift || 'morning', task);
  if (base.type === 'walk' && (!Array.isArray(base.walkItems) || !base.walkItems.length)) base.walkItems = defaultWalkItems();
  if (base.type === 'walk' && base.walkItems?.some(item => item.children)) {
    const flat = [];
    for (const item of base.walkItems) {
      flat.push({ id: item.id, label: item.label, parent: null, checked: !!item.checked });
      for (const child of item.children || []) flat.push({ id: child.id, label: child.label, parent: item.id, checked: !!child.checked });
    }
    base.walkItems = flat;
  }
  return base;
}

export function currentShift() {
  const hour = new Date().getHours();
  return hour < 11 ? 'morning' : hour < 17 ? 'mid' : 'night';
}

export function estimateTask(task, learning = {}) {
  if (task.actualMinutes && task.completed) return { minutes: task.actualMinutes, category: 'Actual time', source: 'actual' };
  const learned = learning[normalizeKey(task.title)];
  if (learned?.count >= 2) return { minutes: Math.max(5, Math.round(learned.average / 5) * 5), category: `Learned from ${learned.count} finishes`, source: 'learned' };
  if (task.type !== 'custom') return { minutes: Number(task.minutes) || 15, category: 'Required routine', source: 'fixed' };
  if (task.estimateSource === 'explicit' && Number(task.minutes)) return { minutes: Number(task.minutes), category: 'Time you specified', source: 'explicit' };
  const text = task.title || '';
  const explicit = text.match(/\b(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (explicit) return { minutes: /hour|hr/i.test(explicit[2]) ? Math.round(Number(explicit[1]) * 60) : Math.round(Number(explicit[1])), category: 'Spoken time', source: 'explicit' };
  const match = rules.find(([pattern]) => pattern.test(text));
  let minutes = match?.[1] || Number(task.minutes) || 15;
  if (/\b(quick|small|few|one shelf|one section)\b/i.test(text)) minutes = Math.max(5, Math.round(minutes * .65 / 5) * 5);
  if (/\b(all|entire|whole|full|complete|every|deep clean|major)\b/i.test(text)) minutes = Math.round(minutes * 1.5 / 5) * 5;
  return { minutes: Math.max(5, minutes), category: match?.[2] || 'General task', source: match ? 'smart' : 'standard' };
}

export function updateLearning(learning, task, actualMinutes) {
  if (!actualMinutes || actualMinutes < 1) return learning;
  const key = normalizeKey(task.title);
  const prev = learning[key] || { count: 0, average: actualMinutes };
  const count = prev.count + 1;
  const average = Math.round(((prev.average * prev.count) + actualMinutes) / count);
  return { ...learning, [key]: { count, average, last: actualMinutes, title: task.title, updatedAt: new Date().toISOString() } };
}

export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (!!a.skipped !== !!b.skipped) return a.skipped ? 1 : -1;
    const p = (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3);
    if (p) return p;
    return (a.order ?? 99) - (b.order ?? 99);
  });
}

export function parseClock(dateKey, hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(`${dateKey}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d;
}
export function minutesUntil(date) { return Math.max(0, Math.floor((date.getTime() - Date.now()) / 60000)); }
export function addMinutes(date, mins) { return new Date(date.getTime() + mins * 60000); }
export function formatTime(date) { return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date); }
export function formatDuration(mins) {
  const value = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(value / 60); const m = value % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

function minimumFocusBlock(estimateMinutes) {
  const estimate = Math.max(1, Math.round(Number(estimateMinutes) || 1));
  if (estimate <= 5) return estimate;
  if (estimate <= 10) return 5;
  return Math.min(estimate, Math.max(10, Math.ceil((estimate * 0.6) / 5) * 5));
}

function allocateRealisticBlocks(estimates, availableMinutes) {
  const fullTotal = estimates.reduce((sum, item) => sum + item.estimate.minutes, 0);
  if (availableMinutes >= fullTotal) return estimates.map(item => ({ ...item, allotted: item.estimate.minutes, compressed: false }));

  const allocated = estimates.map(item => ({
    ...item,
    allotted: minimumFocusBlock(item.estimate.minutes),
    compressed: true,
  }));
  const minimumTotal = allocated.reduce((sum, item) => sum + item.allotted, 0);

  if (availableMinutes <= minimumTotal) return allocated;

  let extra = availableMinutes - minimumTotal;
  while (extra > 0) {
    const eligible = allocated
      .map((item, index) => ({ item, index, room: item.estimate.minutes - item.allotted }))
      .filter(entry => entry.room > 0)
      .sort((a, b) => {
        const priority = (priorityRank[a.item.task.priority] ?? 3) - (priorityRank[b.item.task.priority] ?? 3);
        if (priority) return priority;
        return b.room - a.room;
      });
    if (!eligible.length) break;
    for (const entry of eligible) {
      if (extra <= 0) break;
      allocated[entry.index].allotted += 1;
      extra -= 1;
    }
  }
  return allocated;
}

export function buildPlan(data, prefs, learning, shift = data.activeShift, now = new Date()) {
  const remaining = sortTasks(data.tasks.filter(t => t.shift === shift && !t.completed && !t.excluded));
  const estimates = remaining.map(task => ({ task, estimate: estimateTask(task, learning) }));
  const estimateTotal = estimates.reduce((sum, x) => sum + x.estimate.minutes, 0);
  const clockOut = parseClock(data.date, prefs.clockOut?.[shift]);
  const available = clockOut ? minutesUntil(clockOut) : Math.max(0, Math.round((Number(data.shiftHours?.[shift]) || 0) * 60));
  const interruptionMinutes = (data.interruptions || []).filter(x => x.shift === shift && x.date === data.date).reduce((s, x) => s + (Number(x.minutes) || 0), 0);
  const effectiveAvailable = Math.max(0, available);

  if (!estimates.length) return { items: [], estimateTotal: 0, available: effectiveAvailable, clockOut, behindBy: 0, aheadBy: effectiveAvailable, interruptionMinutes };

  const allocated = allocateRealisticBlocks(estimates, effectiveAvailable);
  const allocatedTotal = allocated.reduce((sum, item) => sum + item.allotted, 0);
  const tight = estimateTotal > effectiveAvailable;
  let cursor = now;
  const items = allocated.map((item, index) => {
    const start = cursor;
    const finish = addMinutes(start, item.allotted);
    cursor = finish;
    return { ...item, index, start, finish };
  });

  return {
    items,
    estimateTotal,
    allocatedTotal,
    available: effectiveAvailable,
    clockOut,
    tight,
    minimumOverrun: Math.max(0, allocatedTotal - effectiveAvailable),
    behindBy: Math.max(0, estimateTotal - effectiveAvailable),
    aheadBy: Math.max(0, effectiveAvailable - estimateTotal),
    interruptionMinutes,
  };
}

export function snapshotDay(data) {
  return { date: data.date, completed: data.tasks.filter(t => t.completed && !t.excluded).map(t => t.title), extras: data.extraCompleted || [], truckDay: data.truckDay, savedAt: new Date().toISOString() };
}

export function parseVoiceCommand(raw, activeShift) {
  const phrase = String(raw || '').trim().replace(/[.?!]+$/, '');
  let match;
  match = phrase.match(/^(?:mark|complete|finish)\s+(.+?)(?:\s+(?:complete|done))?$/i);
  if (match) return { type: 'complete', query: match[1] };
  match = phrase.match(/^move\s+(.+?)\s+to\s+(morning|mid(?:day)?|night|evening)(?:\s+shift)?$/i);
  if (match) return { type: 'move', query: match[1], shift: match[2].startsWith('mid') ? 'mid' : match[2].startsWith('morning') ? 'morning' : 'night' };
  match = phrase.match(/^(?:add|put)\s+(.+?)\s+to\s+(?:the\s+)?handoff$/i);
  if (match) return { type: 'handoff', query: match[1] };
  match = phrase.match(/^(?:i\s+(?:leave|clock out)|clock out|leave)\s+at\s+(.+)$/i);
  if (match) return { type: 'clockout', timeText: match[1] };
  let priority = 'normal';
  let title = phrase;
  if (/^urgent\b/i.test(title)) { priority = 'urgent'; title = title.replace(/^urgent\s*/i, ''); }
  else if (/^high priority\b/i.test(title)) { priority = 'high'; title = title.replace(/^high priority\s*/i, ''); }
  let shift = activeShift;
  const shiftMatch = title.match(/\b(morning|mid(?:day)?|night|evening)\s*(?:shift)?\b/i);
  if (shiftMatch) { shift = shiftMatch[1].startsWith('mid') ? 'mid' : shiftMatch[1].startsWith('morning') ? 'morning' : 'night'; title = title.replace(shiftMatch[0], '').replace(/^\s*[,:-]\s*|\s*[,:-]\s*$/g, '').trim(); }
  return { type: 'add', title, shift, priority };
}

export function findTask(tasks, query, shift = null) {
  const q = String(query || '').toLowerCase().trim();
  const pool = tasks.filter(t => !shift || t.shift === shift);
  return pool.find(t => t.title.toLowerCase() === q) || pool.find(t => t.title.toLowerCase().includes(q)) || pool.find(t => q.includes(t.title.toLowerCase()));
}

export function parseSpokenTime(text) {
  const normalized = String(text || '').toLowerCase().replace(/\./g, '').trim();
  const ampm = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!ampm) return null;
  let h = Number(ampm[1]); const m = Number(ampm[2] || 0); const suffix = ampm[3];
  if (suffix === 'pm' && h < 12) h += 12;
  if (suffix === 'am' && h === 12) h = 0;
  if (!suffix && h <= 7) h += 12;
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
