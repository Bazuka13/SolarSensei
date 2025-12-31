/* ==========================================================================
   GLOBAL UI INTERACTIONS
   Handles shared interface logic like sidebar navigation highlighting
   and interactive button effects across the platform.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // --------------------------------------------------------------------------
    // 1. Sidebar Navigation: Active State Handling
    // --------------------------------------------------------------------------
    // Automatically highlights the correct sidebar icon based on the current URL
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-item');

    navLinks.forEach(link => {
        // Check if the link's href matches the current page path
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('nav-active');
        } else {
            link.classList.remove('nav-active');
        }
    });

    // --------------------------------------------------------------------------
    // 2. Interactive Buttons: "Magnetic" Glow Effect
    // --------------------------------------------------------------------------
    // Tracks mouse position within buttons to create a dynamic lighting effect.
    // CSS uses var(--mouse-x) and var(--mouse-y) for the radial gradient.
    const glowButtons = document.querySelectorAll('.btn-glow');

    glowButtons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            
            // Calculate mouse position relative to the button's top-left corner
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Pass coordinates to CSS for the spotlight effect
            btn.style.setProperty('--mouse-x', `${x}px`);
            btn.style.setProperty('--mouse-y', `${y}px`);
        });
    });

});