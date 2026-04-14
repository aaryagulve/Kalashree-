// teacher-dashboard.js
var API_BASE = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', async function () {
  await Promise.all([
    loadOverviewStats(),
    loadPracticeChart(),
    loadTeacherInsights(),
    loadUpcomingEvents()
  ]);
});

// Animation function to count up numbers
function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.innerHTML = end; // Ensure exact final number
    }
  };
  window.requestAnimationFrame(step);
}

// Fetch dynamic overview stats
async function loadOverviewStats() {
  try {
    // 1. Total Students (Active only)
    const studentRes = await fetch(API_BASE + '/api/students');
    const students = await studentRes.json();
    const activeStudents = students.filter(s => !s.status || s.status === 'Active');
    const totalStudents = activeStudents.length;
    animateValue(document.getElementById('totalStudents'), 0, totalStudents, 1500);
    // Update hint to show active count
    const totalHint = document.querySelector('#totalStudents')?.closest('.card')?.querySelector('.card-hint');
    if (totalHint) totalHint.textContent = `${totalStudents} active in class`;

    // 2. Attendance Today
    const attRes = await fetch(API_BASE + '/api/attendance/today');
    const attendance = await attRes.json();
    const presents = attendance.filter(a => a.status === 'Present').length;
    animateValue(document.getElementById('attendanceToday'), 0, presents, 1500);

    // 3. Fee Defaulters
    const feeRes = await fetch(API_BASE + '/api/fee/all');
    const feeRecords = await feeRes.json();
    let defaulters = 0;
    const today = new Date();
    feeRecords.forEach(f => {
      const due = f.dueDate ? new Date(f.dueDate) : null;
      if (f.status === 'Unpaid' && due && due < today) defaulters++;
    });
    animateValue(document.getElementById('feeDefaulters'), 0, defaulters, 1500);
    const feeQuickSub = document.getElementById('feeQuickSub');
    if (feeQuickSub) feeQuickSub.textContent = defaulters === 0 ? 'All fees up to date' : `${defaulters} defaulter${defaulters !== 1 ? 's' : ''} this month`;

    // 4. Total Submissions (Pending Review)
    const hwRes = await fetch(API_BASE + '/api/homework?filter=pending');
    const homework = await hwRes.json();
    animateValue(document.getElementById('ragasMastered'), 0, homework.length, 1500);

  } catch (err) {
    console.error('Error fetching overview stats:', err);
  }
}

async function loadPracticeChart() {
  try {
    const res = await fetch(API_BASE + '/api/practice/stats/weekly');
    if (res.ok) {
      const data = await res.json();
      renderChart(data.labels, data.dayCounts);
    }
  } catch (err) {
    console.error('Error fetching chart data', err);
  }
}

function renderChart(labels, dataArr) {
  const ctx = document.getElementById('practiceChart').getContext('2d');
  const hasData = dataArr.some(v => v > 0);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Students Practiced',
        data: dataArr,
        backgroundColor: dataArr.map((_v, i) =>
          i === dataArr.length - 1 ? 'rgba(181, 87, 42, 0.85)' : 'rgba(74, 155, 111, 0.65)'
        ),
        borderColor: dataArr.map((_v, i) =>
          i === dataArr.length - 1 ? '#B5572A' : '#4A9B6F'
        ),
        borderWidth: 1,
        borderRadius: 6,
        hoverBackgroundColor: 'rgba(74, 155, 111, 0.9)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#3D1A08',
          titleFont: { family: "'Source Sans 3', sans-serif", size: 13 },
          bodyFont: { family: "'Source Sans 3', sans-serif", size: 13 },
          padding: 12,
          cornerRadius: 6,
          displayColors: false,
          callbacks: {
            label: ctx => `${ctx.parsed.y} student${ctx.parsed.y !== 1 ? 's' : ''} practiced`
          }
        },
        ...(hasData ? {} : {
          // Show "no data" annotation when all zeros
        })
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            font: { family: "'Source Sans 3', sans-serif", size: 12 }
          },
          grid: { color: '#F0E4D6' },
          title: {
            display: true,
            text: 'Students',
            font: { family: "'Source Sans 3', sans-serif", size: 11 },
            color: '#8C6A52'
          }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: "'Source Sans 3', sans-serif", size: 12 } }
        }
      }
    }
  });

  // Show "no data yet" message if all zeros
  if (!hasData) {
    const container = document.querySelector('.chart-container');
    const msg = document.createElement('p');
    msg.style.cssText = 'text-align:center; color:#B0907A; font-size:13px; margin-top:-200px; position:relative;';
    msg.textContent = 'No practice sessions recorded this week yet.';
    container.appendChild(msg);
  }
}

