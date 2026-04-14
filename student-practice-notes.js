var API_BASE = 'http://localhost:5000';
var allNotes = [];

document.addEventListener('DOMContentLoaded', function () {
  var studentId = localStorage.getItem('userId');
  if (!studentId) return;
  loadSubmissions(studentId);
  loadNotes(studentId);
});

/* ── SUBMISSIONS ── */

async function loadSubmissions(studentId) {
  const hwList = document.getElementById('hwList');
  try {
    const res = await fetch(`${API_BASE}/api/homework/student/${studentId}`);
    if (!res.ok) { hwList.innerHTML = '<p style="color:#B0907A;font-size:13px;">Failed to load.</p>'; return; }

    const submissions = await res.json();
    if (submissions.length === 0) {
      hwList.innerHTML = '<p style="color:#B0907A;font-size:13px;">No submissions yet. Submit your first practice above!</p>';
      return;
    }

    hwList.innerHTML = submissions.map(hw => {
      const dateStr = new Date(hw.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const isReviewed = hw.status === 'Reviewed';
      const feedbackHtml = hw.teacherFeedback
        ? `<p style="font-size:12.5px;color:#5A3018;margin-top:6px;padding:8px 10px;background:#FDF6EE;border-radius:6px;"><strong>Guru ji:</strong> ${hw.teacherFeedback}</p>`
        : '';

      // Build the media link — uploaded file or external link
      let mediaHtml = '';
      if (hw.submissionType === 'upload' && hw.audioFilePath) {
        mediaHtml = `
          <audio controls style="width:100%;margin-top:6px;border-radius:6px;">
            <source src="${API_BASE}/uploads/audio/${hw.audioFilePath}">
          </audio>
          <p style="font-size:11px;color:#B0907A;margin-top:2px;">📁 ${hw.audioFilePath}</p>`;
      } else if (hw.fileUrl) {
        mediaHtml = `<a href="${hw.fileUrl}" target="_blank" style="font-size:12px;color:#B5572A;font-weight:600;text-decoration:none;">🔗 View Recording</a>`;
      }

      return `
        <div class="hw-item" style="flex-direction:column;align-items:flex-start;gap:4px;">
          <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
            <div>
              <p class="hw-raga">${hw.title}</p>
              <p class="hw-date">Submitted ${dateStr}</p>
            </div>
            <span class="badge ${isReviewed ? 'badge-reviewed' : 'badge-pending'}">${hw.status}</span>
          </div>
          ${mediaHtml}
          ${feedbackHtml}
        </div>
      `;
    }).join('');
  } catch (err) {
    hwList.innerHTML = '<p style="color:#B0907A;font-size:13px;">Error loading submissions.</p>';
  }
}

function toggleSubmitType(type) {
  document.getElementById('linkSection').style.display   = type === 'link'   ? 'block' : 'none';
  document.getElementById('uploadSection').style.display = type === 'upload' ? 'block' : 'none';
}

function previewAudioFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('audioPlaceholder').style.display = 'none';
  const nameEl = document.getElementById('audioFileName');
  nameEl.textContent = '🎵 ' + file.name + ' (' + (file.size / (1024*1024)).toFixed(1) + ' MB)';
  nameEl.style.display = 'block';
}

