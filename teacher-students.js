// teacher-students.js
// Search filter for students table
// Anchor links handle the scroll to progress cards - no JS needed for that

/* Add smooth scrolling to the whole page */
document.documentElement.style.scrollBehavior = 'smooth';


function filterStudents() {

  /* Get what teacher typed in search box */
  var input = document.getElementById('searchInput').value.toLowerCase();

  /* Get all rows in the table body */
  var rows = document.getElementById('studentsBody').getElementsByTagName('tr');

  /* Count visible rows */
  var visibleCount = 0;

  /* Go through each row */
  for (var i = 0; i < rows.length; i++) {

    /* Get the student name from this row */
    var nameCell = rows[i].getElementsByClassName('student-name')[0];

    if (nameCell) {
      var name = nameCell.textContent.toLowerCase();

      /* Show row if name matches search */
      if (name.indexOf(input) > -1) {
        rows[i].style.display = '';
        visibleCount++;
      } else {
        /* Hide row if name does not match */
        rows[i].style.display = 'none';
      }
    }
  }

  /* Update the count shown */
  document.getElementById('studentCount').textContent = visibleCount + ' Students';

  /* Show no results message if nothing found */
  if (visibleCount === 0) {
    document.getElementById('noResults').style.display = 'block';
  } else {
    document.getElementById('noResults').style.display = 'none';
  }

}

/* ─────────────────────────────
   DYNAMIC STUDENT MANAGEMENT
───────────────────────────── */

const API_BASE = 'http://localhost:5000';

// 1. Load All Students on Page Ready
document.addEventListener('DOMContentLoaded', () => {
  loadStudents();
  loadGlobalRagas();
  loadAllProgress();

  const addForm = document.getElementById('addStudentForm');
  if (addForm) {
    addForm.addEventListener('submit', handleAddStudent);
  }
});

// 2. Fetch Students from DB
async function loadStudents() {
  try {
    const res = await fetch(`${API_BASE}/api/students`);
    const students = await res.json();
    const tbody = document.getElementById('studentsBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">No students found.</td></tr>';
      document.getElementById('studentCount').textContent = '0 Students';
      return;
    }

    const activeCount = students.filter(s => !s.status || s.status === 'Active').length;
    document.getElementById('studentCount').textContent = `${students.length} Students (${activeCount} Active)`;
    
    students.forEach(s => {
      // Pick random avatar color purely for UI aesthetics
      const colors = ['blue', 'amber', 'green', 'purple', 'coral'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const firstLetter = s.name.charAt(0).toUpperCase();
      
      const joinedDate = new Date(s.joiningDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      const fee = s.monthlyFee || 0;
      const statusBadge = (s.status || 'Active').toLowerCase() === 'active' ? 'badge-active' : 'badge-inactive';
      const batchLabel = s.batchType || 'Regular Class';
      const batchBadge = batchLabel === 'Gurukul Batch' ? 'badge-gurukul' : 'badge-regular';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="student-cell">
            <div class="avatar av-${color}">${firstLetter}</div>
            <div>
              <p class="student-name">${s.name}</p>
              <p class="student-email">${s.email}</p>
            </div>
          </div>
        </td>
        <td class="td-muted">${s.phone || '-'}</td>
        <td><span class="badge ${batchBadge}">${batchLabel}</span></td>
        <td><span class="badge ${(s.ragaLevel || 'Beginner') === 'Beginner' ? 'badge-regular' : 'badge-gurukul'}">${s.ragaLevel || 'Beginner'}</span></td>
        <td class="td-fee">&#8377; ${fee}</td>
        <td class="td-muted">${joinedDate}</td>
        <td><span class="badge ${statusBadge}">${s.status || 'Active'}</span></td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="progress-link" style="background:#E3F0FB; color:#1565C0; border-color:#BBDEFB;" onclick="openEditModal('${s._id}', '${s.name.replace(/'/g,"\\'")}', '${s.phone || ''}', '${batchLabel}', ${fee}, '${s.status || 'Active'}')">Edit</button>
            <button class="progress-link" onclick="openRagaModal('${s._id}', '${s.name.replace(/'/g,"\\'")}')">Ragas</button>
            <button class="progress-link" style="background:#FEEBEE; color:#C62828; border-color:#FFCDD2;" onclick="deleteStudent('${s._id}', '${s.name.replace(/'/g,"\\'")}')">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
  } catch (err) {
    console.error('Failed to load students', err);
  }
}

// 3. Handle Add Student POST
async function handleAddStudent(e) {
  e.preventDefault();
  
  const name     = document.getElementById('newStudentName').value;
  const email    = document.getElementById('newStudentEmail').value;
  const password = document.getElementById('newStudentPassword').value;
  const batchType = document.getElementById('newStudentBatch').value;
  
  const token = localStorage.getItem('token');
  if (!token) {
    alert("Authentication error: Please log in again.");
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/students/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, email, password, batchType })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      const { tempPassword } = data;
      document.getElementById('addStudentForm').reset();
      loadStudents();
      showCredentialsModal(name, email, tempPassword);
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (err) {
    console.error('Error adding student:', err);
    alert('Failed to reach server.');
  }
}

