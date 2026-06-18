// Mobile header collapse — runs at module load, independent of React.
// Polls every 100ms + listens to all scroll events.
// Adds body.tn-header-collapsed when user scrolls down, removes at top.

if (window.innerWidth <= 767) {
  const update = (e) => {
    // Check every possible scroll container:
    // 1. window (body scroll)
    // 2. event target (whichever element fired the scroll event)
    // 3. .tn-main-content directly
    const target = e && e.target !== document ? e.target : null;
    const el = document.querySelector('.tn-main-content');
    const scrolled =
      window.scrollY > 10 ||
      (target && target.scrollTop > 10) ||
      (el && el.scrollTop > 10);
    document.body.classList.toggle('tn-header-collapsed', !!scrolled);
  };

  window.addEventListener('scroll', update, { passive: true });
  document.addEventListener('scroll', update, { capture: true, passive: true });

  // Fallback poll every 100ms — catches any scroll container we might miss
  setInterval(update, 100);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 767) document.body.classList.remove('tn-header-collapsed');
  }, { passive: true });
}
