
document.addEventListener('DOMContentLoaded', function () {
  loadEvents();
  document.getElementById('eventForm').addEventListener('submit', createEvent);
});

function previewPoster(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    const preview = document.getElementById('posterPreview');
    const placeholder = document.getElementById('posterPlaceholder');
    preview.src = ev.target.result;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function createEvent(e) {
  e.preventDefault();
  const btn    = document.getElementById('submitBtn');
  const text   = document.getElementById('submitText');
  const loader = document.getElementById('submitLoader');
  const msg    = document.getElementById('formMsg');

  btn.disabled = true;
  text.style.display  = 'none';
  loader.style.display = 'inline';
  msg.textContent = '';

  const formData = new FormData();
  formData.append('title',          document.getElementById('evTitle').value.trim());
  formData.append('date',           document.getElementById('evDate').value);
  formData.append('type',           document.getElementById('evType').value);
  formData.append('feeAmount',      document.getElementById('evFee').value || 0);
  formData.append('locationOrLink', document.getElementById('evLocation').value.trim());
  formData.append('description',    document.getElementById('evDesc').value.trim());
  formData.append('isMandatory',    document.getElementById('evMandatory').checked);

  const posterFile = document.getElementById('posterInput').files[0];
  if (posterFile) formData.append('poster', posterFile);

  try {
    const res = await fetch(`${API_BASE}/api/events`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData   // NO Content-Type header — browser sets it with boundary
    });
    const data = await res.json();
    if (res.ok) {
      msg.style.color = '#2E7D32';
      msg.textContent = '✓ Event created with poster!';
      document.getElementById('eventForm').reset();
      document.getElementById('posterPreview').style.display = 'none';
      document.getElementById('posterPlaceholder').style.display = 'flex';
      loadEvents();
    } else {
      msg.style.color = '#D32F2F';
      msg.textContent = data.message || 'Failed to create event.';
    }
  } catch (err) {
    msg.style.color = '#D32F2F';
    msg.textContent = 'Server error. Make sure backend is running.';
  } finally {
    btn.disabled = false;
    text.style.display  = 'inline';
    loader.style.display = 'none';
  }
}

async function loadEvents() {
  const container = document.getElementById('eventsList');
  try {
    const res = await fetch(`${API_BASE}/api/events`);
    const events = await res.json();
    if (events.length === 0) {
      container.innerHTML = '<p style="color:#B0907A;font-size:13px;">No events yet. Create one above.</p>';
      return;
    }
    container.innerHTML = events.map(ev => renderEventCard(ev, true)).join('');
  } catch (err) {
    container.innerHTML = '<p style="color:#D32F2F;font-size:13px;">Failed to load events.</p>';
  }
}

function renderEventCard(ev, isTeacher) {
  const dateStr = new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const posterHtml = ev.poster
    ? `<img src="${API_BASE}/uploads/${ev.poster}" alt="Event Poster" class="event-poster-img" onclick="event.stopPropagation(); openPosterLightbox('${API_BASE}/uploads/${ev.poster}')" />`
    : `<div class="event-poster-placeholder">🎵</div>`;
  const mandatoryTag = ev.isMandatory ? '<span class="mandatory-tag">Mandatory</span>' : '';
  const feeText = ev.feeAmount > 0 ? `₹ ${ev.feeAmount}` : 'Free';
  const deleteBtn = isTeacher
    ? `<button class="delete-btn" onclick="event.stopPropagation(); deleteEvent('${ev._id}')">Delete</button>`
    : '';

  // Encode event data for click handler
  const evData = encodeURIComponent(JSON.stringify(ev));

  return `
    <div class="event-card" onclick="openEvModal(decodeURIComponent('${evData}'), ${isTeacher})">
      ${posterHtml}
      <div class="event-body">
        <span class="event-type-badge">${ev.type}</span>
        ${mandatoryTag}
        <p class="event-title">${ev.title}</p>
        <p class="event-meta">📅 ${dateStr}</p>
        ${ev.locationOrLink ? `<p class="event-meta">📍 ${ev.locationOrLink}</p>` : ''}
        ${ev.description ? `<p class="event-desc">${ev.description}</p>` : ''}
        <div class="event-footer">
          <span class="event-fee">${feeText}</span>
          ${deleteBtn}
        </div>
      </div>
    </div>`;
}

function openEvModal(evJson, isTeacher) {
  const ev = typeof evJson === 'string' ? JSON.parse(evJson) : evJson;
  const dateStr = new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Poster
  const posterEl = document.getElementById('evModalPoster');
  posterEl.innerHTML = ev.poster
    ? `<img src="${API_BASE}/uploads/${ev.poster}" alt="Poster" class="ev-modal-poster" onclick="openPosterLightbox('${API_BASE}/uploads/${ev.poster}')" />`
    : `<div class="ev-modal-poster-placeholder">🎵</div>`;

  document.getElementById('evModalType').textContent  = ev.type;
  document.getElementById('evModalTitle').textContent = ev.title;
  document.getElementById('evModalDate').textContent  = dateStr;

  const locRow = document.getElementById('evModalLocRow');
  if (ev.locationOrLink) {
    document.getElementById('evModalLoc').textContent = ev.locationOrLink;
    locRow.style.display = 'flex';
  } else {
    locRow.style.display = 'none';
  }

  document.getElementById('evModalFee').textContent = ev.feeAmount > 0 ? `₹ ${ev.feeAmount}` : 'Free entry';

  const mandRow = document.getElementById('evModalMandRow');
  mandRow.style.display = ev.isMandatory ? 'flex' : 'none';

  const descEl = document.getElementById('evModalDesc');
  if (ev.description) {
    descEl.textContent = ev.description;
    descEl.style.display = 'block';
  } else {
    descEl.style.display = 'none';
  }

  // Action buttons
  const actions = document.getElementById('evModalActions');
  if (isTeacher) {
    actions.innerHTML = `
      <button class="ev-modal-btn ev-modal-btn-secondary" onclick="closeEvModal()">Close</button>
      <button class="ev-modal-btn ev-modal-btn-primary" onclick="closeEvModal(); deleteEvent('${ev._id}')">🗑 Delete Event</button>`;
  } else {
    actions.innerHTML = `
      <button class="ev-modal-btn ev-modal-btn-secondary" onclick="closeEvModal()">Close</button>
      <button class="ev-modal-btn ev-modal-btn-primary" onclick="markAttendance('${ev._id}')">✅ I Will Attend</button>`;
  }

  document.getElementById('evModalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeEvModal(e) {
  if (e && e.target !== document.getElementById('evModalBackdrop')) return;
  document.getElementById('evModalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

function markAttendance(eventId) {
  // Placeholder — can wire to a real RSVP endpoint later
  alert('Your attendance has been noted! See you at the event 🎵');
  closeEvModal();
}

async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/events/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) loadEvents();
    else alert('Failed to delete event.');
  } catch (err) {
    alert('Server error.');
  }
}

/* ── POSTER LIGHTBOX ── */
function openPosterLightbox(src) {
  const lb  = document.getElementById('posterLightbox');
  const img = document.getElementById('posterLightboxImg');
  if (!lb || !img) return;
  img.src = src;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePosterLightbox() {
  const lb = document.getElementById('posterLightbox');
  if (lb) lb.classList.remove('open');
  document.body.style.overflow = '';
}

// Close with Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closePosterLightbox();
    closeEvModal();
  }
});