async function submitPractice() {
  var studentId = localStorage.getItem('userId');
  var title     = document.getElementById('hwTitle').value.trim();
  var btn       = document.getElementById('submitBtn');
  var msg       = document.getElementById('submitMsg');
  var typeEl    = document.querySelector('input[name="submitType"]:checked');
  var type      = typeEl ? typeEl.value : 'link';

  if (!title) {
    msg.style.color = '#D32F2F';
    msg.textContent = 'Please enter a practice title.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Submitting...';
  msg.textContent = '';

  try {
    let res;

    if (type === 'upload') {
      const audioFile = document.getElementById('audioFileInput').files[0];
      if (!audioFile) {
        msg.style.color = '#D32F2F';
        msg.textContent = 'Please select an audio file to upload.';
        btn.disabled = false; btn.textContent = 'Submit to Guru';
        return;
      }
      const formData = new FormData();
      formData.append('studentId',      studentId);
      formData.append('title',          title);
      formData.append('submissionType', 'upload');
      formData.append('audioFile',      audioFile);

      res = await fetch(`${API_BASE}/api/homework/submit`, { method: 'POST', body: formData });
    } else {
      const fileUrl = document.getElementById('hwLink').value.trim();
      if (!fileUrl) {
        msg.style.color = '#D32F2F';
        msg.textContent = 'Please paste an audio/video link.';
        btn.disabled = false; btn.textContent = 'Submit to Guru';
        return;
      }
      res = await fetch(`${API_BASE}/api/homework/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, title, fileUrl, submissionType: 'link' })
      });
    }

    const data = await res.json();
    if (res.ok) {
      msg.style.color = '#2E7D32';
      msg.textContent = '✓ Submitted successfully!';
      document.getElementById('hwTitle').value = '';
      if (document.getElementById('hwLink')) document.getElementById('hwLink').value = '';
      if (document.getElementById('hwNotes')) document.getElementById('hwNotes').value = '';
      // Reset file input
      document.getElementById('audioFileInput').value = '';
      document.getElementById('audioPlaceholder').style.display = 'block';
      document.getElementById('audioFileName').style.display = 'none';
      loadSubmissions(studentId);
    } else {
      msg.style.color = '#D32F2F';
      msg.textContent = data.message || 'Submission failed.';
    }
  } catch (err) {
    msg.style.color = '#D32F2F';
    msg.textContent = 'Server error. Make sure backend is running.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit to Guru';
    setTimeout(() => msg.textContent = '', 5000);
  }
}

/* ── GURU NOTES ── */

async function loadNotes(studentId) {
  const container = document.getElementById('notesContainer');
  try {
    const res = await fetch(`${API_BASE}/api/feedback/student/${studentId}`);
    if (!res.ok) { container.innerHTML = '<p style="color:#B0907A;font-size:13px;">Failed to load notes.</p>'; return; }

    allNotes = await res.json();
    renderNotes(allNotes);
  } catch (err) {
    container.innerHTML = '<p style="color:#B0907A;font-size:13px;">Error loading notes.</p>';
  }
}

function filterNotes(range, btn) {
  // Update active button
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const now = new Date();
  let filtered = allNotes;

  if (range === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    filtered = allNotes.filter(n => new Date(n.date) >= weekAgo);
  } else if (range === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    filtered = allNotes.filter(n => new Date(n.date) >= monthAgo);
  }

  renderNotes(filtered);
}

function renderNotes(notes) {
  const container = document.getElementById('notesContainer');

  if (notes.length === 0) {
    container.innerHTML = '<p style="color:#B0907A;font-size:13px;font-style:italic;">No notes found for this period.</p>';
    return;
  }

  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(now.getDate() - 3);

  container.innerHTML = notes.map((note, i) => {
    const noteDate = new Date(note.date);
    const dateStr = noteDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const isNew = noteDate >= threeDaysAgo;
    const isGlobal = note.isGlobal;

    const newBadge = isNew && i === 0 ? '<span class="badge-new">NEW</span>' : '';
    const globalBadge = isGlobal
      ? '<span style="display:inline-block;background:#FFE0B2;color:#E65100;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;margin-bottom:6px;">Class Note</span><br>'
      : '';
    const borderColor = isGlobal ? '#FFB74D' : '#B5572A';

    return `
      <div class="guru-note-card premium-glass" style="border-left-color:${borderColor}; animation-delay:${i * 0.05}s;">
        <div class="note-top">
          <span class="note-date">${globalBadge}${dateStr}</span>
          ${newBadge}
        </div>
        <p class="note-text">${note.noteText}</p>
      </div>
    `;
  }).join('');
}
