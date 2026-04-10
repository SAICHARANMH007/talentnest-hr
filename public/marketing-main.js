/* ============================================
   TALENT NEST HR - Main JavaScript
   ============================================ */

// ============================================
// HEADER SCROLL EFFECT
// ============================================
const header = document.querySelector('.header');
const backToTop = document.querySelector('.back-to-top');

window.addEventListener('scroll', () => {
  if (window.scrollY > 80) {
    header?.classList.add('scrolled');
    backToTop?.classList.add('visible');
  } else {
    header?.classList.remove('scrolled');
    backToTop?.classList.remove('visible');
  }
});

backToTop?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ============================================
// MOBILE NAVIGATION
// ============================================
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const mobileNav = document.querySelector('.mobile-nav');
const mobileNavClose = document.querySelector('.mobile-nav-close');

mobileMenuBtn?.addEventListener('click', () => {
  mobileNav?.classList.add('open');
  document.body.style.overflow = 'hidden';
});

mobileNavClose?.addEventListener('click', closeMobileNav);

mobileNav?.addEventListener('click', (e) => {
  if (e.target === mobileNav) closeMobileNav();
});

function closeMobileNav() {
  mobileNav?.classList.remove('open');
  document.body.style.overflow = '';
}

// Close mobile nav on link click
document.querySelectorAll('.mobile-nav-link').forEach(link => {
  link.addEventListener('click', closeMobileNav);
});

// ============================================
// ACTIVE NAV LINK
// ============================================
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-link').forEach(link => {
  const href = link.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    link.classList.add('active');
  }
});

// ============================================
// SCROLL ANIMATIONS
// ============================================
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right').forEach(el => {
  observer.observe(el);
});

// ============================================
// COUNTER ANIMATION
// ============================================
function animateCounter(el, target, suffix = '') {
  const duration = 2000;
  const start = performance.now();
  const startVal = 0;

  function update(currentTime) {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(startVal + (target - startVal) * easeOut);
    el.textContent = current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.animated) {
      entry.target.dataset.animated = 'true';
      const target = parseInt(entry.target.dataset.target);
      const suffix = entry.target.dataset.suffix || '';
      animateCounter(entry.target, target, suffix);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

// ============================================
// TESTIMONIALS SLIDER
// ============================================
const track = document.querySelector('.testimonials-track');
const cards = document.querySelectorAll('.testimonial-card');
const dots = document.querySelectorAll('.slider-dot');
const prevBtn = document.querySelector('.slider-btn.prev');
const nextBtn = document.querySelector('.slider-btn.next');

if (track && cards.length > 0) {
  let currentIndex = 0;
  let autoSlideInterval;
  const visibleCards = () => window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;

  function getSlideWidth() {
    const card = cards[0];
    if (!card) return 0;
    const gap = 28;
    return card.offsetWidth + gap;
  }

  function goToSlide(index) {
    const maxIndex = Math.max(0, cards.length - visibleCards());
    currentIndex = Math.max(0, Math.min(index, maxIndex));
    track.style.transform = `translateX(-${currentIndex * getSlideWidth()}px)`;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
  }

  prevBtn?.addEventListener('click', () => goToSlide(currentIndex - 1));
  nextBtn?.addEventListener('click', () => goToSlide(currentIndex + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => goToSlide(i)));

  function startAutoSlide() {
    autoSlideInterval = setInterval(() => {
      const maxIndex = Math.max(0, cards.length - visibleCards());
      goToSlide(currentIndex >= maxIndex ? 0 : currentIndex + 1);
    }, 4000);
  }

  track.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
  track.addEventListener('mouseleave', startAutoSlide);

  startAutoSlide();
  window.addEventListener('resize', () => goToSlide(0));
}

// ============================================
// JOB FILTER
// ============================================
function initJobFilter() {
  const searchInput = document.getElementById('jobSearch');
  const locationSelect = document.getElementById('jobLocation');
  const typeSelect = document.getElementById('jobType');
  const categorySelect = document.getElementById('jobCategory');
  const jobCards = document.querySelectorAll('.job-card[data-title]');
  const jobCount = document.getElementById('jobCount');

  function filterJobs() {
    const search = searchInput?.value.toLowerCase() || '';
    const location = locationSelect?.value.toLowerCase() || '';
    const type = typeSelect?.value.toLowerCase() || '';
    const category = categorySelect?.value.toLowerCase() || '';

    let visible = 0;
    jobCards.forEach(card => {
      const title = (card.dataset.title || '').toLowerCase();
      const loc = (card.dataset.location || '').toLowerCase();
      const jobType = (card.dataset.type || '').toLowerCase();
      const cat = (card.dataset.category || '').toLowerCase();

      const show =
        (!search || title.includes(search)) &&
        (!location || loc.includes(location)) &&
        (!type || jobType.includes(type)) &&
        (!category || cat.includes(category));

      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    if (jobCount) jobCount.textContent = visible;
  }

  searchInput?.addEventListener('input', filterJobs);
  locationSelect?.addEventListener('change', filterJobs);
  typeSelect?.addEventListener('change', filterJobs);
  categorySelect?.addEventListener('change', filterJobs);
}

initJobFilter();

// ============================================
// CONTACT FORM
// ============================================
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.innerHTML = '<span>Sending...</span>';
    btn.disabled = true;

    setTimeout(() => {
      btn.innerHTML = original;
      btn.disabled = false;
      const success = document.getElementById('successMessage');
      if (success) {
        success.style.display = 'flex';
        contactForm.reset();
        setTimeout(() => { success.style.display = 'none'; }, 5000);
      }
    }, 1800);
  });
}

// ============================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ============================================
// TAB FUNCTIONALITY
// ============================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const group = this.closest('.tabs');
    if (!group) return;
    group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    group.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    this.classList.add('active');
    const target = document.getElementById(this.dataset.tab);
    target?.classList.add('active');
  });
});

// ============================================
// HERO TYPING EFFECT
// ============================================
const typingEl = document.querySelector('.hero-typing');
if (typingEl) {
  const words = ['IT Staffing', 'Non-IT Staffing', 'Cybersecurity', 'C2H Staffing', 'C2C Staffing', 'HRMS Solutions'];
  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function type() {
    const word = words[wordIndex];
    if (isDeleting) {
      typingEl.textContent = word.substring(0, charIndex - 1);
      charIndex--;
    } else {
      typingEl.textContent = word.substring(0, charIndex + 1);
      charIndex++;
    }

    let delay = isDeleting ? 60 : 100;
    if (!isDeleting && charIndex === word.length) {
      delay = 2000;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      delay = 300;
    }

    setTimeout(type, delay);
  }

  type();
}

// ============================================
// NEWSLETTER FORM
// ============================================
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const input = this.querySelector('input');
    const btn = this.querySelector('button');
    if (input?.value) {
      btn.textContent = 'Subscribed!';
      btn.style.background = '#10b981';
      input.value = '';
      setTimeout(() => {
        btn.textContent = 'Subscribe';
        btn.style.background = '';
      }, 3000);
    }
  });
}

// ============================================
// NAVBAR DROPDOWN KEYBOARD SUPPORT
// ============================================
document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
  const trigger = dropdown.querySelector('.nav-link');
  trigger?.setAttribute('tabindex', '0');
  trigger?.setAttribute('role', 'button');
  trigger?.setAttribute('aria-haspopup', 'true');
});

console.log('%cTalent Nest HR 🚀', 'color: #06b6d4; font-size: 20px; font-weight: bold;');
console.log('%cPowered by Innovation | Driven by Talent', 'color: #2563eb; font-size: 12px;');
