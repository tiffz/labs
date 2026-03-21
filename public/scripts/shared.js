// Shared bubble interaction functionality

// Material Icons font loading detection
document.fonts.ready.then(function() {
  document.documentElement.classList.add('fonts-loaded');
});

// Fallback for older browsers
setTimeout(function() {
  document.documentElement.classList.add('fonts-loaded');
}, 1000);

document.addEventListener('DOMContentLoaded', function() {
  const bubbles = document.querySelectorAll('.bubble');

  // Catalog filtering (used on homepage).
  const filterChips = document.querySelectorAll('[data-filter-stage]');
  const appCards = document.querySelectorAll('.app-card[data-stage]');
  const sections = document.querySelectorAll('.catalog-section[data-category-section]');
  let activeStage = 'all';
  const activeAnimations = new WeakMap();

  function cancelAnimation(element) {
    const currentAnimation = activeAnimations.get(element);
    if (currentAnimation) {
      currentAnimation.cancel();
      activeAnimations.delete(element);
    }
  }

  function animateShow(element) {
    cancelAnimation(element);
    element.classList.remove('is-hidden');
    element.style.willChange = 'opacity, transform';
    if (!element.animate) {
      element.style.removeProperty('will-change');
      return;
    }
    const animation = element.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 160, easing: 'ease-out' }
    );
    activeAnimations.set(element, animation);
    animation.onfinish = () => {
      element.style.removeProperty('will-change');
      activeAnimations.delete(element);
    };
    animation.oncancel = () => {
      element.style.removeProperty('will-change');
    };
  }

  function animateHide(element) {
    cancelAnimation(element);
    if (element.classList.contains('is-hidden')) return;
    element.style.willChange = 'opacity, transform';
    if (!element.animate) {
      element.classList.add('is-hidden');
      element.style.removeProperty('will-change');
      return;
    }
    const animation = element.animate(
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-4px)' },
      ],
      { duration: 140, easing: 'ease-in' }
    );
    activeAnimations.set(element, animation);
    animation.onfinish = () => {
      element.classList.add('is-hidden');
      element.style.removeProperty('will-change');
      activeAnimations.delete(element);
    };
    animation.oncancel = () => {
      element.style.removeProperty('will-change');
    };
  }

  function updateCatalogVisibility() {
    appCards.forEach((card) => {
      const stage = card.dataset.stage || '';
      const matchesStage = activeStage === 'all' || stage === activeStage;
      if (matchesStage) {
        animateShow(card);
      } else {
        animateHide(card);
      }
    });

    sections.forEach((section) => {
      const cardsInSection = section.querySelectorAll('.app-card[data-stage]');
      let hasVisibleCards = false;
      cardsInSection.forEach((card) => {
        const stage = card.dataset.stage || '';
        if (activeStage === 'all' || stage === activeStage) {
          hasVisibleCards = true;
        }
      });

      if (hasVisibleCards) {
        animateShow(section);
      } else {
        animateHide(section);
      }
    });
  }

  if (filterChips.length > 0) {
    filterChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        activeStage = chip.dataset.filterStage || 'all';
        filterChips.forEach((otherChip) => {
          otherChip.classList.toggle('is-active', otherChip === chip);
        });
        updateCatalogVisibility();
      });
    });
  }

  if (appCards.length > 0) {
    updateCatalogVisibility();
  }
  
  // Simple hover glow effect
  bubbles.forEach(bubble => {
    bubble.addEventListener('mouseenter', function() {
      this.classList.add('glowing');
    });
    
    bubble.addEventListener('mouseleave', function() {
      this.classList.remove('glowing');
    });
  });
  
  // Add bouncy click effect
  bubbles.forEach(bubble => {
    bubble.addEventListener('click', function(e) {
      // Super bouncy burst effect
      this.style.transform = 'scale(1.8)';
      this.style.filter = 'brightness(3) drop-shadow(0 0 20px rgba(255,255,255,0.8))';
      this.style.transition = 'transform 0.1s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
      
      setTimeout(() => {
        this.style.transform = 'scale(0.8)';
        setTimeout(() => {
          this.style.transform = '';
          this.style.filter = '';
          this.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        }, 100);
      }, 100);
      
      // Multiple bouncy ripples at click position
      const clickX = e.clientX;
      const clickY = e.clientY;
      
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const ripple = document.createElement('div');
          ripple.style.cssText = `
            position: fixed;
            left: ${clickX - 30}px;
            top: ${clickY - 30}px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255,255,255,${0.4 - i * 0.1}) 0%, transparent 70%);
            pointer-events: none;
            z-index: 1000;
            animation: rippleExpand ${0.8 + i * 0.2}s ease-out forwards;
          `;
          
          document.body.appendChild(ripple);
          setTimeout(() => ripple.remove(), 1000);
        }, i * 100);
      }
    });
  });
}); 