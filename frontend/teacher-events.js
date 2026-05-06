
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

let _editingEventId = null;

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
    const url = _editingEventId ? `${API_BASE}/api/events/${_editingEventId}` : `${API_BASE}/api/events`;
    const method = _editingEventId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      msg.style.color = '#2E7D32';
      msg.textContent = _editingEventId ? '✓ Event updated successfully!' : '✓ Event created successfuly!';
      if (!_editingEventId) {
        document.getElementById('eventForm').reset();
        document.getElementById('posterPreview').style.display = 'none';
        document.getElementById('posterPlaceholder').style.display = 'flex';
      } else {
        cancelEdit(); 
      }
      loadEvents();
    } else {
      msg.style.color = '#D32F2F';
      msg.textContent = data.message || 'Failed to save event.';
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
  
  
  const isCloudinary = ev.poster && ev.poster.startsWith('http');
  const posterUrlNew = isCloudinary ? ev.poster : `${API_BASE}/uploads/posters/${ev.poster}`;
  const posterUrlOld = isCloudinary ? ev.poster : `${API_BASE}/uploads/${ev.poster}`;

  const posterHtml = ev.poster
    ? `<img src="${posterUrlNew}" onerror="this.onerror=null; this.src='${posterUrlOld}'; this.setAttribute('onclick', 'event.stopPropagation(); openPosterLightbox(\\'${posterUrlOld}\\')');" alt="Event Poster" class="event-poster-img" onclick="event.stopPropagation(); openPosterLightbox('${posterUrlNew}')" />`
    : `<div class="event-poster-placeholder">🎵</div>`;
  const mandatoryTag = ev.isMandatory ? '<span class="mandatory-tag">Mandatory</span>' : '';
  const feeText = ev.feeAmount > 0 ? `₹ ${ev.feeAmount}` : 'Free';
  const attendeeCount = ev.attendees ? ev.attendees.length : 0;

  
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
        <div class="event-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <span class="event-fee">${feeText}</span>
            <span style="font-size:12px;color:#8C6A52;">👥 ${attendeeCount} attending</span>
          </div>
          <div class="event-card-actions" style="display:flex; gap:8px;">
            <button onclick="event.stopPropagation(); startEdit('${encodeURIComponent(JSON.stringify(ev))}')" style="background:#4A7CB5; color:#fff; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600;">✎ Edit</button>
            <button onclick="event.stopPropagation(); deleteEvent('${ev._id}')" style="background:#B71C1C; color:#fff; border:none; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:600;">🗑 Delete</button>
          </div>
        </div>
      </div>
    </div>`;
}

async function openEvModal(evJson, isTeacher) {
  const ev = typeof evJson === 'string' ? JSON.parse(evJson) : evJson;
  const dateStr = new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  
  const isCloudinaryModal = ev.poster && ev.poster.startsWith('http');
  const posterUrlNewModal = isCloudinaryModal ? ev.poster : `${API_BASE}/uploads/posters/${ev.poster}`;
  const posterUrlOldModal = isCloudinaryModal ? ev.poster : `${API_BASE}/uploads/${ev.poster}`;

  
  const posterEl = document.getElementById('evModalPoster');
  posterEl.innerHTML = ev.poster
    ? `<img src="${posterUrlNewModal}" onerror="this.onerror=null; this.src='${posterUrlOldModal}'; this.setAttribute('onclick', 'openPosterLightbox(\\'${posterUrlOldModal}\\')');" alt="Poster" class="ev-modal-poster" onclick="openPosterLightbox('${posterUrlNewModal}')" />`
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

  
  const attBox = document.getElementById('evModalAttendees');
  attBox.innerHTML = '<p style="font-size:13px;color:#B0907A;text-align:center;">Loading...</p>';
  try {
    const res = await fetch(`${API_BASE}/api/events/${ev._id}/attendees`);
    const data = await res.json();
    if (data.attendees && data.attendees.length > 0) {
      attBox.innerHTML = data.attendees.map(a => `<div style="padding:6px 10px; border-bottom:1px solid #F5EDE3; font-size:13px; color:#5A3018; display:flex; justify-content:space-between;"><span>${a.studentName}</span><span style="font-size:11px; color:#9C7A62;">RSVP Verified</span></div>`).join('');
    } else {
      attBox.innerHTML = '<p style="font-size:12px;color:#9C7A62;text-align:center;padding:10px;">No students have RSVP\'d yet.</p>';
    }
  } catch (err) {
    attBox.innerHTML = '<p style="font-size:12px;color:#D32F2F;text-align:center;padding:10px;">Error loading attendees.</p>';
  }

  
  const actions = document.getElementById('evModalActions');
  if (isTeacher) {
    const evData = encodeURIComponent(JSON.stringify(ev));
    actions.innerHTML = `
      <button class="ev-modal-btn ev-modal-btn-secondary" onclick="closeEvModal()">Close</button>
      <button class="ev-modal-btn ev-modal-btn-primary" onclick="startEdit('${evData}')" style="background:#4A7CB5;">✎ Edit Event</button>
      <button class="ev-modal-btn ev-modal-btn-primary" onclick="deleteEvent('${ev._id}')" style="background:#B71C1C;">🗑 Delete</button>`;
  } else {
    actions.innerHTML = `
      <button class="ev-modal-btn ev-modal-btn-secondary" onclick="closeEvModal()">Close</button>
      <button class="ev-modal-btn ev-modal-btn-primary">✅ I Will Attend</button>`;
  }

  document.getElementById('evModalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function startEdit(evDataEncoded) {
  const ev = JSON.parse(decodeURIComponent(evDataEncoded));
  _editingEventId = ev._id;
  document.getElementById('posterInput').value = ''; 

  
  document.getElementById('evTitle').value = ev.title;
  document.getElementById('evDate').value = ev.date.split('T')[0];
  document.getElementById('evType').value = ev.type;
  document.getElementById('evFee').value = ev.feeAmount || 0;
  document.getElementById('evLocation').value = ev.locationOrLink || '';
  document.getElementById('evDesc').value = ev.description || '';
  document.getElementById('evMandatory').checked = !!ev.isMandatory;

  
  if (ev.poster) {
    const preview = document.getElementById('posterPreview');
    
    
    const isCloudinaryPreview = ev.poster && ev.poster.startsWith('http');
    const posterUrlNewPreview = isCloudinaryPreview ? ev.poster : `${API_BASE}/uploads/posters/${ev.poster}`;
    const posterUrlOldPreview = isCloudinaryPreview ? ev.poster : `${API_BASE}/uploads/${ev.poster}`;
    
    preview.src = posterUrlNewPreview;
    preview.onerror = function() {
      this.onerror = null;
      this.src = posterUrlOldPreview;
    };
    
    preview.style.display = 'block';
    document.getElementById('posterPlaceholder').style.display = 'none';
  }

  
  document.getElementById('submitText').textContent = 'Save Changes';
  document.getElementById('cancelEditBtn').style.display = 'block';

  
  document.querySelector('.event-form-card').scrollIntoView({ behavior: 'smooth' });
  closeEvModal();
}

function cancelEdit() {
  _editingEventId = null;
  document.getElementById('eventForm').reset();
  document.getElementById('submitText').textContent = 'Create Event';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('posterPreview').style.display = 'none';
  document.getElementById('posterPlaceholder').style.display = 'flex';
  document.getElementById('formMsg').textContent = '';
}

function closeEvModal(e) {
  if (e && e.target !== document.getElementById('evModalBackdrop')) return;
  document.getElementById('evModalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  try {
    const res = await fetch(`${API_BASE}/api/events/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      closeEvModal();
      loadEvents();
    }
    else alert('Failed to delete event.');
  } catch (err) {
    alert('Server error.');
  }
}


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


document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closePosterLightbox();
    closeEvModal();
  }
});
