// Basic client-side form handling with accessibility-friendly status messages
(function () {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  if (!form) return;

  function setStatus(msg, ok) {
    status.textContent = msg;
    status.style.color = ok ? '#10B981' : '#6B7280';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const data = new FormData(form);

    // Simple validation
    if (!data.get('name') || !data.get('email') || !data.get('message') || !data.get('gdpr')) {
      setStatus('Please fill in required fields and accept GDPR.', false);
      return;
    }

    // Simulate async submission
    setStatus('Sending…', false);
    setTimeout(() => {
      setStatus('Thank you! We will get back to you within 24 hours.', true);
      form.reset();
    }, 900);
  });
// Scroll-to-top button
  const toTopBtn = document.querySelector('.to-top');
  if (toTopBtn) {
    const SHOW_AFTER_PX = 200;

    function updateVisibility() {
      const y = window.scrollY || document.documentElement.scrollTop;
      if (y > SHOW_AFTER_PX) toTopBtn.classList.add('is-visible');
      else toTopBtn.classList.remove('is-visible');
    }

    window.addEventListener('scroll', updateVisibility, { passive: true });
    updateVisibility();

    toTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();