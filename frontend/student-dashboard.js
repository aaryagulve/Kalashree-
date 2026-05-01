// student-dashboard.js

function toggleHwType(type) {
  const linkSec    = document.getElementById('hwLinkSection');
  const uploadSec  = document.getElementById('hwUploadSection');
  const linkSpan   = document.getElementById('hwToggleLink');
  const uploadSpan = document.getElementById('hwToggleUpload');
  if (!uploadSec) return;
  linkSec.style.display   = type === 'link'   ? 'block' : 'none';
  uploadSec.style.display = type === 'upload' ? 'block' : 'none';
  const activeStyle   = 'background:#fff;font-weight:600;color:#7A3210;box-shadow:0 1px 6px rgba(90,40,10,0.1);';
  const inactiveStyle = 'background:transparent;font-weight:500;color:#9C7A62;box-shadow:none;';
  if (linkSpan)   linkSpan.style.cssText   = type === 'link'   ? activeStyle : inactiveStyle;
  if (uploadSpan) uploadSpan.style.cssText = type === 'upload' ? activeStyle : inactiveStyle;
}

// Animation function for counting numbers
function animateValue(obj, start, end, duration, appendText = '') {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const currentVal = Math.floor(progress * (end - start) + start);
    obj.innerHTML = currentVal + appendText;
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.innerHTML = end + appendText; // Ensure exact final number
    }
  };
  window.requestAnimationFrame(step);
}

