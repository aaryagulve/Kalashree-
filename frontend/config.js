/* ══════════════════════════════════════════
   KALASHREE — API Configuration
   Change API_BASE here for deployment.
   ══════════════════════════════════════════ */

// For local development:
// var API_BASE = 'http://localhost:5000';

// For production (replace with your actual deployed backend URL):
var API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://your-backend-url.onrender.com'; // ← replace this when you deploy