async function loadTeacherInsights() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(API_BASE + '/api/dashboard/teacher-insights', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const d = await res.json();

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('tiTotal',      d.total);
    set('tiAvgAtt',     d.avgAttPct + '%');
    set('tiAvgSub',     d.avgSubmissions);
    set('tiNeedsCount', d.needsAttention.length);

    // Needs attention list
    const needsList = document.getElementById('tiNeedsList');
    if (needsList) {
      if (d.needsAttention.length === 0) {
        needsList.innerHTML = '<p style="color:#2E7D32;font-size:13px;">All students practiced recently 🎉</p>';
      } else {
        needsList.innerHTML = d.needsAttention.map(s => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #F0E4D6;">
            <div>
              <p style="font-size:13.5px;font-weight:600;color:#1E0A02;margin:0;">${s.name}</p>
              <p style="font-size:11.5px;color:#B0907A;margin:0;">Attendance: ${s.attPct}%</p>
            </div>
            <span style="font-size:11px;background:#FEEBEE;color:#C62828;padding:3px 10px;border-radius:12px;font-weight:600;">No practice</span>
          </div>`).join('');
      }
    }

    // Top students list
    const topList = document.getElementById('tiTopList');
    if (topList) {
      if (d.topStudents.length === 0) {
        topList.innerHTML = '<p style="color:#B0907A;font-size:13px;">No data yet.</p>';
      } else {
        const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
        topList.innerHTML = d.topStudents.map((s, i) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #F0E4D6;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:18px;">${medals[i] || '•'}</span>
              <div>
                <p style="font-size:13.5px;font-weight:600;color:#1E0A02;margin:0;">${s.name}</p>
                <p style="font-size:11.5px;color:#B0907A;margin:0;">${s.submissions} session${s.submissions !== 1 ? 's' : ''} this month</p>
              </div>
            </div>
            <span style="font-size:11px;background:#E6F4EA;color:#2E7D32;padding:3px 10px;border-radius:12px;font-weight:600;">🔥 ${s.streak}d streak</span>
          </div>`).join('');
      }
    }

  } catch (err) {
    console.error('Teacher insights error', err);
  }
}

async function loadUpcomingEvents() {
  const container = document.getElementById('teacherEventSummary');
  if (!container) return;
  try {
    const res = await fetch(API_BASE + '/api/events');
    if (!res.ok) { container.innerHTML = '<p style="color:#B0907A;font-size:13px;">Failed to load events.</p>'; return; }
    const events = await res.json();

    const now  = new Date(); now.setHours(0,0,0,0);
    const in7  = new Date(now); in7.setDate(now.getDate() + 7);

    const soon = events.filter(ev => {
      const d = new Date(ev.date); d.setHours(0,0,0,0);
      return d >= now && d <= in7;
    });

    if (soon.length === 0) {
      container.innerHTML = `
        <div style="background:rgba(255,255,255,0.75);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.6);border-radius:12px;padding:18px 22px;color:#B0907A;font-size:13px;font-style:italic;">
          No events in the next 7 days.
          <a href="teacher-events.html" style="color:#B5572A;font-weight:600;margin-left:8px;text-decoration:none;">Create one →</a>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div style="background:rgba(255,255,255,0.82);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,0.7);border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(90,40,10,0.07);">
        <div style="padding:14px 20px;background:#FDF6EE;border-bottom:1px solid #EAD9C8;display:flex;justify-content:space-between;align-items:center;">
          <p style="font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;color:#1E0A02;margin:0;">🗓 ${soon.length} event${soon.length !== 1 ? 's' : ''} this week</p>
          <a href="teacher-events.html" style="font-size:12px;color:#B5572A;font-weight:600;text-decoration:none;">Manage →</a>
        </div>
        ${soon.map(ev => {
          const evDate = new Date(ev.date); evDate.setHours(0,0,0,0);
          const diffDays = Math.round((evDate - now) / (1000*60*60*24));
          const dateStr  = evDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

          let badge, badgeStyle;
          if (diffDays === 0) {
            badge = 'Today'; badgeStyle = 'background:#FEEBEE;color:#C62828;';
          } else if (diffDays === 1) {
            badge = 'Tomorrow'; badgeStyle = 'background:#FFF3E0;color:#E65100;';
          } else {
            badge = `In ${diffDays}d`; badgeStyle = 'background:#E3F2FD;color:#1565C0;';
          }

          const mandatory = ev.isMandatory ? '<span style="font-size:10px;background:#FEEBEE;color:#C62828;padding:2px 6px;border-radius:8px;margin-left:6px;font-weight:700;">Mandatory</span>' : '';

          return `
            <div style="display:flex;align-items:center;gap:14px;padding:12px 20px;border-bottom:1px solid #F5EDE0;">
              <div style="flex:1;">
                <p style="font-size:13.5px;font-weight:600;color:#1E0A02;margin:0 0 2px;">${ev.title}${mandatory}</p>
                <p style="font-size:12px;color:#9C7A62;margin:0;">${dateStr} · ${ev.type}${ev.feeAmount > 0 ? ' · ₹' + ev.feeAmount : ' · Free'}</p>
              </div>
              <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:10px;${badgeStyle}">${badge}</span>
            </div>`;
        }).join('')}
      </div>`;
  } catch (err) {
    console.error('Upcoming events error', err);
  }
}