// 4. Toggle Password Visibility
function togglePassword() {
  const pwdInput = document.getElementById('newStudentPassword');
  const toggleBtn = document.querySelector('.toggle-password');
  
  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    toggleBtn.textContent = 'Hide';
  } else {
    pwdInput.type = 'password';
    toggleBtn.textContent = 'Show';
  }
}

/* ─────────────────────────────
   GLOBAL RAGA LIST
───────────────────────────── */

async function loadGlobalRagas() {
  try {
    const res = await fetch(`${API_BASE}/api/ragas`);
    const data = await res.json();
    const input = document.getElementById('globalRagaInput');
    if (input) input.value = data.ragas.join(', ');
  } catch (err) {
    console.error('Failed to load global ragas', err);
  }
}

async function saveGlobalRagas() {
  const input = document.getElementById('globalRagaInput').value;
  const ragas = input.split(',').map(r => r.trim()).filter(r => r.length > 0);
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/ragas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ ragas })
    });
    const data = await res.json();
    if (res.ok) alert('Global raga list saved!');
    else alert('Error: ' + data.message);
  } catch (err) {
    alert('Failed to save raga list.');
  }
}

/* ─────────────────────────────
   RAGA PROGRESS MODAL
───────────────────────────── */

let _currentStudentId = null;

async function openRagaModal(studentId, studentName) {
  _currentStudentId = studentId;
  document.getElementById('ragaModalTitle').textContent = studentName + ' — Raga Progress';
  document.getElementById('ragaModalSubtitle').textContent = 'Set each raga\'s status for this student';
  document.getElementById('ragaModalBody').innerHTML = '<p style="color:#9C7A62; font-size:13px;">Loading...</p>';

  const modal = document.getElementById('ragaModal');
  modal.style.display = 'flex';

  try {
    const [ragaRes, progressRes] = await Promise.all([
      fetch(`${API_BASE}/api/ragas`),
      fetch(`${API_BASE}/api/ragas/${studentId}/progress`)
    ]);
    const { ragas } = await ragaRes.json();
    const { ragaProgress } = await progressRes.json();

    const statusMap = {};
    (ragaProgress || []).forEach(r => { statusMap[r.ragaName] = r.status; });

    const statusColors = { Learning: '#E65100', Practicing: '#1565C0', Mastered: '#2E7D32' };

    const body = document.getElementById('ragaModalBody');
    body.innerHTML = '';

    ragas.forEach(ragaName => {
      const current = statusMap[ragaName] || 'Learning';
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:#FAF4EC; border-radius:9px; border:1px solid #EAD9C8;';
      row.innerHTML = `
        <span style="font-size:14px; font-weight:500; color:#1E0A02;">${ragaName}</span>
        <select data-raga="${ragaName}" style="padding:6px 10px; border:1.5px solid #E2CEBC; border-radius:7px; font-size:13px; color:${statusColors[current]}; font-weight:600; background:#fff; cursor:pointer;">
          <option value="Learning"   ${current === 'Learning'   ? 'selected' : ''}>Learning</option>
          <option value="Practicing" ${current === 'Practicing' ? 'selected' : ''}>Practicing</option>
          <option value="Mastered"   ${current === 'Mastered'   ? 'selected' : ''}>Mastered</option>
        </select>
      `;
      row.querySelector('select').addEventListener('change', function() {
        this.style.color = statusColors[this.value];
      });
      body.appendChild(row);
    });
  } catch (err) {
    document.getElementById('ragaModalBody').innerHTML = '<p style="color:red;">Failed to load raga data.</p>';
  }
}

