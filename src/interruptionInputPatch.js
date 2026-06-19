// Small client-side patches for mobile edge cases, final wording, and shift scoping.
// The app should document the shift actually worked, not quietly make one person own the whole store day.
if (typeof window !== 'undefined' && !window.__shiftPilotClientPatch) {
  window.__shiftPilotClientPatch = true;

  const DATA_KEY = 'shiftpilot:data:v1';

  const scopeHistoryRecord = (record, fallbackShift) => {
    if (!record || typeof record !== 'object') return record;
    const activeShift = record.activeShift || record.shift || fallbackShift || 'morning';
    const handoffNotes = record.handoffNotes || {};
    return {
      ...record,
      activeShift,
      unfinished: (record.unfinished || []).filter(task => !task.shift || task.shift === activeShift),
      interruptions: (record.interruptions || []).filter(item => !item.shift || item.shift === activeShift),
      handoffNotes: { [activeShift]: handoffNotes[activeShift] || '' },
    };
  };

  const scopeStoredData = data => {
    if (!data || typeof data !== 'object') return data;
    const activeShift = data.activeShift || 'morning';
    return {
      ...data,
      history: (data.history || []).map(record => scopeHistoryRecord(record, activeShift)),
    };
  };

  const normalizeStoredData = () => {
    try {
      const raw = window.localStorage.getItem(DATA_KEY);
      if (!raw) return;
      const scoped = scopeStoredData(JSON.parse(raw));
      window.localStorage.setItem(DATA_KEY, JSON.stringify(scoped));
    } catch {
      // Leave damaged storage alone. The main app already has its own fallback.
    }
  };

  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
  window.localStorage.setItem = (key, value) => {
    if (key === DATA_KEY) {
      try {
        const scoped = scopeStoredData(JSON.parse(value));
        return originalSetItem(key, JSON.stringify(scoped));
      } catch {
        return originalSetItem(key, value);
      }
    }
    return originalSetItem(key, value);
  };

  document.addEventListener(
    'input',
    event => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== 'number') return;
      if (!target.closest('.sp-interrupt-modal')) return;

      if (target.value === '') {
        event.stopImmediatePropagation();
      }
    },
    true,
  );

  const replacements = [
    ['Handoff', 'Report'],
    ['SHIFT HANDOFF', 'MANAGER REPORT'],
    ['Shift Handoff', 'Shift Report'],
    ['Share handoff', 'Share report'],
    ['Create handoff', 'Create report'],
    ['Add to handoff', 'Add to report'],
    ['Review leftovers, create a handoff, or reset the day.', 'Review leftovers, create a report, or reset the day.'],
    ['Unfinished or marked items are included automatically.', 'Selected notes and unfinished items from this shift are included automatically.'],
    ['Needs attention:', 'Needs follow-up:'],
    ['A running record of what got done and what kept getting in the way.', 'A running record of the shift you documented, not every shift in the store.'],
    ['Patterns, not random annoyances', 'Patterns from my documented shifts'],
    ['Problems appear here after they show up on at least two different days.', 'Patterns appear after they show up on at least two days you documented.'],
  ];

  const updateText = node => {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    let text = node.nodeValue;
    for (const [before, after] of replacements) text = text.replaceAll(before, after);
    if (text !== node.nodeValue) node.nodeValue = text;
  };

  const addShiftScopeNotes = () => {
    const heroTabs = document.querySelector('.sp-hero .sp-shift-tabs');
    if (heroTabs && !document.querySelector('.sp-scope-note')) {
      const note = document.createElement('div');
      note.className = 'sp-scope-note';
      note.textContent = 'Today is scoped to the shift you actually worked.';
      heroTabs.insertAdjacentElement('beforebegin', note);
    }

    const taskTabs = document.querySelector('.sp-page .sp-shift-tabs.light');
    if (taskTabs && !taskTabs.parentElement?.querySelector('.sp-scope-note-light')) {
      const note = document.createElement('div');
      note.className = 'sp-scope-note-light';
      note.textContent = 'Switch only if you are documenting a different shift today.';
      taskTabs.insertAdjacentElement('afterend', note);
    }
  };

  const scan = root => {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      updateText(node);
      node = walker.nextNode();
    }
    addShiftScopeNotes();
  };

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) updateText(node);
        else scan(node);
      }
    }
    addShiftScopeNotes();
  });

  normalizeStoredData();
  window.addEventListener('load', () => {
    normalizeStoredData();
    scan(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
