// landing.js
// Navbar becomes more solid as user scrolls down

window.addEventListener('scroll', function () {
  var navbar = document.getElementById('navbar');
  if (navbar) {
    if (window.scrollY > 60) {
      navbar.style.background = 'rgba(20, 5, 0, 0.92)';
    } else {
      navbar.style.background = 'rgba(20, 5, 0, 0.5)';
    }
  }
});

// Scroll animations
document.addEventListener("DOMContentLoaded", function () {
  const elementsToAnimate = document.querySelectorAll('.section-heading, .course-card, .why-item, .about-text, .about-stats, .hero-text, .hero-visual, .contact-card');
  
  // Add fade-in class to all elements we want to animate
  elementsToAnimate.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

  elementsToAnimate.forEach(el => observer.observe(el));
});