function closeRagaModal() {
  document.getElementById('ragaModal').style.display = 'none';
  _currentStudentId = null;
}

async function saveRagaProgress() {
  if (!_currentStudentId) return;
  const selects = document.querySelectorAll('#ragaModalBody select');
  const updates = Array.from(selects).map(s => ({ ragaName: s.dataset.raga, status: s.value }));
  const token = localStorage.getItem('token');

  try {
    const res = await fetch(`${API_BASE}/api/ragas/${_currentStudentId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ updates })
    });
    const data = await res.json();
    if (res.ok) {
      closeRagaModal();
      loadStudents();
      loadAllProgress();
      alert(`Progress saved! Level auto-updated to: ${data.ragaLevel}`);
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Failed to save progress.');
  }
}

// Close modal on backdrop click
document.getElementById('ragaModal').addEventListener('click', function(e) {
  if (e.target === this) closeRagaModal();
});

/* ─────────────────────────────
   ALL STUDENTS RAGA PROGRESS
───────────────────────────── */

async function loadAllProgress() {
  const container = document.getElementById('progressCards');
  if (!container) return;

  try {
    const [studentsRes, ragaRes] = await Promise.all([
      fetch(`${API_BASE}/api/students`),
      fetch(`${API_BASE}/api/ragas`)
    ]);
    const students = await studentsRes.json();
    const { ragas } = await ragaRes.json();

    // Only show active students in progress cards
    const activeStudents = students.filter(s => !s.status || s.status === 'Active');

    if (activeStudents.length === 0) {
      container.innerHTML = '<p style="color:#B0907A;font-size:13px;">No active students found.</p>';
      return;
    }

    const colors = ['blue', 'amber', 'green', 'purple', 'coral'];
    const dotClass  = { Mastered: 'dot-green', Practicing: 'dot-blue', Learning: 'dot-amber' };
    const rowClass  = { Mastered: 'mastered',  Practicing: 'practicing', Learning: 'learning' };
    const statusIcon = { Mastered: '&#10003; Mastered', Practicing: '&#9679; Practicing', Learning: '&#9675; Learning' };
    const statusCls  = { Mastered: 'status-green', Practicing: 'status-blue', Learning: 'status-amber' };

    // Fetch all progress in parallel (active students only)
    const progressResults = await Promise.all(
      activeStudents.map(s => fetch(`${API_BASE}/api/ragas/${s._id}/progress`).then(r => r.json()))
    );

    container.innerHTML = activeStudents.map((s, i) => {
      const color = colors[i % colors.length];
      const firstLetter = s.name.charAt(0).toUpperCase();
      const progressData = progressResults[i].ragaProgress || [];
      const statusMap = {};
      progressData.forEach(r => { statusMap[r.ragaName] = r.status; });

      const ragaRows = ragas.map(ragaName => {
        const status = statusMap[ragaName] || 'Learning';
        return `
          <div class="raga-row ${rowClass[status]}">
            <span class="raga-dot ${dotClass[status]}"></span>
            <p class="raga-name">${ragaName}</p>
            <p class="raga-status ${statusCls[status]}">${statusIcon[status]}</p>
          </div>
        `;
      }).join('');

      const masteredCount = ragas.filter(r => statusMap[r] === 'Mastered').length;

      return `
        <div class="progress-card">
          <div class="progress-card-header">
            <div class="student-cell">
              <div class="avatar av-${color}">${firstLetter}</div>
              <div>
                <p class="student-name">${s.name}</p>
                <p class="student-email">${s.ragaLevel || 'Beginner'} &nbsp;·&nbsp; ${masteredCount} of ${ragas.length} ragas mastered</p>
              </div>
            </div>
            <button onclick="openRagaModal('${s._id}', '${s.name}')" class="progress-link" style="margin-left:auto;">Edit Progress</button>
          </div>
          <div class="raga-list">${ragaRows}</div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Failed to load progress cards', err);
    document.getElementById('progressCards').innerHTML = '<p style="color:#B0907A;font-size:13px;">Failed to load progress.</p>';
  }
}

/* ─────────────────────────────
   CREDENTIALS MODAL
───────────────────────────── */

function showCredentialsModal(name, email, password) {
  document.getElementById('credEmail').textContent    = email;
  document.getElementById('credPassword').textContent = password;
  document.getElementById('credentialsModal').style.display = 'flex';
}

function closeCredentialsModal() {
  document.getElementById('credentialsModal').style.display = 'none';
}

function copyCredentials() {
  const email    = document.getElementById('credEmail').textContent;
  const password = document.getElementById('credPassword').textContent;
  const text     = `Kalashree Sangeet Gurukul Login\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after first login.`;
  navigator.clipboard.writeText(text).then(() => {
    const confirm = document.getElementById('copyConfirm');
    confirm.style.display = 'block';
    setTimeout(() => confirm.style.display = 'none', 2500);
  });
}

/* ─────────────────────────────
   EDIT STUDENT MODAL
───────────────────────────── */

let _editStudentId = null;

function openEditModal(id, name, phone, batchType, fee, status) {
  _editStudentId = id;
  document.getElementById('editName').value      = name;
  document.getElementById('editPhone').value     = phone;
  document.getElementById('editBatchType').value = batchType;
  document.getElementById('editFee').value       = fee;
  document.getElementById('editStatus').value    = status;
  document.getElementById('editModal').style.display = 'flex';
}
function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  _editStudentId = null;
}

