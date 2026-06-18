// Mobile header collapse — independent of React lifecycle.
// Uses HYSTERESIS: collapse when scrolled >20px, restore ONLY when back near top (<5px).
// This prevents flickering at the boundary when scroll momentum naturally bounces.

if (window.innerWidth <= 767) {
  let collapsed = false;

  // Track whichever element is actually scrolling
  let activeScroller = null;

  const getScrollTop = () => {
    const main = document.querySelector('.tn-main-content');
    return Math.max(
      window.scrollY || 0,
      (main ? main.scrollTop : 0),
      (activeScroller && activeScroller !== window ? (activeScroller.scrollTop || 0) : 0)
    );
  };

  const update = () => {
    const scrollTop = getScrollTop();
    if (!collapsed && scrollTop > 20) {
      collapsed = true;
      document.body.classList.add('tn-header-collapsed');
    } else if (collapsed && scrollTop < 5) {
      collapsed = false;
      document.body.classList.remove('tn-header-collapsed');
    }
  };

  // Track active scroll target from events
  const onScrollEvent = (e) => {
    const t = (e && e.target !== document && e.target !== window) ? e.target : null;
    if (t && (t.scrollTop || 0) > 0) activeScroller = t;
    else if (window.scrollY > 0) activeScroller = window;
    update();
  };

  window.addEventListener('scroll', onScrollEvent, { passive: true });
  document.addEventListener('scroll', onScrollEvent, { capture: true, passive: true });

  // Poll every 100ms as safety net — hysteresis prevents false resets
  setInterval(update, 100);

  // Clean up on rotate to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 767) {
      collapsed = false;
      document.body.classList.remove('tn-header-collapsed');
    }
  }, { passive: true });
}
