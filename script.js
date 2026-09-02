/**
 * Binayak Dhakal — Cybersecurity Portfolio
 * Interactive Architecture & UI Interactions
 */

document.addEventListener('DOMContentLoaded', () => {

  /* --------------------------------------------------------------------------
     1. Typewriter Terminal Effect
     -------------------------------------------------------------------------- */
  const typewriterElement = document.getElementById('typewriter-output');
  const roles = [
    'Cybersecurity Student',
    'Aspiring Cybersecurity Analyst',
    'Network Defense Practitioner',
    'Digital Forensics Enthusiast',
    'Investigative Security Analyst'
  ];

  let currentRoleIndex = 0;
  let currentCharIndex = 0;
  let isDeleting = false;
  let typingSpeed = 90;

  function typeWriterLoop() {
    const currentRole = roles[currentRoleIndex];

    if (isDeleting) {
      typewriterElement.textContent = currentRole.substring(0, currentCharIndex - 1);
      currentCharIndex--;
      typingSpeed = 45;
    } else {
      typewriterElement.textContent = currentRole.substring(0, currentCharIndex + 1);
      currentCharIndex++;
      typingSpeed = 90;
    }

    if (!isDeleting && currentCharIndex === currentRole.length) {
      // Pause at end of word
      isDeleting = true;
      typingSpeed = 1800;
    } else if (isDeleting && currentCharIndex === 0) {
      isDeleting = false;
      currentRoleIndex = (currentRoleIndex + 1) % roles.length;
      typingSpeed = 400;
    }

    setTimeout(typeWriterLoop, typingSpeed);
  }

  if (typewriterElement) {
    typeWriterLoop();
  }

  /* --------------------------------------------------------------------------
     2. Scroll Reveal Animations (IntersectionObserver)
     -------------------------------------------------------------------------- */
  const revealElements = document.querySelectorAll('.section-reveal');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        // Keep observing or unobserve once revealed
      }
    });
  }, {
    root: null,
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => {
    revealObserver.observe(el);
  });

  /* --------------------------------------------------------------------------
     3. Active Nav & Side-Dot Tracking on Scroll
     -------------------------------------------------------------------------- */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links .nav-item');
  const sideDots = document.querySelectorAll('.side-dot-nav .side-dot');
  const navbar = document.getElementById('navbar');

  function handleScrollNavigation() {
    const scrollY = window.pageYOffset;

    // Header styling on scroll
    if (scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Determine current section in viewport
    let currentSectionId = 'hero';

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 180;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute('id');
      }
    });

    // Update Desktop Nav Links
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });

    // Update Side Dots
    sideDots.forEach(dot => {
      dot.classList.remove('active');
      if (dot.getAttribute('data-section') === currentSectionId) {
        dot.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', handleScrollNavigation, { passive: true });
  handleScrollNavigation(); // Initial call

  /* --------------------------------------------------------------------------
     4. Mobile Drawer Menu Toggle
     -------------------------------------------------------------------------- */
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const drawerClose = document.getElementById('drawer-close');
  const drawerLinks = document.querySelectorAll('.drawer-link');

  function openMobileMenu() {
    mobileDrawer.classList.add('open');
    mobileDrawer.setAttribute('aria-hidden', 'false');
    mobileToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    mobileDrawer.classList.remove('open');
    mobileDrawer.setAttribute('aria-hidden', 'true');
    mobileToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (mobileToggle) {
    mobileToggle.addEventListener('click', openMobileMenu);
  }

  if (drawerClose) {
    drawerClose.addEventListener('click', closeMobileMenu);
  }

  drawerLinks.forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (mobileDrawer && mobileDrawer.classList.contains('open')) {
      if (!mobileDrawer.contains(e.target) && !mobileToggle.contains(e.target)) {
        closeMobileMenu();
      }
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileMenu();
      closeProjectModal();
    }
  });

  /* --------------------------------------------------------------------------
     5. Toast Notification System
     -------------------------------------------------------------------------- */
  const toast = document.getElementById('toast');
  const toastTitle = document.getElementById('toast-title');
  const toastMessage = document.getElementById('toast-message');
  let toastTimeout;

  function showToast(title, message, duration = 4000) {
    if (!toast) return;

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    toast.classList.add('show');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  /* --------------------------------------------------------------------------
     6. Copy Email to Clipboard
     -------------------------------------------------------------------------- */
  const copyEmailBtn = document.getElementById('copy-email-btn');
  const emailAddress = 'binayakdhakal8@gmail.com';

  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(emailAddress).then(() => {
        showToast('Email Copied to Clipboard', `Copied ${emailAddress} successfully.`);
      }).catch(err => {
        showToast('Direct Email Link', `Please email directly at ${emailAddress}`);
      });
    });
  }

  /* --------------------------------------------------------------------------
     7. CV / Resume Download Placeholder Interaction
     -------------------------------------------------------------------------- */
  const cvButtons = [
    document.getElementById('nav-cv-btn'),
    document.getElementById('hero-cv-btn'),
    document.getElementById('main-cv-download-btn')
  ];

  cvButtons.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        // If it's a direct anchor jump to #cv-section, let smooth scroll handle it, or show status
        if (btn.id === 'main-cv-download-btn' || btn.id === 'hero-cv-btn') {
          e.preventDefault();
          showToast(
            'Curriculum Vitae (PDF)',
            'Resume is currently being updated with 2026 Herald College coursework. Direct request link opened.'
          );
          // Open direct mailto for CV request
          setTimeout(() => {
            window.location.href = `mailto:binayakdhakal8@gmail.com?subject=CV%20Request%20-%20Binayak%20Dhakal&body=Hello%20Binayak,%0A%0AI%20would%20like%20to%20request%20a%20copy%20of%20your%20latest%20Cybersecurity%20Curriculum%20Vitae.%0A%0AThank%20you!`;
          }, 1200);
        }
      });
    }
  });

  /* --------------------------------------------------------------------------
     8. Project Deep-Dive Modal Logic
     -------------------------------------------------------------------------- */
  const projectModal = document.getElementById('project-modal');
  const openModalBtn = document.getElementById('open-project-modal-btn');
  const closeModalBtn = document.getElementById('close-project-modal-btn');
  const closeModalFooterBtn = document.getElementById('close-modal-footer-btn');

  function openProjectModal() {
    if (!projectModal) return;
    projectModal.classList.add('open');
    projectModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeProjectModal() {
    if (!projectModal) return;
    projectModal.classList.remove('open');
    projectModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (openModalBtn) {
    openModalBtn.addEventListener('click', openProjectModal);
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeProjectModal);
  }

  if (closeModalFooterBtn) {
    closeModalFooterBtn.addEventListener('click', closeProjectModal);
  }

  if (projectModal) {
    projectModal.addEventListener('click', (e) => {
      if (e.target === projectModal) {
        closeProjectModal();
      }
    });
  }

  /* --------------------------------------------------------------------------
     8b. Certificate Lightbox Modal Logic
     -------------------------------------------------------------------------- */
  const certModal = document.getElementById('cert-modal-overlay');
  const openCertModalBtn = document.getElementById('btn-open-cert-modal');
  const certThumbTrigger = document.getElementById('cert-thumb-trigger');
  const closeCertModalBtn = document.getElementById('close-cert-modal-btn');

  function openCertModal() {
    if (!certModal) return;
    certModal.classList.add('is-active');
    certModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCertModal() {
    if (!certModal) return;
    certModal.classList.remove('is-active');
    certModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (openCertModalBtn) {
    openCertModalBtn.addEventListener('click', openCertModal);
  }

  if (certThumbTrigger) {
    certThumbTrigger.addEventListener('click', openCertModal);
  }

  if (closeCertModalBtn) {
    closeCertModalBtn.addEventListener('click', closeCertModal);
  }

  if (certModal) {
    certModal.addEventListener('click', (e) => {
      if (e.target === certModal) {
        closeCertModal();
      }
    });
  }

  // Global ESC Key Listener for all modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProjectModal();
      closeCertModal();
    }
  });

  /* --------------------------------------------------------------------------
     9. Direct Peer-to-Peer Contact Form Dispatch (Zero Third Parties)
     -------------------------------------------------------------------------- */
  const contactForm = document.getElementById('contact-form');
  const dispatchModal = document.getElementById('email-dispatch-modal');
  const closeDispatchBtn = document.getElementById('close-dispatch-modal-btn');
  const cancelDispatchBtn = document.getElementById('cancel-dispatch-modal-btn');
  const gmailWebBtn = document.getElementById('dispatch-gmail-web-btn');
  const defaultAppBtn = document.getElementById('dispatch-default-app-btn');
  const copyBtn = document.getElementById('dispatch-copy-btn');

  function closeDispatchModal() {
    if (!dispatchModal) return;
    dispatchModal.classList.remove('is-active');
    dispatchModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (closeDispatchBtn) closeDispatchBtn.addEventListener('click', closeDispatchModal);
  if (cancelDispatchBtn) cancelDispatchBtn.addEventListener('click', closeDispatchModal);
  if (dispatchModal) {
    dispatchModal.addEventListener('click', (e) => {
      if (e.target === dispatchModal) closeDispatchModal();
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('contact-name');
      const emailInput = document.getElementById('contact-email');
      const subjectInput = document.getElementById('contact-subject');
      const messageInput = document.getElementById('contact-message');

      const nameVal = nameInput ? nameInput.value.trim() : '';
      const emailVal = emailInput ? emailInput.value.trim() : '';
      const subjectVal = subjectInput && subjectInput.value.trim() ? subjectInput.value.trim() : 'Cybersecurity Portfolio Inquiry';
      const messageVal = messageInput ? messageInput.value.trim() : '';

      if (!nameVal || !emailVal || !messageVal) {
        showToast('Validation Error', 'Please complete all required fields.');
        return;
      }

      const fullSubject = `[Portfolio Inquiry] ${subjectVal} - from ${nameVal}`;
      const fullBody = `Dear Binayak,\n\n${messageVal}\n\n--------------------------------------------------\nSender Contact Information:\n• Full Name: ${nameVal}\n• Direct Email: ${emailVal}\n• Sent via: Direct Portfolio Dispatch\n--------------------------------------------------`;

      const mailtoUrl = `mailto:binayakdhakal8@gmail.com?subject=${encodeURIComponent(fullSubject)}&body=${encodeURIComponent(fullBody)}`;
      const webGmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=binayakdhakal8@gmail.com&su=${encodeURIComponent(fullSubject)}&body=${encodeURIComponent(fullBody)}`;

      if (gmailWebBtn) {
        gmailWebBtn.href = webGmailUrl;
        gmailWebBtn.onclick = () => {
          setTimeout(() => {
            contactForm.reset();
            closeDispatchModal();
          }, 300);
        };
      }

      if (defaultAppBtn) {
        defaultAppBtn.href = mailtoUrl;
        defaultAppBtn.onclick = () => {
          setTimeout(() => {
            contactForm.reset();
            closeDispatchModal();
          }, 300);
        };
      }

      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(`To: binayakdhakal8@gmail.com\nSubject: ${fullSubject}\n\n${fullBody}`);
          showToast('Copied to Clipboard', 'Pre-formatted message copied. Paste into any email composer.');
          contactForm.reset();
          closeDispatchModal();
        };
      }

      if (dispatchModal) {
        dispatchModal.classList.add('is-active');
        dispatchModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      } else {
        window.location.href = mailtoUrl;
      }
    });
  }

  /* --------------------------------------------------------------------------
     10. Subtle 3D Tilt on Hero Annapurna Photo Frame
     -------------------------------------------------------------------------- */
  const photoFrame = document.getElementById('photo-frame');

  if (photoFrame && window.innerWidth > 1024) {
    photoFrame.addEventListener('mousemove', (e) => {
      const rect = photoFrame.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      photoFrame.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    photoFrame.addEventListener('mouseleave', () => {
      photoFrame.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  }

  /* --------------------------------------------------------------------------
     11. Dynamic Year in Footer
     -------------------------------------------------------------------------- */
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

});
