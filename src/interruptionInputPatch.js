// Small client-side patches for mobile edge cases and final wording.
// This keeps the app usable while the main React screen keeps its existing component names.
if (typeof window !== 'undefined' && !window.__shiftPilotClientPatch) {
  window.__shiftPilotClientPatch = true;

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
    ['Review leftovers, create a handoff, or reset the day.', 'Review leftovers, create a report, or reset the day.'],
    ['Unfinished or marked items are included automatically.', 'Selected notes and unfinished items from this shift are included automatically.'],
    ['Needs attention:', 'Needs follow-up:'],
  ];

  const updateText = node => {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    let text = node.nodeValue;
    for (const [before, after] of replacements) text = text.replaceAll(before, after);
    if (text !== node.nodeValue) node.nodeValue = text;
  };

  const scan = root => {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      updateText(node);
      node = walker.nextNode();
    }
  };

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) updateText(node);
        else scan(node);
      }
    }
  });

  window.addEventListener('load', () => {
    scan(document.body);
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
