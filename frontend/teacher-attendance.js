







var attendanceData = {};


var allStudents = [];


function markAttendance(studentId, status, cardEl) {
  
  if (attendanceData[studentId]) {
    delete attendanceData[studentId];
  }
  
  attendanceData[studentId] = {
    status: status, 
    studentName: cardEl.getAttribute('data-student-name'),
  };

  
  var presentBtn = cardEl.querySelector('.btn-present');
  var absentBtn = cardEl.querySelector('.btn-absent');

  
  if (status === 'Present') {
    presentBtn.classList.add('selected');
    absentBtn.classList.remove('selected');

    cardEl.classList.add('marked-present');
    cardEl.classList.remove('marked-absent');
  } else {
    absentBtn.classList.add('selected');
    presentBtn.classList.remove('selected');

    cardEl.classList.add('marked-absent');
    cardEl.classList.remove('marked-present');
  }
}


function createCard(student, index) {
  
  var card = document.createElement('div');
  card.className = 'attend-card';
  card.id = 'card-' + index;

  
  card.setAttribute('data-student-id', student._id);
  card.setAttribute('data-student-name', student.name);

  
  var initial = 'S';
  if (student.name && student.name.length > 0) {
    initial = student.name[0].toUpperCase();
  }

  
  var levelText = student.batchType || 'Regular Class';
  const expectedPerWeek = levelText === 'Gurukul Batch' ? 6 : 2;

  
  var avatarClass = 'av-blue';

  
  card.innerHTML = `
    <div class="card-top">
      <div class="avatar ${avatarClass}">${initial}</div>
      <div class="card-info">
        <p class="card-name">${student.name}</p>
        <p class="card-level">${levelText} · ${expectedPerWeek}×/week</p>
      </div>
    </div>

    <div class="card-percent">
      <p class="percent-num percent-green" id="percent-${student._id}">0%</p>
      <p class="percent-label">Overall Attendance</p>
    </div>

    <div class="card-btns">
      <button class="btn-present" type="button">Present</button>
      <button class="btn-absent" type="button">Absent</button>
    </div>
  `;

  
  var presentBtn = card.querySelector('.btn-present');
  var absentBtn = card.querySelector('.btn-absent');

  presentBtn.addEventListener('click', function () {
    markAttendance(student._id, 'Present', card);
  });

  absentBtn.addEventListener('click', function () {
    markAttendance(student._id, 'Absent', card);
  });

  return card;
}


async function saveAttendance() {
  try {
    
    var markedCount = Object.keys(attendanceData).length;

    
    if (markedCount < allStudents.length) {
      alert('Please mark attendance for all students before saving.');
      return;
    }

    
    for (var studentId in attendanceData) {
      var item = attendanceData[studentId];

      await fetch(API_BASE + '/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentId, 
          studentName: item.studentName, 
          status: item.status, 
          date: document.getElementById('attendanceDate').value 
        }),
      });
    }

    
    var successMsg = document.getElementById('saveSuccess');
    successMsg.style.display = 'block';

    
    setTimeout(function () {
      successMsg.style.display = 'none';
    }, 4000);
  } catch (err) {
    alert('Attendance save failed: ' + err.message);
  }
}


async function loadStudentsAndRender() {
  try {
    const response = await fetch(API_BASE + '/api/students');
    const data = await response.json();
    
    
    allStudents = (data || []).filter(function(s) {
      return !s.status || s.status === 'Active';
    });

    var grid = document.getElementById('attendanceGrid');
    grid.innerHTML = '';

    if (allStudents.length === 0) {
      grid.innerHTML = '<p>No active students found. Please add students first.</p>';
      return;
    }

    for (var i = 0; i < allStudents.length; i++) {
      var card = createCard(allStudents[i], i + 1);
      grid.appendChild(card);
    }
    
    
    const dateInput = document.getElementById('attendanceDate');
    if (dateInput && dateInput.value) {
      await fetchExistingAttendance(dateInput.value);
    }
  } catch (err) {
    alert('Attendance load failed: ' + err.message);
  }
}

