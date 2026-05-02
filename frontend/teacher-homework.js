// teacher-homework.js

let allHomework = [];

document.addEventListener('DOMContentLoaded', async function () {
  const teacherId = localStorage.getItem('userId');
  if (!teacherId || localStorage.getItem('userRole') !== 'teacher') {
    window.location.href = 'login.html';
    return;
  }

  // Set today's date in header
  const today = new Date();
  document.getElementById('headerDate').textContent = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('headerDay').textContent = today.toLocaleDateString('en-GB', { weekday: 'long' });

  // Filter Buttons Setup
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      fetchAllHomework(e.target.dataset.filter);
    });
  });

  await fetchAllHomework('pending');
});

async function fetchAllHomework(filter = 'pending') {
  const grid = document.getElementById('hwGrid');
  grid.innerHTML = '<p class="loading-text">Loading student submissions...</p>';
  try {
    const res = await fetch(`${API_BASE}/api/homework?filter=${filter}`);
    if (res.ok) {
      allHomework = await res.json();
      renderHomework(filter);
    } else {
      grid.innerHTML = '<p class="loading-text">Failed to load data.</p>';
    }
  } catch (err) {
    grid.innerHTML = '<p class="loading-text">Server error. Try again.</p>';
  }
}

function renderHomework(filterStr) {
  const grid = document.getElementById('hwGrid');
  grid.innerHTML = '';

  // Data already filtered by API — just render all
  const filtered = allHomework;

  if (filtered.length === 0) {
    const labels = { pending: 'pending review', reviewed: 'reviewed', all: '' };
    grid.innerHTML = `<p class="loading-text">No ${labels[filterStr] || ''} submissions found.</p>`;
    return;
  }
  
  filtered.forEach(hw => {
    const studentName = hw.studentId ? hw.studentId.name : 'Unknown Student';
    const dateStr = new Date(hw.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const isReviewed = hw.status === 'Reviewed';

    // Build the media section — inline audio player for uploads, link for external
    let mediaSection = '';
    if (hw.submissionType === 'upload' && hw.audioFilePath) {
      const audioUrl = hw.audioFilePath.startsWith('http') 
        ? hw.audioFilePath 
        : `${API_BASE}/uploads/audio/${hw.audioFilePath}`;
      mediaSection = `
        <div class="hw-actions">
          <p style="font-size:12px;color:#8C6A52;margin-bottom:6px;">🎵 ${hw.audioFilePath.split('/').pop()}</p>
          <audio controls style="width:100%;border-radius:8px;">
            <source src="${audioUrl}">
            Your browser does not support the audio element.
          </audio>
        </div>`;
    } else if (hw.fileUrl) {
      mediaSection = `
        <div class="hw-actions">
          <a href="${hw.fileUrl}" target="_blank" class="hw-link-btn">▶ Listen to Audio / View Link</a>
        </div>`;
    } else {
      mediaSection = `<div class="hw-actions"><p style="font-size:12px;color:#B0907A;">No media attached.</p></div>`;
    }
    
    let bottomSection = '';
    if (isReviewed) {
      bottomSection = `
        <div class="saved-feedback">
          <strong>Your Feedback:</strong><br>
          ${hw.teacherFeedback}
        </div>
      `;
    } else {
      bottomSection = `
        <form class="feedback-form" data-hwid="${hw._id}">
          <textarea placeholder="Write feedback for the student..." required></textarea>
          <button type="submit">Submit Review</button>
        </form>
      `;
    }
    
    const html = `
      <div class="hw-card ${isReviewed ? 'reviewed' : ''}">
        <div class="hw-card-top">
          <div>
            <div class="hw-student-name">${studentName}</div>
            <div class="hw-title">${hw.title}</div>
          </div>
          <div class="hw-date">${dateStr}</div>
        </div>
        <div class="hw-status">${hw.status}</div>
        ${mediaSection}
        ${bottomSection}
      </div>
    `;
    
    grid.insertAdjacentHTML('beforeend', html);
  });
  
  // Attach form listeners
  document.querySelectorAll('.feedback-form').forEach(form => {
    form.addEventListener('submit', handleFeedbackSubmit);
  });
}

async function handleFeedbackSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const hwId = form.dataset.hwid;
  const textarea = form.querySelector('textarea');
  const btn = form.querySelector('button');
  const feedback = textarea.value;
  
  try {
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    const res = await fetch(`${API_BASE}/api/homework/${hwId}/feedback`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback })
    });
    
    if (res.ok) {
      const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
      await fetchAllHomework(activeFilter);
    } else {
      alert('Failed to save feedback');
      btn.disabled = false;
      btn.textContent = 'Submit Review';
    }
  } catch (err) {
    console.error('Error saving feedback:', err);
    alert('Server error.');
    btn.disabled = false;
    btn.textContent = 'Submit Review';
  }
}
