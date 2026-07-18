/* ===================================================================
   THE 6AM CLUB — Interactive JavaScript
   Scroll reveals, gallery filter, FAQ accordion, mobile nav, form
   =================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ─── VIDEO PLAYBACK HELPER (Handles iOS Low Power Mode Autoplay Block) ───
  function enableVideoAutoplayWithFallback(videoElement) {
    if (!videoElement) return;

    videoElement.muted = true;
    videoElement.playsInline = true;
    videoElement.loop = true;

    // Attempt native autoplay
    videoElement.play().catch(() => {
      // Autoplay blocked (e.g. Low Power Mode). Setup fallback to play on first user interaction.
      const playOnGesture = () => {
        videoElement.play().then(() => {
          // Successfully playing, clean up listeners
          document.removeEventListener('click', playOnGesture);
          document.removeEventListener('touchstart', playOnGesture);
        }).catch(() => {});
      };
      document.addEventListener('click', playOnGesture);
      document.addEventListener('touchstart', playOnGesture);
    });
  }

  // Initialize videos
  const heroVideo = document.getElementById('hero-video');
  enableVideoAutoplayWithFallback(heroVideo);

  const outingsHeroVideo = document.querySelector('.outings-hero__video');
  enableVideoAutoplayWithFallback(outingsHeroVideo);

  // ─── SCROLL REVEAL ANIMATION ──────────────────────────────────
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  // ─── ANIMATED STAT COUNTERS (Outings Hero) ────────────────────
  const statElements = document.querySelectorAll('.outings-hero__stat-value');

  if (statElements.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statElements.forEach(el => counterObserver.observe(el));
  }

  function animateCounter(el) {
    const text = el.textContent.trim();
    const hasPlus = text.includes('+');
    const hasComma = text.includes(',');
    const numericValue = parseInt(text.replace(/[^0-9]/g, ''), 10);

    if (isNaN(numericValue)) return;

    const duration = 1800;
    const startTime = performance.now();

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      let currentValue = Math.floor(easedProgress * numericValue);

      if (hasComma) {
        currentValue = currentValue.toLocaleString();
      }

      el.textContent = currentValue + (hasPlus ? '+' : '');

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // ─── DYNAMIC GALLERY & FILTER ───────────────────────────────────
  const galleryGrid = document.getElementById('gallery-grid');
  if (galleryGrid && typeof OUTINGS_DATA !== 'undefined') {
    let cardsToShow = 6;

    function renderGallery(filter = 'all', limit = cardsToShow) {
      galleryGrid.innerHTML = '';
      
      const filteredData = OUTINGS_DATA.filter(item => filter === 'all' || item.category === filter);
      const visibleData = filteredData.slice(0, limit);

      visibleData.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'recap-card reveal reveal--visible';
        card.dataset.category = item.category;

        const imagesHtml = item.images.map(imgSrc => `<img src="${imgSrc}" alt="Week ${item.week} outing" loading="lazy">`).join('');

        card.innerHTML = `
          <div class="recap-card__carousel">
            ${imagesHtml}
          </div>
          <div class="recap-card__body">
            <h3 class="recap-card__title" style="margin-bottom: 0;">Week ${item.week}</h3>
          </div>
        `;
        galleryGrid.appendChild(card);
      });

      // Update Load More button visibility
      const loadMoreBtn = document.getElementById('load-more-btn');
      if (loadMoreBtn) {
        if (limit >= filteredData.length) {
          loadMoreBtn.style.display = 'none';
        } else {
          loadMoreBtn.style.display = 'inline-block';
          loadMoreBtn.innerHTML = 'Load More Outings <span class="btn__arrow">↓</span>';
          loadMoreBtn.disabled = false;
        }
      }
      
      initCarouselAutoScroll();
    }

    let globalCarouselInterval;

    function initCarouselAutoScroll() {
      // Clear existing global interval to prevent duplicates
      if (globalCarouselInterval) clearInterval(globalCarouselInterval);

      // Create one synchronized interval so all carousels swipe at the exact same time
      globalCarouselInterval = setInterval(() => {
        const carousels = document.querySelectorAll('.recap-card__carousel');
        carousels.forEach(carousel => {
          // Pause if user is hovering or interacting with this specific carousel
          if (carousel.matches(':hover') || carousel.matches(':active')) return;

          const maxScroll = carousel.scrollWidth - carousel.clientWidth;
          
          // If we are within half a screen width of the very end, we are looking at the last image.
          // Reset back to the first image.
          if (carousel.scrollLeft >= maxScroll - (carousel.clientWidth * 0.5)) {
            carousel.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            // Always calculate based on 85% of the container width to guarantee consistent scrolling 
            // even before images have fully loaded.
            const scrollAmt = carousel.clientWidth * 0.85;
            carousel.scrollBy({ left: scrollAmt, behavior: 'smooth' });
          }
        });
      }, 1500);
    }

    // Initial render
    renderGallery();

    // Filter Buttons logic
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('pill--active'));
        btn.classList.add('pill--active');
        const filter = btn.dataset.filter;
        renderGallery(filter, cardsToShow);
      });
    });

    // Real Load More logic
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        loadMoreBtn.innerHTML = 'Loading...';
        loadMoreBtn.disabled = true;
        setTimeout(() => {
          const activeFilterBtn = document.querySelector('[data-filter].pill--active');
          const activeFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
          cardsToShow += 6;
          renderGallery(activeFilter, cardsToShow);
        }, 800);
      });
    }
  }

  // ─── FAQ ACCORDION ────────────────────────────────────────────
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-item__question');

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('active');

      // Close all other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
          otherItem.querySelector('.faq-item__question').setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current item
      item.classList.toggle('active');
      question.setAttribute('aria-expanded', !isOpen);
    });
  });

  // ─── MOBILE NAV TOGGLE ────────────────────────────────────────
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('nav__links--mobile-open');

      // Animate hamburger to X
      const spans = navToggle.querySelectorAll('span');
      const isOpen = navLinks.classList.contains('nav__links--mobile-open');

      if (isOpen) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      }
    });

    // Close mobile nav on link click
    navLinks.querySelectorAll('.nav__link, .nav__cta').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('nav__links--mobile-open');
        const spans = navToggle.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
      });
    });
  }

  // ─── NAV SCROLL EFFECT ────────────────────────────────────────
  const nav = document.getElementById('main-nav');

  if (nav) {
    let lastScrollY = 0;

    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 100) {
        nav.style.background = 'rgba(10, 10, 10, 0.9)';
        nav.style.borderBottom = '1px solid var(--color-border)';
      } else {
        nav.style.background = 'transparent';
        nav.style.borderBottom = 'none';
      }

      lastScrollY = currentScrollY;
    });
  }

  // ─── FORM HANDLING ────────────────────────────────────────────
  const joinForm = document.getElementById('join-form');

  if (joinForm) {
    joinForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById('form-submit-btn');
      const originalText = submitBtn.innerHTML;

      // Validate
      const requiredFields = joinForm.querySelectorAll('[required]');
      let isValid = true;

      requiredFields.forEach(field => {
        if (field.type === 'checkbox' && !field.checked) {
          isValid = false;
          field.closest('.form-checkbox').style.outline = '1px solid var(--color-danger)';
          field.closest('.form-checkbox').style.outlineOffset = '4px';
          field.closest('.form-checkbox').style.borderRadius = 'var(--radius-sm)';
        } else if (!field.value.trim()) {
          isValid = false;
          field.style.borderColor = 'var(--color-danger)';
          field.style.boxShadow = '0 0 0 3px rgba(255, 68, 68, 0.15)';
        } else {
          field.style.borderColor = '';
          field.style.boxShadow = '';
          if (field.type === 'checkbox') {
            field.closest('.form-checkbox').style.outline = '';
          }
        }
      });

      if (!isValid) return;

      // Collect form data
      const firstName = (document.getElementById('first-name').value || '').trim();
      const lastName = (document.getElementById('last-name').value || '').trim();
      const email = (document.getElementById('email').value || '').trim();
      const phone = (document.getElementById('phone').value || '').trim();
      const fitnessRaw = (document.getElementById('fitness-level').value || '').trim();
      const msgNote = (document.getElementById('message').value || '').trim();

      const fitnessLabels = {
        beginner: 'Beginner — Just starting',
        intermediate: 'Intermediate — I run sometimes',
        advanced: 'Advanced — Sub-25 min 5K',
        elite: 'Elite — I eat KMs for breakfast'
      };
      const fitnessLabel = fitnessLabels[fitnessRaw] || fitnessRaw;

      // Build WhatsApp intro message
      let waText =
        `👋 Hi 6AM Club! I just signed up and I'm ready to show up.\n\n` +
        `🏃 *Name:* ${firstName} ${lastName}\n` +
        `📱 *Phone:* ${phone}\n` +
        `📧 *Email:* ${email}\n` +
        `💪 *Fitness Level:* ${fitnessLabel}`;

      if (msgNote) {
        waText += `\n📝 *About me:* ${msgNote}`;
      }

      waText += `\n\nSee you all at 6AM this Saturday! 🌅`;

      const waUrl = `https://wa.me/?text=${encodeURIComponent(waText)}`;

      // Submit animation
      submitBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px;">Locking In Your Spot <span class="spinner"></span></span>';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';

      // Simulate submission
      setTimeout(() => {
        submitBtn.innerHTML = '✓ You\'re In — See You Saturday';
        submitBtn.style.background = 'var(--color-success)';
        submitBtn.style.opacity = '1';

        // Show success modal after brief pause
        setTimeout(() => {
          showWAModal(waText);
        }, 600);
      }, 2000);
    });

    // Clear error styles on input
    joinForm.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
      input.addEventListener('focus', () => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
      });
    });
  }

  // ─── WHATSAPP SUCCESS MODAL ───────────────────────────────────
  function showWAModal(waText) {
    const WA_GROUP = 'https://chat.whatsapp.com/JSNSmbFl1RS0CyjRu9prfk?s=cl&p=i&ilr=0&amv=2';

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'wa-modal-backdrop';
    backdrop.className = 'wa-modal-backdrop';

    // Modal box
    const modal = document.createElement('div');
    modal.className = 'wa-modal-box';

    // Format message for display (replace \n with <br>)
    const displayMsg = waText.replace(/\n/g, '<br>');

    modal.innerHTML = `
      <div class="wa-modal-header">
        <div class="wa-modal-icon">🎉</div>
        <h3 class="wa-modal-title">Almost There!</h3>
        <p class="wa-modal-desc">Follow these <strong style="color:var(--color-accent)">2 steps</strong> — the join button unlocks after you copy.</p>
      </div>

      <div id="wa-msg-box" class="wa-msg-box">${displayMsg}</div>

      <div class="wa-btn-group">
        <button id="wa-copy-btn" class="wa-copy-btn">📋 Step 1: Copy Your Details</button>
        <a id="wa-join-btn" href="${WA_GROUP}" target="_blank" rel="noopener noreferrer" class="wa-join-btn wa-join-btn--locked" aria-disabled="true" tabindex="-1">🔒 Step 2: Join Group (copy first)</a>
      </div>

      <p class="wa-footer-text" id="wa-hint-text" style="color: var(--color-text-muted); font-weight: 500;">
        Copy your details first, then the join button will unlock.
      </p>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        backdrop.classList.add('wa-modal-visible');
      });
    });

    let hasCopied = false;

    // Unlock the join button after successful copy
    const unlockJoinButton = () => {
      if (hasCopied) return;
      hasCopied = true;

      const joinBtn = document.getElementById('wa-join-btn');
      const hintText = document.getElementById('wa-hint-text');

      if (joinBtn) {
        joinBtn.classList.remove('wa-join-btn--locked');
        joinBtn.removeAttribute('aria-disabled');
        joinBtn.removeAttribute('tabindex');
        joinBtn.innerHTML = '✅ Step 2: Join & Paste Details →';
        // Pulse animation to draw attention
        joinBtn.style.animation = 'wa-pulse 0.6s ease';
      }
      if (hintText) {
        hintText.style.color = 'var(--color-accent)';
        hintText.textContent = 'Details copied! Now join the group and paste your message there.';
      }
    };

    // Copy function
    const copyTextToClipboard = () => {
      const copyBtn = document.getElementById('wa-copy-btn');
      navigator.clipboard.writeText(waText).then(() => {
        if (copyBtn) {
          copyBtn.textContent = '✓ Copied!';
          copyBtn.classList.add('wa-copy-btn--success');
        }
        unlockJoinButton();
      }).catch(() => {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = waText;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        if (copyBtn) {
          copyBtn.textContent = '✓ Copied!';
          copyBtn.classList.add('wa-copy-btn--success');
        }
        unlockJoinButton();
      });
    };

    // Copy button click
    document.getElementById('wa-copy-btn').addEventListener('click', copyTextToClipboard);

    // Prevent join if not copied yet
    document.getElementById('wa-join-btn').addEventListener('click', (e) => {
      if (!hasCopied) {
        e.preventDefault();
        // Shake the copy button to tell them to copy first
        const copyBtn = document.getElementById('wa-copy-btn');
        if (copyBtn) {
          copyBtn.style.animation = 'wa-shake 0.4s ease';
          setTimeout(() => { copyBtn.style.animation = ''; }, 400);
        }
      }
    });

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('wa-modal-visible');
        setTimeout(() => backdrop.remove(), 350);
      }
    });
  }


  const tierCTAs = {
    'cta-community': 'community',
    'cta-community-preview': 'community'
  };

  Object.entries(tierCTAs).forEach(([btnId, tierValue]) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tierSelect = document.getElementById('tier-select');
        if (tierSelect) {
          tierSelect.value = tierValue;
          tierSelect.dispatchEvent(new Event('change'));
        }
        document.getElementById('signup-form').scrollIntoView({ behavior: 'smooth' });
      });
    }
  });

  // ─── PARALLAX EFFECT ON HERO IMAGE ────────────────────────────
  const heroImage = document.querySelector('.outings-hero__bg img');

  if (heroImage) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      const heroHeight = document.querySelector('.outings-hero').offsetHeight;

      if (scrollY < heroHeight) {
        const parallax = scrollY * 0.3;
        heroImage.style.transform = `translateY(${parallax}px) scale(1.1)`;
      }
    });
  }

  // Load more button placeholder (handled dynamically above)

  // ─── SMOOTH SCROLL FOR ANCHOR LINKS ───────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});
