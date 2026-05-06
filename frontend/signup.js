async function handleSignup() {
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const btn = document.getElementById('signup-btn');

  if (!name || !email || !password) {
    alert('Please fill all fields');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Processing...';

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (res.ok) {
      alert('Registration successful! Please login.');
      window.location.href = 'login.html';
    } else {
      alert(data.message || 'Registration failed');
    }
  } catch (err) {
    alert('Network error. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Register Now';
  }
}
