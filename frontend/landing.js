// landing.js - Premium Experience Engine

document.addEventListener("DOMContentLoaded", function () {
  
  // 1. Navbar Solidify on Scroll
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    // Update Scroll Progress bar if it exists
    updateScrollProgress();
  });

  // 2. Premium Reveal Observer
  // Target almost everything meaningful for reveal
  const revealTargets = document.querySelectorAll(
    '.course-card, .why-item, .stat-box, .section-heading, .about-text, .section-line, .hero-text, .hero-visual, .contact-card, .section-tag'
  );
  
  revealTargets.forEach(el => el.classList.add('reveal'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Once animated, we can stop observing
        revealObserver.unobserve(entry.target);
      }
    });
  }, { 
    threshold: 0.12,
    rootMargin: '0px 0px -60px 0px' 
  });

  revealTargets.forEach(target => revealObserver.observe(target));

  // 3. Generate Floating Swara Notations
  function createFloatingElements() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    
    const swaras = ['सा', 'रे', 'ग', 'म', 'प', 'ध', 'नी', '𝄞', '𝄢'];
    const count = 15;

    for (let i = 0; i < count; i++) {
      const span = document.createElement('span');
      span.className = 'floating-swara';
      span.innerText = swaras[Math.floor(Math.random() * swaras.length)];
      
      // Random positioning
      span.style.left = Math.random() * 100 + '%';
      span.style.top = Math.random() * 100 + '%';
      
      // Random animation delay & duration
      span.style.animationDelay = Math.random() * 5 + 's';
      span.style.animationDuration = (8 + Math.random() * 10) + 's';
      
      hero.appendChild(span);
    }
  }
  createFloatingElements();

  // 4. Parallax Effect for Hero
  window.addEventListener('mousemove', (e) => {
    const visual = document.querySelector('.hero-visual');
    const text = document.querySelector('.hero-text');
    if (!visual || !text) return;

    const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
    const moveY = (e.clientY - window.innerHeight / 2) * 0.01;

    visual.style.transform = `translate(${moveX * 1.5}px, ${moveY * 1.5}px)`;
    text.style.transform = `translate(${moveX * -0.5}px, ${moveY * -0.5}px)`;
  });

  // 5. Scroll Progress Bar
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.appendChild(progressBar);

  function updateScrollProgress() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    progressBar.style.width = scrolled + "%";
  }

});