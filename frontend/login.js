function togglePassword() {
  var input = document.getElementById('password');
  var icon  = document.getElementById('eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
  } else {
    input.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
}

function handleLogin() {
  var email    = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value;
  var role     = document.querySelector('input[name="role"]:checked');
  var btn      = document.getElementById('login-btn');
  var btnText  = document.getElementById('btn-text');
  var btnLoader = document.getElementById('btn-loader');

  if (!email || !password) {
    alert('Please enter email and password.');
    return;
  }

  if (!role) {
    alert('Please select your role (Student or Teacher).');
    return;
  }

  
  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoader.style.display = 'flex';

  fetch(API_BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, password: password })
  })
  .then(function(response) { return response.json(); })
  .then(function(data) {
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.name);
      localStorage.setItem('userRole', data.role);
      if (data.userId) localStorage.setItem('userId', data.userId);

      
      if (data.isFirstLogin && data.role === 'student') {
        window.location.href = 'change-password.html';
        return;
      }

      if (data.role === 'student') {
        window.location.href = 'student-dashboard.html';
      } else {
        window.location.href = 'teacher-dashboard.html';
      }
    } else {
      alert(data.message || 'Login failed. Please try again.');
      btn.disabled = false;
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';
    }
  })
  .catch(function(err) {
    alert('Something went wrong. Make sure the server is running.');
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
  });
}
