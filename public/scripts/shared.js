// Shared bubble interaction functionality

document.addEventListener('DOMContentLoaded', function() {
  const bubbles = document.querySelectorAll('.bubble');
  
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