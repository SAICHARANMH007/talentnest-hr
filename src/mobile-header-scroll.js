// Module-level scroll listener — runs once when the JS bundle loads.
// Completely independent of React lifecycle.
// On mobile: adds body.tn-header-collapsed when scrolled >20px,
// removes it when back at top. CSS in mobile-additions.css hides the
// icon buttons row when this class is present.

if (window.innerWidth <= 767) {
  const update = () => {
    const el = document.querySelector('.tn-main-content');
    const scrolled = window.scrollY > 20 || (el ? el.scrollTop > 20 : false);
    document.body.classList.toggle('tn-header-collapsed', scrolled);
  };

  // window scroll covers body/page scroll
  window.addEventListener('scroll', update, { passive: true });
  // capture phase covers scroll on inner elements (doesn't bubble)
  document.addEventListener('scroll', update, { capture: true, passive: true });

  // Remove class if device rotates to wide screen
  window.addEventListener('resize', () => {
    if (window.innerWidth > 767) document.body.classList.remove('tn-header-collapsed');
  }, { passive: true });
}
