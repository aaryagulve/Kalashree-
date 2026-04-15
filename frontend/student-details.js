var studentId = localStorage.getItem('userId');

// All attendance records fetched from API
var allAttendanceRecords = [];

/* ── LOAD EVERYTHING ON PAGE OPEN ── */
document.addEventListener('DOMContentLoaded', function () {
  if (!studentId) return;
  loadStudentProfile();
  loadAttendance();
  loadStudentFees();
  loadGuruNotes(studentId);
});

/* ── STUDENT PROFILE (fee info bar) ── */
async function loadStudentProfile() {
  try {
    const res = await fetch(`${API_BASE}/api/students/${studentId}`);
    if (!res.ok) return;
    const s = await res.json();
    const bar = document.getElementById('feeInfoBar');
    if (bar && s) {
      bar.innerHTML = `Monthly fee — <strong>&#8377; ${s.monthlyFee || 0}</strong> &nbsp;·&nbsp;
        Batch — <strong>${s.batchType || 'Regular Class'}</strong> &nbsp;·&nbsp;
        Due on — <strong>10th of every month</strong>`;
    }
  } catch (err) { console.error('Profile load error', err); }
}

/* ── ATTENDANCE ── */
async function loadAttendance() {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/student/${studentId}`);
    if (!res.ok) return;
    allAttendanceRecords = await res.json();
    populateMonthDropdown();
    renderCurrentMonth();
  } catch (err) { console.error('Attendance load error', err); }
}

function populateMonthDropdown() {
  const select = document.getElementById('monthSelect');
  if (!select) return;

  // Collect unique year-month combos from records
  const seen = new Set();
  const months = [];
  allAttendanceRecords.forEach(r => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seen.has(key)) {
      seen.add(key);
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) });
    }
  });

  // If no records, keep a default option
  if (months.length === 0) {
    const now = new Date();
    months.push({ year: now.getFullYear(), month: now.getMonth(), label: now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) });
  }

  select.innerHTML = months.map((m, i) =>
    `<option value="${m.year}-${m.month}" ${i === 0 ? 'selected' : ''}>${m.label}</option>`
  ).join('');
}

function changeMonth() {
  renderCurrentMonth();
}

function renderCurrentMonth() {
  const select = document.getElementById('monthSelect');
  if (!select) return;
  const [year, month] = select.value.split('-').map(Number);

  const filtered = allAttendanceRecords.filter(r => {
    const d = new Date(r.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const total   = filtered.length;
  const present = filtered.filter(r => r.status === 'Present').length;
  const absent  = total - present;
  const pct     = total === 0 ? 0 : Math.round((present / total) * 100);
  const label   = select.options[select.selectedIndex].text;

  document.getElementById('calMonthTitle').textContent = label + ' — Class Record';
  document.getElementById('attendPercent').textContent = pct + '%';
  document.getElementById('presentCount').textContent  = present;
  document.getElementById('absentCount').textContent   = absent;

  buildDotList(filtered);
}

function buildDotList(records) {
  const container = document.getElementById('dotList');
  if (!container) return;

  if (records.length === 0) {
    container.innerHTML = '<p style="color:#B0907A; font-size:13px; padding:8px 0;">No attendance records for this month.</p>';
    return;
  }

  container.innerHTML = records.map(r => {
    const d = new Date(r.date);
    const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const dayStr  = d.toLocaleDateString('en-GB', { weekday: 'long' });
    const isPresent = r.status === 'Present';
    return `
      <div class="dot-row">
        <p class="dot-date">${dateStr}</p>
        <p class="dot-day">${dayStr}</p>
        <span class="dot ${isPresent ? 'dot-present' : 'dot-absent'}"></span>
        <p class="dot-status ${isPresent ? 'status-present' : 'status-absent'}">${r.status}</p>
      </div>`;
  }).join('');
}

/* ── FEE HISTORY ── */
async function loadStudentFees() {
  if (!studentId) return;
  const container = document.getElementById('feeTimelineContainer');
  if (!container) return;
  try {
    const res = await fetch(`${API_BASE}/api/fee/student/${studentId}`);
    if (!res.ok) { container.innerHTML = '<p style="padding:20px;color:#666;">Failed to load fees.</p>'; return; }
    const fees = await res.json();
    container.innerHTML = '';
    if (fees.length === 0) {
      container.innerHTML = '<p style="padding:20px;color:#666;">No fee records found.</p>';
      return;
    }
    fees.forEach(fee => {
      const isOverdue = fee.status === 'Unpaid' && fee.dueDate && new Date(fee.dueDate) < new Date();
      const dotColor  = fee.status === 'Paid' ? '#4CAF50' : '#F44336';

      // Badge styles
      const badges = {
        paid:      'background:#E6F4EA;color:#2E7D32;border:1px solid #C8E6C9;',
        requested: 'background:#FFF3E0;color:#E65100;border:1px solid #FFE0B2;',
        rejected:  'background:#FFEBEE;color:#C62828;border:1px solid #FFCDD2;',
        overdue:   'background:#FFEBEE;color:#C62828;border:1px solid #FFCDD2;',
        unpaid:    'background:#FBE9E7;color:#D84315;border:1px solid #FFCCBC;'
      };

      let badgeStyle = 'padding:4px 12px;border-radius:20px;font-weight:600;font-size:12px;margin-left:10px;vertical-align:middle;display:inline-block;';
      let badgeText  = fee.status;
      if (fee.status === 'Paid')                          { badgeStyle += badges.paid; }
      else if (fee.paymentStatus === 'Payment Requested') { badgeStyle += badges.requested; badgeText = 'Requested'; }
      else if (fee.paymentStatus === 'Rejected')          { badgeStyle += badges.rejected;  badgeText = 'Rejected'; }
      else if (isOverdue)                                 { badgeStyle += badges.overdue;   badgeText = 'Overdue'; }
      else                                                { badgeStyle += badges.unpaid; }

      const dateText = fee.status === 'Paid'
        ? 'Paid ' + new Date(fee.paidDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        : 'Due ' + new Date(fee.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

      let extra = '';
      if (fee.paymentStatus === 'Payment Requested') {
        extra = `<p style="font-size:13px;color:#1565C0;background:linear-gradient(135deg,rgba(227,242,253,0.9),rgba(187,222,251,0.5));padding:12px 16px;border-radius:10px;margin:10px 0;border:1px solid rgba(187,222,251,0.8);border-left:3px solid #1565C0;">⏳ Your payment is pending confirmation from the teacher.</p>`;
      } else if (fee.paymentStatus === 'Rejected') {
        extra = `<p style="font-size:13px;color:#C62828;background:linear-gradient(135deg,rgba(255,235,238,0.9),rgba(255,205,210,0.5));padding:12px 16px;border-radius:10px;margin:10px 0;border:1px solid rgba(255,205,210,0.8);border-left:3px solid #C62828;">❌ Payment not confirmed — please try again.</p>`;
        extra += buildPaySection(fee._id);
      } else if (fee.status === 'Unpaid') {
        extra = buildPaySection(fee._id);
      }

      container.innerHTML += `
        <div style="
          position:relative;
          margin-bottom:16px;
          padding:20px 24px 20px 44px;
          background:linear-gradient(135deg,rgba(255,255,255,0.98),rgba(253,248,242,0.85));
          border-radius:14px;
          border:1px solid rgba(255,255,255,0.7);
          border-left:4px solid ${dotColor};
          box-shadow:0 8px 24px rgba(63,26,18,0.04),inset 0 1px 0 rgba(255,255,255,1);
          transition:transform 0.3s ease,box-shadow 0.3s ease;
        " onmouseenter="this.style.transform='translateY(-3px)';this.style.boxShadow='0 14px 36px rgba(63,26,18,0.08),inset 0 1px 0 rgba(255,255,255,1)'" onmouseleave="this.style.transform='';this.style.boxShadow='0 8px 24px rgba(63,26,18,0.04),inset 0 1px 0 rgba(255,255,255,1)'">
          <span style="position:absolute;left:18px;top:22px;width:10px;height:10px;border-radius:50%;background:${dotColor};box-shadow:0 0 8px ${dotColor}44;"></span>
          <p style="font-weight:700;font-size:16px;margin:0 0 4px;color:#1A0D05;display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
            ${fee.month} <span style="${badgeStyle}">${badgeText}</span>
          </p>
          <p style="font-size:15px;margin:0 0 3px;color:#3D1A08;font-family:'Cormorant Garamond',serif;font-weight:700;">&#8377; ${fee.amount}</p>
          <p style="font-size:12px;color:#8C6A52;margin:0 0 6px;">${dateText}</p>
          ${extra}
        </div>`;
    });
  } catch (err) {
    container.innerHTML = '<p style="color:red;padding:20px;">Failed to load fees.</p>';
  }
}

async function requestPaymentWithScreenshot(feeId) {
  const fileInput = document.getElementById('ss-' + feeId);
  const file = fileInput ? fileInput.files[0] : null;
  const btn  = document.querySelector(`button[data-fee="${feeId}"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting...'; }

  try {
    let res;
    if (file) {
      const fd = new FormData();
      fd.append('screenshot', file);
      res = await fetch(`${API_BASE}/api/fee/request/${feeId}`, { method: 'PUT', body: fd });
    } else {
      res = await fetch(`${API_BASE}/api/fee/request/${feeId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }
      });
    }
    if (res.ok) {
      // Show success inline
      const wrapper = document.getElementById('pay-section-' + feeId);
      if (wrapper) wrapper.innerHTML = '<p style="font-size:13px;color:#2E7D32;font-weight:600;margin-top:8px;">✓ Payment submitted! Awaiting teacher confirmation.</p>';
      setTimeout(() => loadStudentFees(), 2000);
    } else {
      const d = await res.json();
      alert(d.message || 'Failed to send request');
      if (btn) { btn.disabled = false; btn.textContent = '📤 I Have Paid'; }
    }
  } catch (err) {
    alert('Error: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = '📤 I Have Paid'; }
  }
}

function buildPaySection(feeId) {
  return `
    <div id="pay-section-${feeId}" style="margin-top:12px;padding:14px 16px;background:rgba(253,248,242,0.9);border-radius:10px;border:1px solid rgba(212,160,23,0.2);">
      <p style="font-size:12.5px;color:#5A3018;font-weight:600;margin-bottom:8px;">📸 Upload payment screenshot (optional)</p>
      <input type="file" id="ss-${feeId}" accept="image/*"
             style="font-size:12px;margin-bottom:10px;display:block;color:#5A3018;width:100%;" />
      <button data-fee="${feeId}" onclick="requestPaymentWithScreenshot('${feeId}')"
              style="background:linear-gradient(135deg,#D4A017,#B5872A);color:#2C1608;border:none;padding:10px 22px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;box-shadow:0 4px 12px rgba(212,160,23,0.25);width:100%;">
        📤 I Have Paid
      </button>
    </div>`;
}

/* ── GURU NOTES ── */
async function loadGuruNotes(studentId) {
  const container = document.getElementById('detailsNotesContainer');
  if (!container) return;
  try {
    const res = await fetch(`${API_BASE}/api/feedback/student/${studentId}`);
    if (!res.ok) { container.innerHTML = '<p style="padding:20px;color:#D32F2F;">Failed to load notes.</p>'; return; }
    const notes = await res.json();
    if (notes.length === 0) { container.innerHTML = '<p style="padding:20px;color:#666;">No guru notes yet.</p>'; return; }
    container.innerHTML = notes.map((n, i) => {
      const dateStr  = new Date(n.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const isGlobal = n.isGlobal;
      const newBadge = i === 0 ? `<span style="background:linear-gradient(135deg,#D4A017,#B5872A);color:#2C1608;font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;margin-left:10px;letter-spacing:0.3px;">New</span>` : '';
      const globalBadge = isGlobal ? `<span style="display:inline-block;background:linear-gradient(135deg,rgba(255,224,178,0.9),rgba(255,204,128,0.7));color:#E65100;font-size:11px;font-weight:700;padding:3px 10px;border-radius:10px;margin-bottom:8px;border:1px solid rgba(255,183,77,0.4);">Class Note</span><br>` : '';
      const borderColor = isGlobal ? '#FFB74D' : '#D4A017';
      return `
        <div style="
          background:linear-gradient(135deg,rgba(255,255,255,0.98),rgba(253,248,242,0.85));
          border-radius:14px;
          padding:20px 24px;
          margin-bottom:14px;
          border:1px solid rgba(255,255,255,0.7);
          border-left:4px solid ${borderColor};
          box-shadow:0 8px 24px rgba(63,26,18,0.04),inset 0 1px 0 rgba(255,255,255,1);
          transition:transform 0.3s ease,box-shadow 0.3s ease;
          animation:slideUpFade 0.5s ease ${i * 0.08}s backwards;
        " onmouseenter="this.style.transform='translateY(-3px)';this.style.boxShadow='0 14px 36px rgba(63,26,18,0.08)'" onmouseleave="this.style.transform='';this.style.boxShadow='0 8px 24px rgba(63,26,18,0.04),inset 0 1px 0 rgba(255,255,255,1)'">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
            <p style="font-size:11px;color:#8C6A52;text-transform:uppercase;letter-spacing:0.8px;margin:0;">${globalBadge}${dateStr}</p>
            ${newBadge}
          </div>
          <p style="font-size:14px;color:#2C1608;line-height:1.75;margin:0;">${n.noteText}</p>
        </div>`;
    }).join('');
  } catch (err) {
    container.innerHTML = '<p style="padding:20px;color:#D32F2F;">Error loading notes.</p>';
  }
}
