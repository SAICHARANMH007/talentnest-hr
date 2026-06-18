// Mobile header collapse — independent of React lifecycle.
// Uses HYSTERESIS: collapse when scrolled >20px, restore ONLY when back near top (<5px).
// Also sets --tn-header-height CSS variable so banners/overlays can position themselves.

if (window.innerWidth <= 767) {
  let collapsed = false;
  let activeScroller = null;

  const HEADER_FULL = 116;   // px — full two-row header height + padding
  const HEADER_SLIM = 60;    // px — collapsed single-row header height

  // Initialise CSS variable
  document.documentElement.style.setProperty('--tn-header-height', HEADER_FULL + 'px');

  const setCollapsed = (next) => {
    if (next === collapsed) return;
    collapsed = next;
    if (collapsed) {
      document.body.classList.add('tn-header-collapsed');
      document.documentElement.style.setProperty('--tn-header-height', HEADER_SLIM + 'px');
    } else {
      document.body.classList.remove('tn-header-collapsed');
      document.documentElement.style.setProperty('--tn-header-height', HEADER_FULL + 'px');
    }
  };

  const getScrollTop = () => {
    const main = document.querySelector('.tn-main-content');
    return Math.max(
      window.scrollY || 0,
      main ? main.scrollTop : 0,
      activeScroller && activeScroller !== window ? (activeScroller.scrollTop || 0) : 0
    );
  };

  const update = () => {
    const scrollTop = getScrollTop();
    if (!collapsed && scrollTop > 20) setCollapsed(true);
    else if (collapsed && scrollTop < 5) setCollapsed(false);
  };

  const onScrollEvent = (e) => {
    const t = (e && e.target !== document && e.target !== window) ? e.target : null;
    if (t && (t.scrollTop || 0) > 0) activeScroller = t;
    else if (window.scrollY > 0) activeScroller = window;
    update();
  };

  window.addEventListener('scroll', onScrollEvent, { passive: true });
  document.addEventListener('scroll', onScrollEvent, { capture: true, passive: true });
  setInterval(update, 100);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 767) {
      setCollapsed(false);
    }
  }, { passive: true });
}
