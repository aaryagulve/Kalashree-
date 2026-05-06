

document.addEventListener('DOMContentLoaded', function () {
  
  var token = localStorage.getItem('token');
  var userName = localStorage.getItem('userName');
  var userRole = localStorage.getItem('userRole');

  var page = window.location.pathname.toLowerCase();
  var isPublicPage = page.indexOf('login') !== -1 || page.indexOf('signup') !== -1 || page.indexOf('landing') !== -1 || page.indexOf('change-password') !== -1;

  if (!token && !isPublicPage) {
    window.location.href = 'login.html';
    return;
  }


  var nameEl = document.querySelector('.profile-name');
  if (nameEl && userName) nameEl.textContent = userName;

  var roleEl = document.querySelector('.profile-role');
  if (roleEl && userRole) roleEl.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);

  var avatarEl = document.querySelector('.profile-avatar');
  if (avatarEl && userName) avatarEl.textContent = userName.charAt(0).toUpperCase();

  var welcomeNameEl = document.getElementById('welcomeName');
  if (welcomeNameEl && userName) welcomeNameEl.textContent = userName;

 
  var dateEls = document.querySelectorAll('.today-date');
  var dayEls = document.querySelectorAll('.today-day');
  if (dateEls.length > 0 || dayEls.length > 0) {
    var today = new Date();
    var dateStr = today.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    var dayStr = today.toLocaleDateString('en-GB', { weekday: 'long' });
    dateEls.forEach(function (el) {
      if (el.tagName !== 'INPUT') el.textContent = dateStr;
    });
    dayEls.forEach(function (el) {
      el.textContent = dayStr;
    });
  }


  var logoutBtns = document.querySelectorAll('.logout-btn');
  logoutBtns.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      window.location.href = 'login.html';
    });
  });


  var sidebar = document.querySelector('.sidebar');
  if (sidebar && !document.querySelector('.hamburger-btn')) {
   
    var hamburger = document.createElement('button');
    hamburger.className = 'hamburger-btn';
    hamburger.setAttribute('aria-label', 'Toggle menu');
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    document.body.appendChild(hamburger);

    
    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    function toggleMenu() {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
      hamburger.classList.toggle('active');
      document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    }

    hamburger.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    
    sidebar.querySelectorAll('.nav-link, .logout-btn').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('open');
          overlay.classList.remove('open');
          hamburger.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  }

 
  var currentPage = window.location.pathname.split('/').pop();
  var navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
  navLinks.forEach(function (link) {
    link.classList.remove('active');
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });
});
