const CATEGORY_RULES = [
  ['BIBs and fountain', /\b(bibs?|bag[- ]?in[- ]?box|fountain|soda|cups?|lids?|straws?)\b/i],
  ['Cooler and freezer', /\b(cooler|freezer|beer cooler)\b/i],
  ['Shelf tags and signage', /\b(tags?|signage|map|price label|shelf label)\b/i],
  ['Backstock and stocking', /\b(backstock|stock|freight|truck|fill|face|front)\b/i],
  ['Safety and cleanup', /\b(safety|spill|hazard|cleanup|clean|trash|restroom|bathroom)\b/i],
  ['Staffing and register', /\b(register|staff|employee|coverage|call[- ]?off|customer issue)\b/i],
  ['Vendor and receiving', /\b(vendor|receive|invoice|order|delivery)\b/i],
  ['Food warmers', /\b(warmer|food warmer)\b/i],
  ['Counts and audits', /\b(count|audit|inventory|smart counts?)\b/i],
];

export const SHIFT_LABELS = { morning: 'Morning', mid: 'Mid', night: 'Night' };

const normalize = value => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, '-');

const dateValue = value => new Date(`${value}T12:00:00`).getTime();
const shiftLabel = shift => SHIFT_LABELS[shift] || 'Store';

export function classifyIssue(value) {
  const text = String(value || '').trim();
  const matched = CATEGORY_RULES.find(([, pattern]) => pattern.test(text));
  return matched?.[0] || text || 'General issue';
}

function activeRecordShift(record, fallback = 'morning') {
  return record?.activeShift || record?.shift || fallback;
}

function scopedTasks(tasks = [], shift) {
  return tasks.filter(task => !shift || task.shift === shift);
}

export function currentDayRecord(data) {
  const scopeShift = data.activeShift || 'morning';
  const tasksForShift = scopedTasks(data.tasks || [], scopeShift);
  const unfinished = tasksForShift
    .filter(task => !task.completed && !task.excluded)
    .map(task => ({
      title: task.title,
      shift: task.shift,
      priority: task.priority,
      skipped: !!task.skipped,
      handoff: !!task.handoff,
      type: task.type,
    }));

  return {
    date: data.date,
    activeShift: scopeShift,
    completed: tasksForShift.filter(task => task.completed && !task.excluded).map(task => task.title),
    unfinished,
    extras: data.extraCompleted || [],
    interruptions: (data.interruptions || []).filter(item => item.shift === scopeShift || !item.shift),
    handoffNotes: data.handoffNotes || {},
    templateName: data.templateName || null,
    truckDay: !!data.truckDay,
  };
}

export function dayRecords(data) {
  const current = currentDayRecord(data);
  const byDate = new Map([[current.date, current]]);
  for (const record of data.history || []) {
    if (!record?.date || byDate.has(record.date)) continue;
    const scopeShift = activeRecordShift(record, data.activeShift || 'morning');
    const unfinished = (record.unfinished || []).filter(task => !task.shift || task.shift === scopeShift);
    byDate.set(record.date, {
      ...record,
      activeShift: scopeShift,
      completed: record.completed || [],
      unfinished,
      extras: record.extras || [],
      interruptions: (record.interruptions || []).filter(item => !item.shift || item.shift === scopeShift),
      handoffNotes: record.handoffNotes || {},
    });
  }
  return [...byDate.values()].sort((a, b) => dateValue(b.date) - dateValue(a.date));
}

export function scopeForIssue(issue, activeShift = 'morning') {
  const shifts = issue.shifts || [];
  if (!shifts.length) return { label: 'Store pattern', tone: 'store' };
  if (shifts.includes(activeShift)) return { label: `${shiftLabel(activeShift)} shift`, tone: 'mine' };
  if (shifts.length === 1) return { label: `${shiftLabel(shifts[0])} shift`, tone: 'other' };
  return { label: 'Multiple shifts', tone: 'store' };
}