document.addEventListener('DOMContentLoaded', async function () {
  const dateEl = document.querySelector('.today-date');
  const dayEl = document.querySelector('.today-day');
  if (dateEl && dayEl) {
    const today = new Date();
    dateEl.textContent = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    dayEl.textContent = today.toLocaleDateString('en-GB', { weekday: 'long' });
  }

  var studentName = localStorage.getItem('userName') || 'Student';
  var welcomeNameEl = document.getElementById('welcomeName');
  if (welcomeNameEl) welcomeNameEl.textContent = studentName;

  var studentId = localStorage.getItem('userId');
  if (!studentId) return;

  try {
    // 1. Fetch Student Details
    var studentRes = await fetch(API_BASE + '/api/students/' + studentId);
    if (studentRes.ok) {
      var studentData = await studentRes.json();
      if (studentData) {
        document.getElementById('currentLevelText').textContent = studentData.ragaLevel || 'Beginner';
        const batchEl = document.getElementById('batchTypeText');
        if (batchEl) batchEl.textContent = studentData.batchType || 'Regular Class';
        if (studentData.joiningDate) {
          var jd = new Date(studentData.joiningDate);
          var options = { month: 'short', year: 'numeric' };
          document.getElementById('joinDateText').textContent = jd.toLocaleDateString('en-GB', options);
        }
      }
    }

    // 2. Fetch Attendance Percentage
    var attRes = await fetch(API_BASE + '/api/attendance/percentage/' + studentId);
    if (attRes.ok) {
      var attData = await attRes.json();
      if (attData && attData.percentage !== undefined) {
        var pct = Math.round(attData.percentage);
        animateValue(document.getElementById('attendanceNum'), 0, pct, 1500, '<span class="card-percent">%</span>');
        document.getElementById('attendanceBar').style.transition = 'width 1.5s ease-out';
        document.getElementById('attendanceBar').style.width = pct + '%';
      }
    }

    // 3. Fetch Fee Status for current month
    var feeRes = await fetch(API_BASE + '/api/fee/student/' + studentId);
    if (feeRes.ok) {
      var feeRecords = await feeRes.json();
      if (feeRecords && feeRecords.length > 0) {
        var latestFee = feeRecords[0]; 
        var feeEl = document.getElementById('feeStatusText');
        var feeBarEl = document.getElementById('feeBar');
        
        feeEl.textContent = latestFee.status;
        var hint = feeEl.parentElement.querySelector('.card-hint');
        if(hint) hint.textContent = latestFee.month;

        if (latestFee.status === 'Paid') {
          feeEl.style.color = '#388E3C'; 
          feeBarEl.style.width = '100%';
          feeBarEl.style.background = '#388E3C';
        } else {
          feeEl.style.color = '#D32F2F'; 
          feeBarEl.style.width = '30%';
          feeBarEl.style.background = '#D32F2F';
        }
      } else {
         document.getElementById('feeStatusText').textContent = 'No Dues';
         document.getElementById('feeBar').style.width = '100%';
         document.getElementById('feeBar').style.background = '#E2CEBC';
         var hint = document.getElementById('feeStatusText').parentElement.querySelector('.card-hint');
         if (hint) {
           var today = new Date();
           hint.textContent = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
         }
      }
    }

    // 4. Fetch Recent Attendance History AND Practice Streak
    var histRes = await fetch(API_BASE + '/api/attendance/student/' + studentId);
    if (histRes.ok) {
      // (Old logic for recent attendance removed to make way for Practice Streak)
      // Now replaced by Streak Logic
    }

    // 5. Fetch Practice Streak
    loadPracticeStreak(studentId);

    // Set practice date picker to today by default
    const dateInput = document.getElementById('practiceDate');
    if (dateInput) {
      const now = new Date();
      dateInput.value = now.toISOString().split('T')[0];
      dateInput.max   = now.toISOString().split('T')[0]; // can't mark future dates
    }
    
    // 6. Fetch Guru Notes
    loadGuruNotes(studentId);

    // 6.5 Fetch Raga Progress
    loadRagaProgress(studentId);

    // 6.6 Fetch Performance Insights
    loadStudentInsights(studentId);

    // 6.7 Fetch Weekly Attendance Progress
    loadWeeklyAttendance(studentId);

    // 6.8 Event Alerts
    loadEventAlerts();

    // 6. Handle Mark Practice Done
    document.getElementById('markPracticeBtn').addEventListener('click', async function() {
      try {
        const dateInput = document.getElementById('practiceDate');
        const selectedDate = dateInput ? dateInput.value : '';

        const res = await fetch(`${API_BASE}/api/practice/mark-done`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, date: selectedDate || null })
        });
        
        const data = await res.json();
        
        if (res.ok) {
          const btn = document.getElementById('markPracticeBtn');
          btn.textContent = 'Awesome! 🎉';
          btn.style.background = '#4A9B6F';
          btn.disabled = true;
          document.getElementById('streakFireIcon').style.animation = 'pulse 1s ease 3';
          setTimeout(() => {
            loadPracticeStreak(studentId);
            loadStudentInsights(studentId);
          }, 1500);
        } else {
          alert(data.message || 'Failed to mark practice.');
        }
      } catch (err) {
        console.error('Error marking practice:', err);
      }
    });

    // 7. Handle Homework Submission
    document.getElementById('homeworkForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const title     = document.getElementById('hwTitle').value.trim();
      const submitBtn = document.getElementById('hwSubmitBtn');
      const msgDiv    = document.getElementById('hwMessage');
      const typeEl    = document.querySelector('input[name="hwSubmitType"]:checked');
      const type      = typeEl ? typeEl.value : 'link';

      if (!title) { msgDiv.style.color = '#D32F2F'; msgDiv.textContent = 'Please enter a title.'; return; }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        let res;

        if (type === 'upload') {
          const audioFile = document.getElementById('hwAudioFile').files[0];
          if (!audioFile) { msgDiv.style.color = '#D32F2F'; msgDiv.textContent = 'Please select an audio file.'; submitBtn.disabled = false; submitBtn.textContent = 'Submit to Guru'; return; }
          const fd = new FormData();
          fd.append('studentId', studentId);
          fd.append('title', title);
          fd.append('submissionType', 'upload');
          fd.append('audioFile', audioFile);
          res = await fetch(`${API_BASE}/api/homework/submit`, { method: 'POST', body: fd });
        } else {
          const fileUrl = document.getElementById('hwLink').value.trim();
          if (!fileUrl) { msgDiv.style.color = '#D32F2F'; msgDiv.textContent = 'Please paste a link.'; submitBtn.disabled = false; submitBtn.textContent = 'Submit to Guru'; return; }
          res = await fetch(`${API_BASE}/api/homework/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, title, fileUrl, submissionType: 'link' })
          });
        }

        const data = await res.json();
        if (res.ok) {
          msgDiv.style.color = '#2E7D32';
          msgDiv.textContent = '✓ Practice submitted successfully!';
          document.getElementById('homeworkForm').reset();
          document.getElementById('hwAudioName').textContent = '🎵 Click to choose audio file';
          toggleHwType('upload'); // reset to upload mode
          loadHomework(studentId);
        } else {
          msgDiv.style.color = '#D32F2F';
          msgDiv.textContent = data.message || 'Submission failed';
        }
      } catch (err) {
        msgDiv.style.color = '#D32F2F';
        msgDiv.textContent = 'Server error. Try again.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit to Guru';
        setTimeout(() => msgDiv.textContent = '', 4000);
      }
    });

    // 8. Fetch student homework
    loadHomework(studentId);

  } catch (err) {
    console.error('Error fetching dashboard data:', err);
  }
});

async function loadPracticeStreak(studentId) {
  try {
    const res = await fetch(`${API_BASE}/api/practice/${studentId}`);
    if (res.ok) {
      const data = await res.json();
      const textEl = document.getElementById('streakText');
      const subEl = document.getElementById('streakSubtext');
      const btn = document.getElementById('markPracticeBtn');
      
      const streak = data.streak;
      
      let badgeHTML = '';
      if (streak >= 3) {
        let badgeName = 'Consistency Fire';
        let badgeClass = 'fire';
        let emoji = '🔥';
        if (streak >= 7) { badgeName = 'Rockstar'; badgeClass = 'rockstar'; emoji = '🎸'; }
        if (streak >= 14) { badgeName = 'Maestro'; badgeClass = 'maestro'; emoji = '👑'; }
        if (streak >= 30) { badgeName = 'Legend'; badgeClass = 'legend'; emoji = '🌟'; }
        badgeHTML = `<span class="streak-badge badge-${badgeClass}"><span class="badge-emoji">${emoji}</span> ${badgeName}</span>`;
      }
      
      textEl.innerHTML = `<strong>${streak} Day${streak !== 1 ? 's' : ''}</strong> Streak ${badgeHTML}`;
      
      if (data.didPracticeToday) {
        subEl.textContent = 'You already practiced today! Great job.';
        btn.textContent = 'Done for Today';
        btn.style.background = '#4A9B6F';
        btn.disabled = true;
      } else if (streak > 0) {
        subEl.textContent = 'Don\'t break your streak! Practice now.';
      } else {
        subEl.textContent = 'Start a new practice streak today!';
      }
    }
  } catch (err) {
    console.error('Error loading streak:', err);
  }
}

async function loadHomework(studentId) {
  try {
    const res = await fetch(`${API_BASE}/api/homework/student/${studentId}`);
    const hwListEl = document.getElementById('hwListContainer');
    
    if (res.ok) {
      const submissions = await res.json();
      
      if (submissions.length === 0) {
        hwListEl.innerHTML = '<p class="loading-text">No practice submissions yet.</p>';
        return;
      }
      
      hwListEl.innerHTML = '';
      
      submissions.slice(0, 5).forEach(hw => {
        const dateStr = new Date(hw.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        
        let feedbackHtml = '';
        if (hw.teacherFeedback) {
          feedbackHtml = `<div class="hw-feedback"><strong>Guru ji:</strong> ${hw.teacherFeedback}</div>`;
        }

        let mediaHtml = '';
        if (hw.submissionType === 'upload' && hw.audioFilePath) {
          mediaHtml = `<audio controls style="width:100%;margin-top:4px;border-radius:6px;"><source src="${API_BASE}/uploads/audio/${hw.audioFilePath}"></audio>`;
        } else if (hw.fileUrl) {
          mediaHtml = `<a href="${hw.fileUrl}" target="_blank" class="hw-link">🔗 View Submission</a>`;
        }
        
        const html = `
          <div class="hw-item ${hw.status === 'Reviewed' ? 'reviewed' : ''}">
            <div class="hw-item-top">
              <span class="hw-item-title">${hw.title}</span>
              <span class="hw-item-date">${dateStr}</span>
            </div>
            <span class="hw-item-status">${hw.status}</span><br>
            ${mediaHtml}
            ${feedbackHtml}
          </div>
        `;
        
        hwListEl.innerHTML += html;
      });
      
    } else {
      hwListEl.innerHTML = '<p class="loading-text">Failed to load submissions.</p>';
    }
  } catch (err) {
    console.error('Error loading homework:', err);
    document.getElementById('hwListContainer').innerHTML = '<p class="loading-text">Error loading data.</p>';
  }
}

async function loadGuruNotes(studentId) {
  try {
    const res = await fetch(`${API_BASE}/api/feedback/student/${studentId}`);
    const notesListEl = document.getElementById('dashboardNotesContainer');
    if (!notesListEl) return;
    
    if (res.ok) {
      const notes = await res.json();
      if (notes.length === 0) {
        notesListEl.innerHTML = '<p class="loading-text">No notes yet.</p>';
        return;
      }
      
      notesListEl.innerHTML = '';
      notes.slice(0, 3).forEach((hw, index) => {
        const dateStr = new Date(hw.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const isGlobal = hw.isGlobal || false;
        
        let newLabel = '';
        if (index === 0) {
           newLabel = '<span class="note-new">New</span>';
        }
        
        let headerLabel = '';
        if (isGlobal) {
           headerLabel = `<span style="display:inline-block;background:linear-gradient(135deg,rgba(255,224,178,0.9),rgba(255,204,128,0.7));color:#E65100;font-size:11px;font-weight:700;padding:3px 10px;border-radius:10px;margin-bottom:6px;border:1px solid rgba(255,183,77,0.4);">Class Note</span><br>`;
        }
        
        const html = `
          <div class="note-card ${index === 0 ? 'note-recent' : ''}" style="${isGlobal ? 'border-left-color:#FFB74D;' : ''}">
            <div class="note-top">
              <p class="note-date">${headerLabel}${dateStr}</p>
              ${newLabel}
            </div>
            <p class="note-text">${hw.noteText}</p>
          </div>
        `;
        notesListEl.innerHTML += html;
      });
      
    } else {
      notesListEl.innerHTML = '<p class="loading-text">Failed to load notes.</p>';
    }
  } catch (err) {
    console.error('Error loading notes:', err);
    document.getElementById('dashboardNotesContainer').innerHTML = '<p class="loading-text">Error loading data.</p>';
  }
}


async function loadRagaProgress(studentId) {
  try {
    const [ragaRes, progressRes] = await Promise.all([
      fetch(`${API_BASE}/api/ragas`),
      fetch(`${API_BASE}/api/ragas/${studentId}/progress`)
    ]);
    const { ragas } = await ragaRes.json();
    const { ragaProgress } = await progressRes.json();

    const statusMap = {};
    (ragaProgress || []).forEach(r => { statusMap[r.ragaName] = r.status; });

    const total = ragas.length;
    const mastered = ragas.filter(r => statusMap[r] === 'Mastered').length;

    // Update overview cards
    const assignedEl = document.getElementById('ragasAssignedNum');
    const masteredEl = document.getElementById('ragasMasteredNum');
    const masteredHint = document.getElementById('ragasMasteredHint');
    const assignedBar = document.getElementById('ragasAssignedBar');
    const masteredBar = document.getElementById('ragasMasteredBar');

    if (assignedEl) assignedEl.textContent = total;
    if (masteredEl) masteredEl.textContent = mastered;
    if (masteredHint) masteredHint.textContent = `Out of ${total} assigned`;
    if (assignedBar) assignedBar.style.width = '100%';
    if (masteredBar) masteredBar.style.width = total > 0 ? (mastered / total * 100) + '%' : '0%';

    // Render raga list
    const listEl = document.getElementById('ragaProgressList');
    if (!listEl) return;

    if (ragas.length === 0) {
      listEl.innerHTML = '<p class="loading-text">No ragas assigned yet.</p>';
      return;
    }

    const badgeClass = { Learning: 'badge-learning', Practicing: 'badge-practicing', Mastered: 'badge-mastered' };

    listEl.innerHTML = ragas.map(ragaName => {
      const status = statusMap[ragaName] || 'Learning';
      return `
        <div class="raga-item">
          <div class="raga-info">
            <p class="raga-name">Raag ${ragaName}</p>
          </div>
          <span class="raga-badge ${badgeClass[status]}">${status}</span>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading raga progress:', err);
    const listEl = document.getElementById('ragaProgressList');
    if (listEl) listEl.innerHTML = '<p class="loading-text">Failed to load ragas.</p>';
  }
}

async function loadStudentInsights(studentId) {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/student-insights?studentId=${studentId}`);
    if (!res.ok) return;
    const d = await res.json();

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('insightSessions', d.submissionsThisMonth);
    set('insightStreak',   d.streak);
    set('insightRagaPct',  d.ragaCompletionPct + '%');
    set('insightRagaSub',  `${d.mastered} of ${d.total} mastered`);
    set('insightAttPct',   d.attPct + '%');
    set('motivationText',  d.motivation);

    // Colour the streak icon based on value
    const fireEl = document.getElementById('insightSessions');
    if (fireEl && d.submissionsThisMonth >= 4) fireEl.style.color = '#2E7D32';
    else if (fireEl && d.submissionsThisMonth === 0) fireEl.style.color = '#D32F2F';

  } catch (err) {
    console.error('Insights load error', err);
  }
}

async function loadWeeklyAttendance(studentId) {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/weekly-progress/${studentId}`);
    if (!res.ok) return;
    const d = await res.json();

    const textEl = document.getElementById('weeklyAttText');
    const subEl  = document.getElementById('weeklyAttSub');
    if (!textEl) return;

    const present  = d.presentThisWeek;
    const expected = d.expectedPerWeek;
    const pct      = Math.round((present / expected) * 100);

    textEl.innerHTML = `<strong>${present} / ${expected}</strong> classes attended this week`;
    
    let subText = `${d.batchType} · ${pct >= 100 ? '✅ Perfect attendance!' : pct >= 50 ? '📈 Good progress' : '⚠️ Try to attend more classes'}`;
    if (d.markedToday) {
      if (d.presentToday) {
        subText = `✅ You were marked <strong>Present</strong> today!`;
      } else {
        subText = `❌ You were marked <strong>Absent</strong> today.`;
      }
    }
    subEl.innerHTML = subText;

    // Colour the bar based on percentage
    const bar = document.getElementById('weeklyAttBar');
    if (bar) {
      bar.style.borderLeft = pct >= 100 ? '4px solid #2E7D32' : pct >= 50 ? '4px solid #1565C0' : '4px solid #E65100';
    }
  } catch (err) {
    console.error('Weekly attendance error', err);
  }
}

