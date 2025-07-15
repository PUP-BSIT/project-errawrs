document.addEventListener('DOMContentLoaded', function () {
    const track = document.querySelector('.testimonials-track');
    const cards = document.querySelectorAll('.testimonial-card');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const dotsContainer = document.querySelector('.carousel-dots');

    let currentIndex = 0;
    let cardsPerPage = getCardsPerPage();
    let maxIndex = Math.max(0, cards.length - 1);
    let dotCount = Math.max(1, cards.length - cardsPerPage + 1);

    function getCardsPerPage() {
        if (window.innerWidth <= 700) return 1;
        if (window.innerWidth <= 900) return 2;
        if (window.innerWidth <= 1100) return 3;
        return 4;
    }

    function updateVars() {
        cardsPerPage = getCardsPerPage();
        maxIndex = Math.max(0, cards.length - 1);
        dotCount = Math.max(1, cards.length - cardsPerPage + 1);
    }

    function createDots() {
        const dotsContainer = document.getElementById('dots-container');
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            for (let i = 0; i < dotCount; i++) {
                const dot = document.createElement('div');
                dot.classList.add('dot');
                if (i === 0) dot.classList.add('active');
                dot.addEventListener('click', () => goToIndex(i));
                dotsContainer.appendChild(dot);
            }
        }
    }

    function updateDots() {
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    function goToIndex(index) {
        const slide = cards[index];
        if (!slide) return; // Prevents error if slide is undefined
        const width = slide.offsetWidth;
        let gap;
        if (window.innerWidth <= 700) {
            gap = 0;
        } else {
            gap = parseInt(getComputedStyle(track).gap) || 32;
        }
        currentIndex = Math.max(0, Math.min(index, cards.length - 1));
        let offset = currentIndex * (width + gap);

        const maxOffset = Math.max(
            0,
            track.scrollWidth - track.parentElement.offsetWidth
        );
        if (offset > maxOffset) offset = maxOffset;

        // Move the track
        track.style.transform = `translateX(-${offset}px)`;

        // Update currentIndex to match the actual offset (for dots/buttons)
        currentIndex = Math.round(offset / (width + gap));
        updateDots();
    }

    function nextCard() {
        if (currentIndex < cards.length - 1) {
            goToIndex(currentIndex + 1);
        }
    }

    function prevCard() {
        if (currentIndex > 0) {
            goToIndex(currentIndex - 1);
        }
    }

    // Event listeners
    if (nextBtn) nextBtn.addEventListener('click', nextCard);
    if (prevBtn) prevBtn.addEventListener('click', prevCard);

    // Responsive
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateVars();
            createDots();
            goToIndex(0);
        }, 250);
    });

    // Init
    updateVars();
    createDots();
    goToIndex(0);

    // FAQ Accordion
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach((btn) => {
        btn.addEventListener('click', function () {
            const item = this.closest('.faq-item');
            // Close others
            document.querySelectorAll('.faq-item').forEach((i) => {
                if (i !== item) i.classList.remove('open');
            });
            // Toggle this one
            item.classList.toggle('open');
        });
    });
});

// Hamburger menu functionality
(function () {
    const hamburger = document.querySelector('.hamburger');
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
    const closeMenu = document.querySelector('.close-menu');

    function toggleIcons(isMenuOpen) {
        if (hamburger) hamburger.style.display = isMenuOpen ? 'none' : 'block';
        if (closeMenu) closeMenu.style.display = isMenuOpen ? 'block' : 'none';
    }

    if (hamburger && mobileMenuOverlay && closeMenu) {
        // Initial state
        toggleIcons(false);
        hamburger.addEventListener('click', function () {
            mobileMenuOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            toggleIcons(true);
        });
        closeMenu.addEventListener('click', function () {
            mobileMenuOverlay.classList.remove('active');
            document.body.style.overflow = '';
            toggleIcons(false);
        });
        // Optional: close menu when clicking outside the menu
        mobileMenuOverlay.addEventListener('click', function (e) {
            if (e.target === mobileMenuOverlay) {
                mobileMenuOverlay.classList.remove('active');
                document.body.style.overflow = '';
                toggleIcons(false);
            }
        });
    }
})();

// Set up login link
document.addEventListener('DOMContentLoaded', function() {
    var loginLink = document.getElementById('login-link');
    if (loginLink) loginLink.href = ROUTES.LOGIN;
});