async function fetchExistingAttendance(dateStr) {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/today?date=${dateStr}`);
    const records = await res.json();
    
    
    attendanceData = {};
    
    
    document.querySelectorAll('.attend-card').forEach(card => {
      card.classList.remove('marked-present', 'marked-absent');
      card.querySelector('.btn-present').classList.remove('selected');
      card.querySelector('.btn-absent').classList.remove('selected');
    });

    
    records.forEach(r => {
      const card = document.querySelector(`.attend-card[data-student-id="${r.studentId}"]`);
      if (card) {
        markAttendance(r.studentId, r.status, card);
      }
    });
  } catch (err) {
    console.error('Failed to fetch existing attendance', err);
  }
}


initDatePicker();
loadStudentsAndRender();
loadAttendanceSummary();


function initDatePicker() {
  var dateInput = document.getElementById('attendanceDate');
  var textStr = document.getElementById('selectedDateText');
  
  if(!dateInput) return;
  
  
  var today = new Date();
  var yyyy = today.getFullYear();
  var mm = String(today.getMonth() + 1).padStart(2, '0');
  var dd = String(today.getDate()).padStart(2, '0');
  dateInput.value = yyyy + '-' + mm + '-' + dd;
  
  function updateText() {
    var d = new Date(dateInput.value);
    if(isNaN(d)) return;
    var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    textStr.textContent = d.toLocaleDateString('en-GB', options);
    
    
    if (window.allStudents && window.allStudents.length > 0) {
      fetchExistingAttendance(dateInput.value);
    }
  }
  
  updateText();
  dateInput.addEventListener('change', updateText);
}


function exportAttendancePDF() {
  const element = document.getElementById('attendanceGrid');
  const opt = {
    margin:       0.5,
    filename:     'Attendance_Report.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
}


async function loadAttendanceSummary() {
  try {
    const [studentsRes, allAttRes] = await Promise.all([
      fetch(API_BASE + '/api/students'),
      fetch(API_BASE + '/api/attendance/today') 
    ]);

    const students = await studentsRes.json();
    const activeStudents = students.filter(s => !s.status || s.status === 'Active');
    if (activeStudents.length === 0) return;

    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    
    const allRecords = await Promise.all(
      activeStudents.map(s => fetch(`${API_BASE}/api/attendance/student/${s._id}`).then(r => r.json()))
    );

    
    const thisMonthRecords = allRecords.map(recs =>
      recs.filter(r => new Date(r.date) >= monthStart)
    );

    
    const uniqueDates = new Set();
    thisMonthRecords.forEach(recs => recs.forEach(r => {
      uniqueDates.add(new Date(r.date).toDateString());
    }));
    const classesThisMonth = uniqueDates.size;

    
    let totalPct = 0;
    let fullAttendanceCount = 0;
    thisMonthRecords.forEach(recs => {
      if (recs.length === 0) return;
      const present = recs.filter(r => r.status === 'Present').length;
      const pct = (present / recs.length) * 100;
      totalPct += pct;
      if (pct === 100) fullAttendanceCount++;
    });
    const avgPct = activeStudents.length > 0 ? Math.round(totalPct / activeStudents.length) : 0;

    
    activeStudents.forEach((s, i) => {
      const recs = allRecords[i];
      const total = recs.length;
      const present = recs.filter(r => r.status === 'Present').length;
      const pct = total === 0 ? 0 : Math.round((present / total) * 100);
      const el = document.getElementById('percent-' + s._id);
      if (el) {
        el.textContent = pct + '%';
        el.className = 'percent-num ' + (pct >= 75 ? 'percent-green' : 'percent-red');
      }
    });

    
    const classesEl = document.getElementById('summaryClassesMonth');
    const avgEl     = document.getElementById('summaryAvgAttendance');
    const fullEl    = document.getElementById('summaryFullAttendance');

    if (classesEl) classesEl.textContent = classesThisMonth;
    if (avgEl)     avgEl.innerHTML = avgPct + '<span class="summary-percent">%</span>';
    if (fullEl)    fullEl.innerHTML = fullAttendanceCount + ' <span class="summary-small">students</span>';

  } catch (err) {
    console.error('Summary load error', err);
  }
}
