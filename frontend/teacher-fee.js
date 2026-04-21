// teacher-fee.js
// This file connects your Fee Management page with backend APIs (so MongoDB gets updated).

// Backend base url (your backend runs on port 5000)

// Helper: format date nicely for the table
function formatDate(dateValue) {
  if (!dateValue) return '';
  var d = new Date(dateValue);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Helper: create fee table rows
async function renderFees(records) {
  var tbody = document.querySelector('.fee-table tbody');
  tbody.innerHTML = '';

  if (!records || records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">No fee records found for this month.</td></tr>';
    return;
  }
  try {
    // Calculate summary
    var totalExpected = 0, totalCollected = 0, paidCount = 0, unpaidCount = 0;
    records.forEach(function(fee) {
      totalExpected += fee.amount || 0;
      if (fee.status === 'Paid') { totalCollected += fee.amount || 0; paidCount++; }
      else unpaidCount++;
    });
    var totalPending = totalExpected - totalCollected;

    // Fetch total outstanding per student (for "forgetting" tracking)
    const [allUnpaidRes] = await Promise.all([
      fetch(`${API_BASE}/api/fee/defaulters`)
    ]);
    const allUnpaid = await allUnpaidRes.json();
    
    // Create a map of studentId -> totalOwed
    const debtMap = {};
    allUnpaid.forEach(f => {
      debtMap[f.studentId] = (debtMap[f.studentId] || 0) + f.amount;
    });

    var expEl   = document.getElementById('feeExpected');
    var colEl   = document.getElementById('feeCollected');
    var penEl   = document.getElementById('feePending');
    var colHint = document.getElementById('feeCollectedHint');
    var penHint = document.getElementById('feePendingHint');

    if (expEl)   expEl.innerHTML  = '&#8377; ' + totalExpected.toLocaleString('en-IN');
    if (colEl)   colEl.innerHTML  = '&#8377; ' + totalCollected.toLocaleString('en-IN');
    if (penEl)   penEl.innerHTML  = '&#8377; ' + totalPending.toLocaleString('en-IN');
    if (colHint) colHint.textContent = paidCount + ' student' + (paidCount !== 1 ? 's' : '') + ' paid';
    if (penHint) penHint.textContent = unpaidCount + ' student' + (unpaidCount !== 1 ? 's' : '') + ' unpaid';

    // Build each row
    records.forEach(function(fee) {
      var row = document.createElement('tr');
      row.id = 'row-' + fee._id;

      var dueDate  = fee.dueDate ? new Date(fee.dueDate) : null;
      var today    = new Date();
      var isOverdue = fee.status === 'Unpaid' && dueDate && dueDate < today;

      if (isOverdue) row.className = 'row-overdue';
      else if (fee.status === 'Unpaid') row.className = 'row-unpaid';

      var initial = fee.studentName ? fee.studentName[0].toUpperCase() : 'S';

      var badgeHtml = '';
      if (fee.status === 'Paid') {
        badgeHtml = '<span class="badge badge-paid">Paid</span>';
      } else if (fee.paymentStatus === 'Payment Requested' || fee.status === 'Payment Requested') {
        badgeHtml = '<span class="badge" style="background:#FFF3E0;color:#E65100;">Requested</span>';
      } else {
        badgeHtml = isOverdue
          ? '<span class="badge badge-overdue">Overdue</span>'
          : '<span class="badge badge-unpaid">Unpaid</span>';
      }

      var actionHtml = '';
      if (fee.status === 'Paid') {
        actionHtml = '<span class="td-paid-check">&#10003; Received</span>';
      } else if (fee.paymentStatus === 'Payment Requested' || fee.status === 'Payment Requested') {
        actionHtml = '<span style="color:#E65100;font-size:13px;font-weight:500;">Pending Confirmation</span>';
      } else {
        actionHtml = '<button class="mark-paid-btn" type="button" onclick="markPaid(\'' + fee._id + '\')">Mark as Paid</button>';
      }

      // Batch type and Cumulative debt
      var batchLabel = fee.batchType || 'Regular Class';
      var batchBadge = batchLabel === 'Gurukul Batch' ? 'badge-gurukul' : 'badge-regular';
      
      const totalOwed = debtMap[fee.studentId] || 0;
      const debtHtml = totalOwed > fee.amount 
        ? `<p style="font-size:11px;color:#D32F2F;font-weight:600;margin-top:2px;">Total Owed: ₹${totalOwed}</p>` 
        : '';

      var studentCellHtml =
        '<div class="student-cell">' +
        '<div class="avatar av-blue">' + initial + '</div>' +
        '<div><p class="student-name">' + (fee.studentName || '') + '</p>' + debtHtml + '</div>' +
        '</div>';

      const methodColor = fee.paymentMethod === 'Cash' ? '#D32F2F' : '#8C6A52';
      const methodWeight = fee.paymentMethod === 'Cash' ? '800' : '600';

      row.innerHTML =
        '<td>' + studentCellHtml + '</td>' +
        '<td><span class="badge ' + batchBadge + '">' + batchLabel + '</span></td>' +
        '<td class="td-fee">&#8377; ' + (fee.amount || 0) + '</td>' +
        '<td><span style="font-size:12px;font-weight:'+methodWeight+';color:'+methodColor+';">' + (fee.paymentMethod || '—') + '</span></td>' +
        '<td class="td-muted">' + formatDate(fee.dueDate) + '</td>' +
        '<td id="status-' + fee._id + '">' + badgeHtml + '</td>' +
        '<td id="action-' + fee._id + '">' + actionHtml + '</td>';

      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Render error', err);
  }
}

// Mark a fee as paid
async function markPaid(feeId) {
  try {
    // Call backend to update this fee record
    await fetch(API_BASE + '/api/fee/pay/' + feeId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // Reload table
    loadFees();
  } catch (err) {
    alert('Payment failed: ' + err.message);
  }
}

// Generate fees (safe - backend will skip if already generated) and load current month fees
async function loadFees() {
  try {
    // Generate fees for current month
    await fetch(API_BASE + '/api/fee/generate', { method: 'POST' });

    // Load available months for dropdown
    await loadMonthDropdown();

    // Get selected month from dropdown
    const monthFilter = document.getElementById('monthFilter');
    const selectedMonth = monthFilter ? monthFilter.value : '';

    // Update label
    const label = document.getElementById('currentMonthLabel');
    if (label) label.textContent = selectedMonth || 'current month';

    // Load fee records for selected month
    const url = selectedMonth
      ? `${API_BASE}/api/fee/all?month=${encodeURIComponent(selectedMonth)}`
      : `${API_BASE}/api/fee/all`;
    const response = await fetch(url);
    const data = await response.json();

    await renderFees(data);
    loadRequests();
  } catch (err) {
    alert('Fee load failed: ' + err.message);
  }
}

async function loadMonthDropdown() {
  const select = document.getElementById('monthFilter');
  if (!select || select.dataset.loaded) return;

  try {
    const res  = await fetch(API_BASE + '/api/fee/months');
    const months = await res.json();
    if (months.length === 0) return;

    select.innerHTML = months.map((m, i) =>
      `<option value="${m}" ${i === 0 ? 'selected' : ''}>${m}</option>`
    ).join('');
    select.dataset.loaded = '1';
  } catch (err) {
    console.error('Failed to load months', err);
  }
}

async function loadRequests() {
  try {
    var response = await fetch(API_BASE + '/api/fee/requests');
    var requests = await response.json();
    
    var titleEl = document.getElementById('requestsTitle');
    var wrapEl  = document.getElementById('requestsTableWrap');
    var tbody   = document.getElementById('requestsTbody');
    
    if (!titleEl || !wrapEl || !tbody) return;
    
    if (requests.length === 0) {
      titleEl.style.display = 'none';
      wrapEl.style.display  = 'none';
      return;
    }
    
    titleEl.style.display = 'block';
    wrapEl.style.display  = 'block';
    tbody.innerHTML = '';
    
    requests.forEach(function(fee) {
      var initial = fee.studentName ? fee.studentName[0].toUpperCase() : 'S';
      var dateHtml = formatDate(fee.paymentRequestDate) || 'Unknown';

      const isCash = fee.paymentMethod === 'Cash';
      const methodStyle = isCash 
        ? 'background:#FFEBEE; color:#D32F2F; border:1px solid #FFCDD2; font-weight:800; padding:4px 8px; border-radius:6px;'
        : 'color:#7A3210; font-weight:700;';

      var screenshotHtml = fee.screenshotPath
        ? `<img src="${API_BASE}/uploads/screenshots/${fee.screenshotPath}"
               style="width:48px;height:48px;border-radius:8px;object-fit:cover;cursor:pointer;border:1.5px solid rgba(212,160,23,0.3);transition:transform 0.2s;"
               onclick="window.open('${API_BASE}/uploads/screenshots/${fee.screenshotPath}','_blank')"
               onmouseenter="this.style.transform='scale(1.15)'" onmouseleave="this.style.transform=''"
               title="View full screenshot" />`
        : (isCash ? '<span style="font-size:12px;color:#D32F2F;font-weight:700;">💸 CASH</span>' : '<span style="font-size:12px;color:#C4A88C;">No screenshot</span>');

      var studentCellHtml =
        '<div class="student-cell">' +
        '<div class="avatar av-amber">' + initial + '</div>' +
        '<div><p class="student-name">' + (fee.studentName || '') + '</p></div>' +
        '</div>';

      var actionHtml =
        '<button class="mark-paid-btn" style="background:linear-gradient(135deg,#4A9B6F,#2E7D52);color:#fff;margin-right:6px;" onclick="confirmPayment(\'' + fee._id + '\')">✓ Confirm</button>' +
        '<button class="mark-paid-btn" style="background:linear-gradient(135deg,#D32F2F,#B71C1C);color:#fff;" onclick="rejectPayment(\'' + fee._id + '\')">✗ Reject</button>';

      tbody.innerHTML +=
        '<tr>' +
        '<td><input type="checkbox" class="request-checkbox" value="' + fee._id + '" /></td>' +
        '<td>' + studentCellHtml + '</td>' +
        '<td>' + fee.month + '</td>' +
        '<td class="td-fee">₹ ' + fee.amount + '</td>' +
        '<td><span style="font-size:12px;font-weight:700;color:#7A3210;">' + (fee.paymentMethod || 'UPI') + '</span></td>' +
        '<td class="td-muted">' + dateHtml + '</td>' +
        '<td>' + screenshotHtml + '</td>' +
        '<td>' + actionHtml + '</td>' +
        '</tr>';
    });

  } catch (err) {
    console.error('Failed to load requests:', err);
  }
}

function toggleSelectAll(masterCb) {
  document.querySelectorAll('.request-checkbox').forEach(cb => cb.checked = masterCb.checked);
}

async function confirmAllSelected() {
  var checked = Array.from(document.querySelectorAll('.request-checkbox:checked')).map(cb => cb.value);
  if (checked.length === 0) { alert('Please select at least one payment to confirm.'); return; }
  if (!confirm(`Confirm ${checked.length} payment(s)?`)) return;
  try {
    const res = await fetch(API_BASE + '/api/fee/confirm-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: checked })
    });
    const data = await res.json();
    if (res.ok) { loadFees(); }
    else alert('Error: ' + data.message);
  } catch (err) {
    alert('Failed to confirm payments.');
  }
}

async function confirmPayment(feeId) {
  try {
    await fetch(API_BASE + '/api/fee/confirm/' + feeId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    loadFees();
  } catch (err) {
    alert('Failed to confirm: ' + err.message);
  }
}

async function rejectPayment(feeId) {
  try {
    await fetch(API_BASE + '/api/fee/reject/' + feeId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    loadFees();
  } catch (err) {
    alert('Failed to reject: ' + err.message);
  }
}

// Run when page opens
loadFees();

// PDF Export logic
function exportFeePDF() {
  const element = document.querySelector('.table-wrap');
  const opt = {
    margin:       0.5,
    filename:     'Fee_Report.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'landscape' }
  };
  html2pdf().set(opt).from(element).save();
}