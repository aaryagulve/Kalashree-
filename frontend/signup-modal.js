/* ══════════════════════════════════════════
   signup-modal.js
   Intercepts all Sign Up clicks and shows
   a glassmorphism "registration closed" modal.
   Include on any page that has a Sign Up link.
   ══════════════════════════════════════════ */

(function () {

  // Inject modal HTML + CSS once
  function injectModal() {
    if (document.getElementById('signupModal')) return;

    // CSS
    const style = document.createElement('style');
    style.textContent = `
      #signupModalBackdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(26,13,5,0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 99999;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: smFadeIn 0.25s ease;
      }
      #signupModalBackdrop.open { display: flex; }
      @keyframes smFadeIn { from { opacity:0; } to { opacity:1; } }

      #signupModal {
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255,255,255,0.75);
        border-radius: 22px;
        padding: 44px 40px;
        max-width: 460px;
        width: 100%;
        text-align: center;
        box-shadow: 0 24px 64px rgba(26,13,5,0.22);
        animation: smZoomIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
        position: relative;
      }
      @keyframes smZoomIn {
        from { opacity:0; transform:scale(0.88) translateY(16px); }
        to   { opacity:1; transform:scale(1)    translateY(0); }
      }

      #signupModal .sm-icon { font-size: 48px; margin-bottom: 16px; }

      #signupModal .sm-title {
        font-family: 'Cormorant Garamond', serif;
        font-size: 28px;
        font-weight: 700;
        color: #1A0D05;
        margin-bottom: 14px;
        line-height: 1.2;
      }

      #signupModal .sm-body {
        font-size: 14.5px;
        color: #5A3018;
        line-height: 1.75;
        margin-bottom: 28px;
      }

      #signupModal .sm-body strong { color: #D4A017; }

      #signupModal .sm-divider {
        width: 48px;
        height: 2px;
        background: linear-gradient(90deg, #D4A017, #B5572A);
        border-radius: 2px;
        margin: 0 auto 20px;
      }

      #signupModal .sm-btn-login {
        display: inline-block;
        padding: 13px 32px;
        background: linear-gradient(135deg, #C4622E, #9A3E18);
        color: #fff;
        border: none;
        border-radius: 10px;
        font-family: 'Source Sans 3', sans-serif;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.25s ease;
        box-shadow: 0 6px 20px rgba(181,87,42,0.3);
        letter-spacing: 0.3px;
      }
      #signupModal .sm-btn-login:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 28px rgba(181,87,42,0.4);
      }

      #signupModal .sm-close {
        position: absolute;
        top: 16px; right: 18px;
        background: none;
        border: none;
        font-size: 22px;
        cursor: pointer;
        color: #9C7A62;
        line-height: 1;
        transition: color 0.2s;
      }
      #signupModal .sm-close:hover { color: #B5572A; }
    `;
    document.head.appendChild(style);

    // HTML
    const backdrop = document.createElement('div');
    backdrop.id = 'signupModalBackdrop';
    backdrop.innerHTML = `
      <div id="signupModal" role="dialog" aria-modal="true" aria-labelledby="smTitle">
        <button class="sm-close" onclick="closeSignupModal()" aria-label="Close">&#10005;</button>
        <div class="sm-icon">🎵</div>
        <h2 class="sm-title" id="smTitle">Registration is Closed</h2>
        <div class="sm-divider"></div>
        <p class="sm-body">
          Student registration is not open to the public.<br><br>
          Your <strong>Guru</strong> will personally create your account and provide your login credentials.<br><br>
          Please contact your teacher to get access to the portal.
        </p>
        <a href="login.html" class="sm-btn-login">← Back to Login</a>
      </div>
    `;
    // Close on backdrop click
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeSignupModal();
    });
    document.body.appendChild(backdrop);
  }

  // Show modal
  window.openSignupModal = function (e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    injectModal();
    document.getElementById('signupModalBackdrop').classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  // Hide modal
  window.closeSignupModal = function () {
    const el = document.getElementById('signupModalBackdrop');
    if (el) el.classList.remove('open');
    document.body.style.overflow = '';
  };

  // Close with Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSignupModal();
  });

  // Auto-intercept all links pointing to signup.html
  document.addEventListener('DOMContentLoaded', function () {
    injectModal();
    document.querySelectorAll('a[href="signup.html"], a[href*="signup"]').forEach(function (link) {
      link.addEventListener('click', openSignupModal);
    });
  });

})();
