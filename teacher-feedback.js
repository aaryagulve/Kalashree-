// teacher-feedback.js
var API_BASE = 'http://localhost:5000';
var teacherId = localStorage.getItem('userId');

document.addEventListener('DOMContentLoaded', async function() {
  await loadStudents();
  await loadPreviousNotes();
});

async function loadStudents() {
  try {
    const res = await fetch(API_BASE + '/api/students');
    if (res.ok) {
      const students = await res.json();
      const select = document.getElementById('selectStudent');
      students.forEach(student => {
        if (!student.status || student.status === 'Active') {
          const opt = document.createElement('option');
          opt.value = student._id;
          opt.textContent = student.name + ' (' + (student.ragaLevel || 'Student') + ')';
          select.appendChild(opt);
        }
      });
    }
  } catch(err) {
    console.error('Failed to load students:', err);
  }
}

async function loadPreviousNotes() {
  const container = document.getElementById('previousNotesContainer');
  if(!container) return;
  container.innerHTML = '<p style="padding: 20px; color: #666;">Loading previous notes...</p>';
  try {
    const res = await fetch(API_BASE + '/api/feedback/teacher');
    if (res.ok) {
      const notes = await res.json();
      container.innerHTML = '';
      if (notes.length === 0) {
        container.innerHTML = '<p style="padding: 20px; color: #666;">No previous notes found.</p>';
        return;
      }
      
      notes.forEach(note => {
        const isGlobal = note.isGlobal;
        const studentName = isGlobal ? 'Broadcast to All' : (note.studentId ? note.studentId.name : 'Unknown');
        const badgeColor = isGlobal ? '#E65100' : '#4A7CB5';
        const avatarInitial = isGlobal ? 'ALL' : (studentName[0] || 'S');
        const avatarBg = isGlobal ? 'background: #FFE0B2; color: #E65100; border-radius: 6px; padding: 4px; font-size:12px; font-weight:bold; display:flex; align-items:center; justify-content:center;' : '';
        const dateStr = new Date(note.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        
        let avatarHtml = `<div class="avatar av-amber">${avatarInitial}</div>`;
        if (isGlobal) {
          avatarHtml = `<div style="width: 40px; height: 40px; ${avatarBg}">${avatarInitial}</div>`;
        }

        const html = `
          <div class="note-card" style="${isGlobal ? 'border-left: 4px solid #FFB74D;' : ''}">
            <div class="note-top">
              <div class="student-cell">
                ${avatarHtml}
                <div>
                  <p class="note-student" style="${isGlobal ? 'color:#E65100; font-weight:700;' : ''}">${studentName}</p>
                </div>
              </div>
              <p class="note-date">${dateStr}</p>
            </div>
            <p class="note-text">${note.noteText}</p>
          </div>
        `;
        container.innerHTML += html;
      });
    }
  } catch(err) {
    console.error('Error loading notes:', err);
    container.innerHTML = '<p style="padding: 20px; color: red;">Failed to load previous notes.</p>';
  }
}

async function submitNote() {
  const student = document.getElementById('selectStudent').value;
  const noteContent = document.getElementById('noteText').value.trim();

  if (!student) {
    alert('Please select a student or "All Students".');
    return;
  }
  if (!noteContent) {
    alert('Please write a note before saving.');
    return;
  }

  const btn = document.querySelector('.submit-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await fetch(API_BASE + '/api/feedback/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherId: teacherId,
        studentId: student,
        noteText: noteContent
      })
    });

    if (res.ok) {
      document.getElementById('formSuccess').style.display = 'block';
      document.getElementById('selectStudent').value = '';
      document.getElementById('noteText').value = '';
      setTimeout(() => { document.getElementById('formSuccess').style.display = 'none'; }, 4000);
      loadPreviousNotes();
    } else {
      const data = await res.json();
      alert('Failed: ' + data.message);
    }
  } catch(err) {
    console.error('Error sending:', err);
    alert('Server error.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Note';
  }
}