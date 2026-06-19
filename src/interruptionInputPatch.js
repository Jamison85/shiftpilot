// Lets the interruption minutes field be fully cleared before typing a custom value.
// The React field currently normalizes empty input to a minimum value immediately,
// which makes mobile keyboards insert a stubborn 1 or 5 like a tiny haunted cashier.
if (typeof window !== 'undefined' && !window.__shiftPilotInterruptionInputPatch) {
  window.__shiftPilotInterruptionInputPatch = true;

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
}
