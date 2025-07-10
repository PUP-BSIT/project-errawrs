document.addEventListener('DOMContentLoaded', function() {
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
        dotsContainer.innerHTML = '';
        for (let i = 0; i < dotCount; i++) {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToIndex(i));
            dotsContainer.appendChild(dot);
        }
    }
    
    function updateDots() {
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }
    
    function goToIndex(index) {
        const cardWidth = cards[0].offsetWidth;
        const gap = parseInt(getComputedStyle(track).gap) || 24;
        const containerWidth = track.parentElement.offsetWidth;
        const trackWidth = track.scrollWidth;

        // Calculate the maximum offset so the last card is flush with the right edge
        const maxOffset = Math.max(0, trackWidth - containerWidth);

        // Calculate the offset for the current index
        let offset = index * (cardWidth + gap);

        // Clamp offset so you never scroll past the last card
        offset = Math.min(offset, maxOffset);

        // Move the track
        track.style.transform = `translateX(-${offset}px)`;

        // Update currentIndex to match the actual offset (for dots/buttons)
        currentIndex = Math.round(offset / (cardWidth + gap));
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
    nextBtn.addEventListener('click', nextCard);
    prevBtn.addEventListener('click', prevCard);
    
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
    faqQuestions.forEach(btn => {
        btn.addEventListener('click', function() {
            const item = this.closest('.faq-item');
            // Close others
            document.querySelectorAll('.faq-item').forEach(i => {
                if (i !== item) i.classList.remove('open');
            });
            // Toggle this one
            item.classList.toggle('open');
        });
    });
}); 