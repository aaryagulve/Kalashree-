var studentId = localStorage.getItem('userId');
var _currentFeeId = null;

document.addEventListener('DOMContentLoaded', function () {
  if (!studentId) return;
  loadFeeData();
});

async function loadFeeData() {
  try {
    // Generate fees for current month first
    await fetch(`${API_BASE}/api/fee/generate`, { method: 'POST' });

    const res = await fetch(`${API_BASE}/api/fee/student/${studentId}`);
    if (!res.ok) return;
    const fees = await res.json();

    renderCurrentFeeInfo(fees);
    renderFeeHistory(fees);
  } catch (err) {
    console.error('Fee load error', err);
  }
}

function renderCurrentFeeInfo(fees) {
  const now = new Date();
  const currentMonth = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const current = fees.find(f => f.month === currentMonth) || fees[0];

  const infoEl = document.getElementById('currentFeeInfo');
  const btn    = document.getElementById('iHavePaidBtn');

  if (!current) {
    infoEl.innerHTML = '<p style="font-size:13px;color:#8C6A52;">No fee record for this month.</p>';
    return;
  }

  _currentFeeId = current._id;

  const isOverdue = current.status === 'Unpaid' && current.dueDate && new Date(current.dueDate) < now;
  const statusColor = current.status === 'Paid' ? '#2E7D32' : isOverdue ? '#C62828' : '#E65100';

  infoEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div>
        <p style="font-size:15px;font-weight:700;color:#1A0D05;margin:0;">${current.month}</p>
        <p style="font-size:13px;color:#8C6A52;margin:2px 0 0;">Due: ${current.dueDate ? new Date(current.dueDate).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '—'}</p>
      </div>
      <div style="text-align:right;">
        <p style="font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:#1A0D05;margin:0;">₹ ${current.amount || 0}</p>
        <p style="font-size:12px;font-weight:600;color:${statusColor};margin:2px 0 0;">${current.status}</p>
      </div>
    </div>`;

  // Enable button only if unpaid or rejected
  const canPay = current.status === 'Unpaid' || current.paymentStatus === 'Rejected';
  btn.disabled = !canPay;
  if (current.paymentStatus === 'Payment Requested') {
    btn.textContent = '⏳ Awaiting Confirmation';
    btn.disabled = true;
  } else if (current.status === 'Paid') {
    btn.textContent = '✅ Paid';
    btn.disabled = true;
  } else {
    btn.textContent = '💳 I Have Paid';
  }
}

function renderFeeHistory(fees) {
  const tbody = document.getElementById('feeHistoryBody');
  if (!fees || fees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#B0907A;">No fee records found.</td></tr>';
    return;
  }

  const now = new Date();
  tbody.innerHTML = fees.map(fee => {
    const isOverdue = fee.status === 'Unpaid' && fee.dueDate && new Date(fee.dueDate) < now;
    let badgeClass = 'fee-badge-unpaid';
    let badgeText  = fee.status;
    if (fee.status === 'Paid')                          { badgeClass = 'fee-badge-paid'; }
    else if (fee.paymentStatus === 'Payment Requested') { badgeClass = 'fee-badge-requested'; badgeText = 'Requested'; }
    else if (fee.paymentStatus === 'Rejected')          { badgeClass = 'fee-badge-rejected'; badgeText = 'Rejected'; }
    else if (isOverdue)                                 { badgeClass = 'fee-badge-overdue'; badgeText = 'Overdue'; }

    const dueStr  = fee.dueDate  ? new Date(fee.dueDate).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—';
    const paidStr = fee.paidDate ? new Date(fee.paidDate).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '';

    const screenshotHtml = fee.screenshotPath
      ? `<img src="${API_BASE}/uploads/screenshots/${fee.screenshotPath}" class="screenshot-thumb" onclick="viewScreenshot('${API_BASE}/uploads/screenshots/${fee.screenshotPath}')" title="View screenshot" />`
      : '<span style="color:#C4A88C;font-size:12px;">—</span>';

    // Action: show "Pay Now" button for unpaid/rejected
    const canPay = fee.status === 'Unpaid' || fee.paymentStatus === 'Rejected';
    const actionHtml = canPay
      ? `<button onclick="openPayModalFor('${fee._id}')" style="padding:6px 14px;background:linear-gradient(135deg,#D4A017,#B5872A);color:#2C1608;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;">Pay Now</button>`
      : (paidStr ? `<span style="font-size:12px;color:#2E7D32;">Paid ${paidStr}</span>` : '—');

    return `
      <tr>
        <td style="font-weight:600;">${fee.month}</td>
        <td style="font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;">₹ ${fee.amount || 0}</td>
        <td style="color:#8C6A52;">${dueStr}</td>
        <td><span class="fee-badge ${badgeClass}">${badgeText}</span></td>
        <td>${screenshotHtml}</td>
        <td>${actionHtml}</td>
      </tr>`;
  }).join('');
}

/* ── MODAL ── */
function openPayModal() {
  if (!_currentFeeId) return;
  openPayModalFor(_currentFeeId);
}

function openPayModalFor(feeId) {
  _currentFeeId = feeId;
  document.getElementById('payModal').style.display = 'flex';
  document.getElementById('screenshotPreviewImg').style.display = 'none';
  document.getElementById('screenshotPlaceholder').style.display = 'block';
  document.getElementById('screenshotInput').value = '';
  document.getElementById('payModalMsg').textContent = '';
  // Reset method to UPI
  togglePayMethod('UPI');
  const radios = document.getElementsByName('payMethod');
  if (radios.length) radios[0].checked = true;
}

function togglePayMethod(method) {
  const upiDiv = document.getElementById('methodUPI');
  const cashDiv = document.getElementById('methodCash');
  const uploadArea = document.getElementById('screenshotPreviewArea');

  if (method === 'Cash') {
    upiDiv.style.border = '1.5px solid #E2CEBC';
    upiDiv.style.background = '#fff';
    upiDiv.style.color = '#9C7A62';
    upiDiv.style.fontWeight = '400';

    cashDiv.style.border = '1.5px solid #D4A017';
    cashDiv.style.background = 'rgba(212,160,23,0.08)';
    cashDiv.style.color = '#7A3210';
    cashDiv.style.fontWeight = '600';

    uploadArea.style.opacity = '0.4';
    uploadArea.style.pointerEvents = 'none';
  } else {
    cashDiv.style.border = '1.5px solid #E2CEBC';
    cashDiv.style.background = '#fff';
    cashDiv.style.color = '#9C7A62';
    cashDiv.style.fontWeight = '400';

    upiDiv.style.border = '1.5px solid #D4A017';
    upiDiv.style.background = 'rgba(212,160,23,0.08)';
    upiDiv.style.color = '#7A3210';
    upiDiv.style.fontWeight = '600';

    uploadArea.style.opacity = '1';
    uploadArea.style.pointerEvents = 'auto';
  }
}

function closePayModal() {
  document.getElementById('payModal').style.display = 'none';
}

function previewScreenshot(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('screenshotPreviewImg').src = ev.target.result;
    document.getElementById('screenshotPreviewImg').style.display = 'block';
    document.getElementById('screenshotPlaceholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function submitPayment() {
  const file = document.getElementById('screenshotInput').files[0];
  const btn  = document.getElementById('submitPayBtn');
  const msg  = document.getElementById('payModalMsg');
  
  const methodRadios = document.getElementsByName('payMethod');
  let selectedMethod = 'UPI';
  for (const r of methodRadios) { if(r.checked) selectedMethod = r.value; }

  if (selectedMethod === 'UPI' && !file) {
    msg.style.color = '#D32F2F';
    msg.textContent = 'Please upload a payment screenshot for UPI.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Submitting...';
  msg.textContent = '';

  try {
    const fd = new FormData();
    fd.append('paymentMethod', selectedMethod);
    if (file) fd.append('screenshot', file);

    const res = await fetch(`${API_BASE}/api/fee/request/${_currentFeeId}`, {
      method: 'PUT',
      body: fd
    });

    const data = await res.json();
    if (res.ok) {
      msg.style.color = '#2E7D32';
      msg.textContent = '✓ Payment submitted! Awaiting teacher confirmation.';
      setTimeout(() => { closePayModal(); loadFeeData(); }, 1800);
    } else {
      msg.style.color = '#D32F2F';
      msg.textContent = data.message || 'Submission failed.';
    }
  } catch (err) {
    msg.style.color = '#D32F2F';
    msg.textContent = 'Server error. Make sure backend is running.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Payment';
  }
}

function viewScreenshot(url) {
  window.open(url, '_blank');
}

// Close modal on backdrop click
document.getElementById('payModal').addEventListener('click', function(e) {
  if (e.target === this) closePayModal();
});

/* ── QR LIGHTBOX ── */
function openQRLightbox() {
  const lb  = document.getElementById('qrLightbox');
  const img = document.getElementById('qrLightboxImg');
  // Sync src from the small QR image
  const src = document.getElementById('teacher-qr-code').src;
  if (img && src) img.src = src;
  if (lb) {
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeQRLightbox() {
  const lb = document.getElementById('qrLightbox');
  if (lb) lb.style.display = 'none';
  document.body.style.overflow = '';
}

// Close with Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeQRLightbox();
});