export function suggestedAction(issue, activeShift = 'morning') {
  const scope = scopeForIssue(issue, activeShift);
  const types = issue.types || [];
  const belongsToMine = scope.tone === 'mine';

  if (!belongsToMine) {
    return `Report it to Loretta as a ${scope.label.toLowerCase()} pattern. Do not add it to your shift unless she wants you owning it.`;
  }

  if (types.includes('interruption')) {
    return 'Use this as coverage evidence. Add a buffer, then report the lost time instead of absorbing it silently.';
  }

  if (/daily walk/i.test(issue.category)) {
    return 'Make the owner clear. If it is yours, keep it locked in your shift. If not, report the repeated miss.';
  }

  return 'Add a prevention task or include it in the Loretta report so it stops becoming tomorrow’s surprise chore.';
}

export function getRecurringProblems(data, minimumCount = 2) {
  const issues = new Map();
  const records = dayRecords(data);

  const add = (label, date, example, type = 'unfinished', shift = null) => {
    const category = classifyIssue(label);
    const key = normalize(category);
    const existing = issues.get(key) || { key, category, count: 0, days: new Set(), examples: new Set(), shifts: new Set(), lastSeen: date, types: new Set() };
    existing.count += 1;
    existing.days.add(date);
    if (example) existing.examples.add(example);
    if (shift) existing.shifts.add(shift);
    existing.types.add(type);
    if (dateValue(date) > dateValue(existing.lastSeen)) existing.lastSeen = date;
    issues.set(key, existing);
  };

  for (const record of records) {
    const scopeShift = activeRecordShift(record, data.activeShift || 'morning');
    for (const task of record.unfinished || []) add(task.title, record.date, task.title, 'unfinished', task.shift || scopeShift);
    for (const interruption of record.interruptions || []) add(interruption.label, record.date, interruption.label, 'interruption', interruption.shift || scopeShift);
    for (const [shift, note] of Object.entries(record.handoffNotes || {})) {
      if (!note?.trim()) continue;
      const lines = note.split(/\n|[.;]/).map(line => line.trim()).filter(Boolean);
      for (const line of lines) add(line, record.date, line, 'note', shift || scopeShift);
    }
  }

  return [...issues.values()]
    .map(issue => {
      const normalized = {
        ...issue,
        days: issue.days.size,
        examples: [...issue.examples].slice(0, 3),
        shifts: [...issue.shifts],
        types: [...issue.types],
      };
      normalized.scope = scopeForIssue(normalized, data.activeShift || 'morning');
      normalized.action = suggestedAction(normalized, data.activeShift || 'morning');
      return normalized;
    })
    .filter(issue => issue.count >= minimumCount && issue.days >= minimumCount)
    .sort((a, b) => b.days - a.days || b.count - a.count || dateValue(b.lastSeen) - dateValue(a.lastSeen));
}

export function buildHandoffSuggestions(data, shift) {
  const recurring = getRecurringProblems(data, 2);
  const recurringMap = new Map(recurring.map(issue => [normalize(issue.category), issue]));
  const suggestions = [];

  for (const task of (data.tasks || []).filter(task => task.shift === shift && !task.completed && !task.excluded)) {
    const reasons = [];
    let score = 0;
    if (task.priority === 'urgent') { score += 5; reasons.push('urgent'); }
    if (task.priority === 'high') { score += 4; reasons.push('high priority'); }
    if (task.priority === 'required') { score += 3; reasons.push('unfinished routine'); }
    if (task.skipped) { score += 3; reasons.push('skipped during the shift'); }
    if (task.handoff) { score += 2; reasons.push('already marked'); }

    const category = classifyIssue(task.title);
    const recurringIssue = recurringMap.get(normalize(category));
    if (recurringIssue) {
      score += Math.min(4, recurringIssue.days);
      reasons.push(`repeated on ${recurringIssue.days} days`);
    }

    if (/\b(safety|hazard|bibs?|cooler|freezer|vendor|out of stock|shortage)\b/i.test(task.title)) {
      score += 2;
      reasons.push('operational issue');
    }

    if (score >= 2) {
      suggestions.push({
        id: `task-${task.id}`,
        taskId: task.id,
        title: task.title,
        reason: reasons.join(' · '),
        score,
        included: !!task.handoff,
        kind: 'task',
      });
    }
  }

  const shiftInterruptions = (data.interruptions || []).filter(item => item.shift === shift && item.date === data.date);
  const interruptionMinutes = shiftInterruptions.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  if (interruptionMinutes >= 15) {
    suggestions.push({
      id: 'interruptions-summary',
      title: `${interruptionMinutes} minutes lost to interruptions`,
      reason: shiftInterruptions.map(item => item.label).slice(0, 3).join(' · '),
      note: `For Loretta: ${SHIFT_LABELS[shift] || 'My'} shift interruptions totaled ${interruptionMinutes} minutes: ${shiftInterruptions.map(item => `${item.label} (${item.minutes}m)`).join(', ')}. This affected what could reasonably get done.`,
      score: 3,
      included: Object.values(data.handoffNotes || {}).some(note => note?.includes(`interruptions totaled ${interruptionMinutes}`)),
      kind: 'note',
    });
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 7);
}

