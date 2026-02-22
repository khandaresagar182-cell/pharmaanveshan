/* ============================================
   PHARMA ANVESHAN 2026 — WEBSITE JAVASCRIPT
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {



    // ──────────────────────────────────────
    // 2. STICKY NAVBAR + SCROLL SHADOW
    // ──────────────────────────────────────
    const govTopbar = document.querySelector('.gov-topbar');

    window.addEventListener('scroll', () => {
        if (govTopbar) {
            if (window.scrollY > 50) {
                govTopbar.classList.add('scrolled');
            } else {
                govTopbar.classList.remove('scrolled');
            }
        }
    });

    // ──────────────────────────────────────
    // 3. MOBILE NAVIGATION TOGGLE (Deprecated/Replaced)
    // ──────────────────────────────────────
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
            mobileToggle.classList.toggle('active');
        });

        // Close nav on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                mobileToggle.classList.remove('active');
            });
        });
    }

    // ──────────────────────────────────────
    // 4. SCROLL ANIMATIONS (Intersection Observer)
    // ──────────────────────────────────────
    const animElements = document.querySelectorAll('[data-anim]');

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -60px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger the animation
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    animElements.forEach(el => observer.observe(el));

    // Also observe timeline items
    const timelineItems = document.querySelectorAll('.timeline-item');
    const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                timelineObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });

    timelineItems.forEach(item => timelineObserver.observe(item));

    // ──────────────────────────────────────
    // 5. PCI BOOKLET — FLIPBOOK (Static Images + StPageFlip)
    // ──────────────────────────────────────
    (async function initFlipbook() {
        const flipbookEl = document.getElementById('flipbook');
        const loadingEl = document.getElementById('flipbookLoading');
        const stageEl = document.getElementById('flipbookStage');
        const controlsEl = document.getElementById('flipbookControls');
        const pageInfoEl = document.getElementById('flipPageInfo');
        const prevBtn = document.getElementById('flipPrev');
        const nextBtn = document.getElementById('flipNext');

        if (!flipbookEl || typeof St === 'undefined') return;

        try {
            const pageImageSrcs = [];
            const totalPossible = 40;

            // Generate URLs instantly without waiting for images to download
            for (let i = 1; i <= totalPossible; i++) {
                const num = String(i).padStart(2, '0');
                pageImageSrcs.push(`assets/images/booklet/page-${num}.png`);
            }

            // ── Build flipbook pages ──
            pageImageSrcs.forEach((imgSrc, idx) => {
                const pageDiv = document.createElement('div');
                pageDiv.className = 'flipbook-page';
                // Make the front and back cover behave like a hard book cover
                if (idx === 0 || idx === pageImageSrcs.length - 1) {
                    pageDiv.setAttribute('data-density', 'hard');
                }
                const img = document.createElement('img');
                img.src = imgSrc;
                img.alt = `PCI Booklet — Page ${idx + 1}`;
                img.loading = 'lazy'; // Lazy load images so the UI is blocked
                pageDiv.appendChild(img);
                flipbookEl.appendChild(pageDiv);
            });

            // ── Initialize StPageFlip ──
            const pageFlip = new St.PageFlip(flipbookEl, {
                width: 738,        // Match image actual width
                height: 1024,      // Match image actual height
                size: 'stretch',   // Let it scale down on small screens
                minWidth: 260,     // Reduced for very small mobiles
                minHeight: 360,
                maxWidth: 600,     // Reduced from 800 to prevent cropping on 1080p screens
                maxHeight: 832,    // Maintained 738x1024 aspect ratio
                drawShadow: true,
                maxShadowOpacity: 0.35,
                flippingTime: 800,
                usePortrait: true, // Switch to 1-page mode on small screens
                autoCenter: true,  // <-- This centers the book when only 1 page is visible (cover/back)
                startZIndex: 0,
                autoSize: true,
                showCover: true,
                mobileScrollSupport: true,
                useMouseEvents: true,
                swipeDistance: 30,
                clickEventForward: true,
                startPage: 0,
                showPageCorners: true,
            });

            pageFlip.loadFromHTML(document.querySelectorAll('.flipbook-page'));

            function updatePageInfo() {
                const current = pageFlip.getCurrentPageIndex();
                const total = pageFlip.getPageCount();
                pageInfoEl.textContent = `Page ${current + 1} of ${total}`;
            }

            pageFlip.on('flip', () => updatePageInfo());
            prevBtn.addEventListener('click', () => pageFlip.flipPrev());
            nextBtn.addEventListener('click', () => pageFlip.flipNext());

            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight') pageFlip.flipNext();
                if (e.key === 'ArrowLeft') pageFlip.flipPrev();
            });

            // Show flipbook
            loadingEl.classList.add('hidden');
            stageEl.classList.add('active');
            controlsEl.classList.add('active');
            updatePageInfo();

        } catch (err) {
            console.error('Flipbook init error:', err);
            loadingEl.innerHTML = '<p style="color: #e74c3c;">Could not load booklet: ' + err.message + '</p>';
        }
    })();


    // ──────────────────────────────────────
    // 6. REGISTRATION FORM SUBMISSION
    // ──────────────────────────────────────
    const regForm = document.getElementById('registrationForm');
    const successModal = document.getElementById('successModal');

    regForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Collect form data
        const formData = new FormData(regForm);
        const data = Object.fromEntries(formData.entries());

        // Simple validation
        if (!data.participantName || !data.email || !data.mobile || !data.institute || !data.district || !data.state || !data.pciId || !data.participationType || !data.presentationCategory || !data.presentationTitle || !data.abstract || !data.practicalApplication || !data.patentStatus) {
            alert('Please fill in all required fields.');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            alert('Please enter a valid email address.');
            return;
        }

        // Phone validation (Indian number)
        const phoneRegex = /^[\+]?[0-9\s\-]{10,15}$/;
        if (!phoneRegex.test(data.mobile)) {
            alert('Please enter a valid phone number.');
            return;
        }

        console.log('Registration Data:', data);

        // Show success modal
        successModal.classList.add('active');
        regForm.reset();
    });

    // Close modal on overlay click
    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) {
            successModal.classList.remove('active');
        }
    });

    // ──────────────────────────────────────
    // 7. ACTIVE NAV LINK HIGHLIGHT
    // ──────────────────────────────────────
    const sections = document.querySelectorAll('section[id]');
    const navLinksList = document.querySelectorAll('.gov-dropdown-menu a');

    function highlightNav() {
        const scrollPos = window.scrollY + 150;

        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');

            if (scrollPos >= top && scrollPos < top + height) {
                navLinksList.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', highlightNav);
    highlightNav();

    // ──────────────────────────────────────
    // 8. SMOOTH SCROLL FOR ANCHOR LINKS
    // ──────────────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                const offset = 80; // navbar height
                const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    // ──────────────────────────────────────
    // 9. COUNTER ANIMATION (About Section)
    // ──────────────────────────────────────
    const counters = document.querySelectorAll('.hl-number');
    let counterAnimated = false;

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !counterAnimated) {
                counterAnimated = true;
                counters.forEach(counter => {
                    const text = counter.textContent;
                    const isPlus = text.includes('+');
                    const target = parseInt(text.replace('+', ''));

                    if (isNaN(target)) return;

                    let current = 0;
                    const increment = Math.ceil(target / 60);
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= target) {
                            current = target;
                            clearInterval(timer);
                        }
                        counter.textContent = current + (isPlus ? '+' : '');
                    }, 25);
                });
            }
        });
    }, { threshold: 0.5 });

    if (counters.length > 0) {
        counterObserver.observe(counters[0].closest('.about-highlights'));
    }

    // ──────────────────────────────────────
    // 10. LOGO CAROUSEL — PAUSE ON TAB HIDDEN
    // ──────────────────────────────────────
    const logoCarousel = document.getElementById('logoCarousel');
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            logoCarousel.style.animationPlayState = 'paused';
        } else {
            logoCarousel.style.animationPlayState = 'running';
        }
    });

    // ──────────────────────────────────────
    // 11. GOV TOPBAR 3-DOT MENU
    // ──────────────────────────────────────
    window.toggleGovMenu = function (event) {
        if (event) event.stopPropagation();
        const menu = document.getElementById('govMenu');
        if (menu) menu.classList.toggle('show');
    };

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('govDropdown');
        const menu = document.getElementById('govMenu');
        if (dropdown && !dropdown.contains(e.target) && menu && menu.classList.contains('show')) {
            menu.classList.remove('show');
        }
    });

    // Close menu when clicking a link inside it
    const govLinks = document.querySelectorAll('.gov-dropdown-menu a');
    govLinks.forEach(link => {
        link.addEventListener('click', () => {
            const menu = document.getElementById('govMenu');
            if (menu) menu.classList.remove('show');
        });
    });

});