async function saveEditStudent() {
  if (!_editStudentId) return;
  const token = localStorage.getItem('token');
  const body = {
    name:       document.getElementById('editName').value.trim(),
    phone:      document.getElementById('editPhone').value.trim(),
    batchType:  document.getElementById('editBatchType').value,
    monthlyFee: Number(document.getElementById('editFee').value) || 0,
    status:     document.getElementById('editStatus').value
  };

  try {
    const res = await fetch(`${API_BASE}/api/students/${_editStudentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      closeEditModal();
      loadStudents();
      loadAllProgress();
    } else {
      const d = await res.json();
      alert('Error: ' + d.message);
    }
  } catch (err) {
    alert('Failed to save changes.');
  }
}

// Close edit modal on backdrop click
document.getElementById('editModal').addEventListener('click', function(e) {
  if (e.target === this) closeEditModal();
});

/* ─────────────────────────────
   DELETE STUDENT
───────────────────────────── */

async function deleteStudent(id, name) {
  if (!confirm(`Delete student "${name}"?\n\nThis will permanently remove their account and all data.`)) return;
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`${API_BASE}/api/students/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const d = await res.json();
    if (res.ok) {
      loadStudents();
      loadAllProgress();
    } else {
      alert('Error: ' + d.message);
    }
  } catch (err) {
    alert('Failed to reach server. Make sure backend is running.');
  }
}

/* ─────────────────────────────
   AUTO-SET FEE BASED ON STATUS
───────────────────────────── */
function autoSetFee(status) {
  const feeInput = document.getElementById('editFee');
  if (!feeInput) return;
  // Only auto-set if teacher hasn't manually typed a custom value
  // We auto-set: Active → 800, anything else → 0
  if (status === 'Active') {
    feeInput.value = 800;
  } else {
    feeInput.value = 0;
  }
}