async function loadEventAlerts() {
  try {
    const res = await fetch(`${API_BASE}/api/events`);
    if (!res.ok) return;
    const events = await res.json();
    const studentId   = localStorage.getItem('userId');
    const studentName = localStorage.getItem('userName') || 'Student';

    const now = new Date(); now.setHours(0,0,0,0);
    const in3 = new Date(now); in3.setDate(now.getDate() + 3);

    const upcoming = events.filter(ev => {
      const d = new Date(ev.date); d.setHours(0,0,0,0);
      return d >= now && d <= in3;
    });

    const banner = document.getElementById('eventAlertBanner');
    if (!banner || upcoming.length === 0) return;

    banner.style.display = 'block';
    banner.innerHTML = upcoming.map(ev => {
      const evDate = new Date(ev.date); evDate.setHours(0,0,0,0);
      const diffDays = Math.round((evDate - now) / (1000*60*60*24));
      const isAttending = studentId && ev.attendees && ev.attendees.some(a =>
        a.studentId === studentId || (a.studentId && a.studentId.toString() === studentId)
      );
      const attendeeCount = ev.attendees ? ev.attendees.length : 0;

      let label, borderColor, bg, iconColor;
      if (diffDays === 0)      { label = '🔴 Today!';         borderColor = '#C62828'; bg = 'rgba(255,235,238,0.92)'; iconColor = '#C62828'; }
      else if (diffDays === 1) { label = '🟠 Tomorrow';       borderColor = '#E65100'; bg = 'rgba(255,243,224,0.92)'; iconColor = '#E65100'; }
      else                     { label = `🔵 In ${diffDays} days`; borderColor = '#1565C0'; bg = 'rgba(227,242,253,0.92)'; iconColor = '#1565C0'; }

      const dateStr  = evDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const feeNote  = ev.feeAmount > 0 ? ` · ₹${ev.feeAmount} entry` : ' · Free';
      const mandatory = ev.isMandatory ? ' · <strong style="color:#C62828;">Mandatory</strong>' : '';

      return `
        <div style="display:flex;align-items:center;gap:14px;background:${bg};backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.6);border-left:4px solid ${borderColor};border-radius:12px;padding:14px 18px;margin-bottom:8px;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
          <span style="font-size:22px;">🎵</span>
          <div style="flex:1;">
            <p style="font-size:14px;font-weight:700;color:#1E0A02;margin:0 0 2px;">${ev.title}</p>
            <p style="font-size:12.5px;color:#5A3018;margin:0;">${dateStr} · ${ev.type}${feeNote}${mandatory} · 👥 ${attendeeCount} attending</p>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
            <span style="font-size:12px;font-weight:700;color:${iconColor};white-space:nowrap;">${label}</span>
            <button id="dashRsvpBtn-${ev._id}"
              onclick="dashboardRSVP('${ev._id}','${studentId}','${studentName}',${isAttending})"
              style="font-size:11px;font-weight:600;padding:5px 12px;border:none;border-radius:8px;cursor:pointer;white-space:nowrap;background:${isAttending ? 'linear-gradient(135deg,#2E7D32,#1B5E20)' : 'linear-gradient(135deg,#C4622E,#9A3E18)'};color:#fff;">
              ${isAttending ? '✓ Attending' : '✅ I Will Attend'}
            </button>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    console.error('Event alerts error', err);
  }
}

async function dashboardRSVP(eventId, studentId, studentName, isCurrentlyAttending) {
  const btn = document.getElementById('dashRsvpBtn-' + eventId);
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  try {
    const method = isCurrentlyAttending ? 'DELETE' : 'POST';
    const res = await fetch(`${API_BASE}/api/events/${eventId}/attend`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, studentName })
    });
    if (res.ok) {
      const data = await res.json();
      const nowAttending = !isCurrentlyAttending;
      if (btn) {
        btn.disabled = false;
        btn.textContent = nowAttending ? '✓ Attending' : '✅ I Will Attend';
        btn.style.background = nowAttending ? 'linear-gradient(135deg,#2E7D32,#1B5E20)' : 'linear-gradient(135deg,#C4622E,#9A3E18)';
        btn.onclick = () => dashboardRSVP(eventId, studentId, studentName, nowAttending);
      }
    }
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Error'; }
  }
}
