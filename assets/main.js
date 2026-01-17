// Contact form submission (Vercel Serverless Function) + scroll-to-top button
(function () {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');

  function setStatus(msg, ok) {
    if (!status) return;
    status.textContent = msg;
    status.style.color = ok ? '#10B981' : '#6B7280';
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const fd = new FormData(form);
      const payload = {
        name: String(fd.get('name') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        phone: String(fd.get('phone') || '').trim(),
        message: String(fd.get('message') || '').trim(),
        gdpr: Boolean(fd.get('gdpr')),
        // honeypot (should be empty)
        company: String(fd.get('company') || '').trim(),
      };

      // Basic client-side validation
      if (!payload.name || !payload.email || !payload.message || !payload.gdpr) {
        setStatus('Please fill in required fields and accept GDPR.', false);
        return;
      }

      setStatus('Sending…', false);

      try {
        const resp = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok || !data.ok) {
          setStatus(data.error || 'Failed to send. Please try again later.', false);
          return;
        }

        setStatus('Thank you! We will get back to you within 24 hours.', true);
        form.reset();
      } catch (err) {
        setStatus('Network error. Please try again later.', false);
      }
    });
  }

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
