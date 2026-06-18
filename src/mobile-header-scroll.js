// Mobile header collapse — independent of React lifecycle.
// Hides icon buttons row when scrolled down, restores at top.

if (window.innerWidth <= 767) {
  // Track whichever element is actually doing the scrolling
  let activeScroller = null;

  // On scroll events, remember which element scrolled
  const onScroll = (e) => {
    const target = (e.target !== document && e.target !== window) ? e.target : null;
    if (target && target.scrollTop > 0) {
      activeScroller = target;
    } else if (window.scrollY > 0) {
      activeScroller = window;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });

  // Poll every 100ms — check the tracked scroller + window + .tn-main-content
  setInterval(() => {
    const mainContent = document.querySelector('.tn-main-content');
    const scrolled =
      window.scrollY > 10 ||
      (mainContent && mainContent.scrollTop > 10) ||
      (activeScroller && activeScroller !== window && activeScroller.scrollTop > 10);
    document.body.classList.toggle('tn-header-collapsed', !!scrolled);
  }, 100);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 767) document.body.classList.remove('tn-header-collapsed');
  }, { passive: true });
}