export function includeHandoffSuggestion(data, shift, suggestion) {
  if (suggestion.kind === 'task') {
    return {
      ...data,
      tasks: data.tasks.map(task => task.id === suggestion.taskId ? { ...task, handoff: true } : task),
    };
  }

  const current = data.handoffNotes?.[shift] || '';
  if (current.includes(suggestion.note)) return data;
  return {
    ...data,
    handoffNotes: {
      ...data.handoffNotes,
      [shift]: [current.trim(), suggestion.note].filter(Boolean).join('\n'),
    },
  };
}

export function buildWeeklyManagerReport(data, learning) {
  const records = dayRecords(data);
  const newest = dateValue(data.date);
  const week = records.filter(record => newest - dateValue(record.date) <= 6 * 24 * 60 * 60 * 1000);
  const completed = week.reduce((sum, record) => sum + (record.completed?.length || 0) + (record.extras?.length || 0), 0);
  const unfinished = week.reduce((sum, record) => sum + (record.unfinished?.length || 0), 0);
  const reported = week.reduce((sum, record) => sum + (record.unfinished || []).filter(task => task.handoff).length, 0);
  const interruptionMinutes = week.reduce((sum, record) => sum + (record.interruptions || []).reduce((inner, item) => inner + (Number(item.minutes) || 0), 0), 0);
  const truckDays = week.filter(record => record.truckDay).length;
  const recurring = getRecurringProblems({ ...data, history: week.filter(record => record.date !== data.date) }, 2).slice(0, 4);
  const learned = Object.values(learning || {})
    .filter(item => item.count >= 2)
    .sort((a, b) => b.count - a.count || b.updatedAt?.localeCompare(a.updatedAt || ''))
    .slice(0, 4);

  const startDate = week.length ? week[week.length - 1].date : data.date;
  const endDate = week.length ? week[0].date : data.date;
  const formatDate = date => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`));
  const shiftName = shiftLabel(data.activeShift || 'morning');

  const text = [
    `Weekly Manager Report — ${formatDate(startDate)} to ${formatDate(endDate)}`,
    `${shiftName} shift records only. Other-shift patterns are store follow-up items, not automatic ownership for me.`,
    '',
    `Completed on my documented shifts: ${completed}`,
    `Unfinished on my documented shifts: ${unfinished}`,
    `Added to Loretta report: ${reported}`,
    `Interruptions: ${interruptionMinutes} minutes`,
    `Truck days documented: ${truckDays}`,
    recurring.length ? `\nRecurring issues:\n${recurring.map(issue => `• ${issue.category}: ${issue.days} days — ${issue.scope.label}. ${issue.action}`).join('\n')}` : '',
    learned.length ? `\nLearned task pace:\n${learned.map(item => `• ${item.title}: ${item.average} minutes average`).join('\n')}` : '',
  ].filter(Boolean).join('\n');

  return {
    startDate,
    endDate,
    days: week.length,
    completed,
    unfinished,
    handedOff: reported,
    reported,
    interruptionMinutes,
    truckDays,
    recurring,
    learned,
    text,
  };
}
