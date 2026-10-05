/**
 * Unique-Notify Super Admin Console — JavaScript Controller
 * Complete rewrite with sidebar navigation, user detail modal tabs, anti-ban control.
 */

const TOKEN_KEY = 'un_admin_token';
let currentAdmin = null;
let activeUserId = null;
let allPlans = [];

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  updateClock();
  setInterval(updateClock, 1000);
  checkSession();
});

function updateClock() {
  const el = document.getElementById('currentTime');
  if (el) el.textContent = new Date().toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

/* ═══════════════════════════════════════════
   SESSION / AUTH
═══════════════════════════════════════════ */
function getToken() { return localStorage.getItem(TOKEN_KEY); }

async function checkSession() {
  const token = getToken();
  if (!token) { showAuth(); return; }
  try {
    const res = await fetch('/api/admin/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
    if (res.ok) {
      const data = await res.json();
      currentAdmin = data.admin;
      showApp();
      gotoPage('overview');
    } else { clearSession(); showAuth(); }
  } catch { clearSession(); showAuth(); }
}

function clearSession() { localStorage.removeItem(TOKEN_KEY); currentAdmin = null; }

function showAuth() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('adminApp').classList.add('hidden');
  lucide.createIcons();
}

function showApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('adminApp').classList.remove('hidden');
  if (currentAdmin) {
    document.getElementById('sidebarAdminName').textContent = currentAdmin.name || 'Administrator';
    document.getElementById('sidebarAdminEmail').textContent = currentAdmin.email || '';
  }
  lucide.createIcons();
}

async function doAdminLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn      = document.getElementById('loginBtn');
  const alert    = document.getElementById('authAlert');

  alert.className = 'hidden';
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner">&#8635;</span> Verifying...';

  try {
    const res  = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      localStorage.setItem(TOKEN_KEY, data.token);
      currentAdmin = data.admin;
      showApp();
      gotoPage('overview');
    } else {
      alert.className = 'mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-400/20 text-rose-200 text-sm';
      alert.textContent = data.message || 'Authentication failed.';
    }
  } catch {
    alert.className = 'mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-400/20 text-rose-200 text-sm';
    alert.textContent = 'Cannot connect to server.';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i><span>Sign In to Admin Console</span>';
    lucide.createIcons();
  }
}

function doLogout() {
  if (!confirm('End administrative session?')) return;
  clearSession();
  showAuth();
}

/* ═══════════════════════════════════════════
   ADMIN API HELPER
═══════════════════════════════════════════ */
async function api(path, opts = {}) {
  const res = await fetch('/api/admin' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken(), ...(opts.headers||{}) }
  });
  if (res.status === 401 || res.status === 403) {
    showToast('Session expired. Please log in again.', 'error');
    clearSession(); showAuth();
    throw new Error('Unauthorized');
  }
  return res.json();
}

/* ═══════════════════════════════════════════
   SIDEBAR NAVIGATION
═══════════════════════════════════════════ */
const PAGE_META = {
  overview:        { title: 'Dashboard Overview',             sub: 'SaaS platform status and recent activity' },
  users:           { title: 'Client Accounts',                sub: 'Manage clients, plans, credits, and account status' },
  payments:        { title: 'Payments & Billing Approvals',   sub: 'Review and approve offline payment transactions' },
  gateways:        { title: 'Gateway Engine Status',          sub: 'Monitor Meta Cloud API and Baileys QR sessions' },
  smsgateways:     { title: 'Third-Party SMS Gateways',       sub: 'Super Admin only: Greenweb, BulkSMSBD, Custom HTTP' },
  smsdevices:      { title: 'Android Mobile Nodes & Sender IDs', sub: 'Configure SIM Sender IDs and allocate Shared/Dedicated gateways' },
  smsbilling:      { title: 'SMS Pricing & Package Plans',    sub: 'Set Pay-as-you-go rate (৳0.35) and create SMS bundles' },
  smsusers:        { title: 'User SMS Wallets',               sub: 'Monitor client cash balance, SMS credits, and rates' },
  smstransactions: { title: 'SMS Top-up & Package Approvals', sub: 'Review pending client mobile recharge requests' },
  audit:           { title: 'Security Audit Logs',            sub: 'Immutable log of all security events' },
  antiban:         { title: 'Anti-Ban Engine Configuration',  sub: 'Global WhatsApp safety parameters for all clients' },
  settings:        { title: 'Payment Channels & System Settings', sub: 'bKash, Nagad, Rocket, Bank transfer details' },
  plans:           { title: 'Subscription Plans',             sub: 'Active SaaS pricing tiers overview' },
};

function gotoPage(name) {
  // Update nav links for light theme
  document.querySelectorAll('.sidebar-link').forEach(l => {
    l.classList.remove('active', 'text-emerald-700', 'bg-emerald-50', 'font-semibold', 'border-l-2', 'border-emerald-600');
    l.classList.add('text-slate-600');
  });
  const activeLink = document.getElementById('nav-' + name);
  if (activeLink) {
    activeLink.classList.add('active', 'text-emerald-700', 'bg-emerald-50', 'font-semibold', 'border-l-2', 'border-emerald-600');
    activeLink.classList.remove('text-slate-600');
  }

  // Show/hide pages
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.remove('active');
    c.style.display = 'none';
  });
  const page = document.getElementById('page-' + name);
  if (page) { page.classList.add('active'); page.style.display = 'block'; }

  // Update header
  const meta = PAGE_META[name] || {};
  document.getElementById('pageTitle').textContent    = meta.title || name;
  document.getElementById('pageSubtitle').textContent = meta.sub || '';

  // Load data for page
  const loaders = {
    overview:        loadOverview,
    users:           loadUsers,
    payments:        loadPayments,
    gateways:        loadGateways,
    smsgateways:     loadSmsGateways,
    smsdevices:      loadAdminSmsDevices,
    smsbilling:      loadSmsBilling,
    smsusers:        loadSmsUsers,
    smstransactions: loadSmsTransactions,
    audit:           loadAuditLogs,
    antiban:         loadAntiBanSettings,
    settings:        loadSettings,
    plans:           loadPlans,
  };
  if (loaders[name]) loaders[name]();

  lucide.createIcons();
}

/* ═══════════════════════════════════════════
   OVERVIEW
═══════════════════════════════════════════ */
async function loadOverview() {
  try {
    const d = await api('/overview');
    if (!d.success) return;
    const m = d.metrics;
    document.getElementById('ov-totalUsers').textContent        = fmt(m.totalUsers);
    document.getElementById('ov-activeUsers').textContent       = fmt(m.activeUsers);
    document.getElementById('ov-sentMessages').textContent      = fmt(m.sentMessages);
    document.getElementById('ov-totalMessages').textContent     = fmt(m.totalMessages);
    document.getElementById('ov-pendingPayments').textContent   = fmt(m.pendingPayments);
    document.getElementById('ov-totalRevenue').textContent      = 'BDT ' + fmt(m.totalRevenueBDT || 0);

    // Pending badge in sidebar
    const badge = document.getElementById('sidebarPaymentBadge');
    if (m.pendingPayments > 0) { badge.textContent = m.pendingPayments; badge.classList.remove('hidden'); }
    else                       { badge.classList.add('hidden'); }

    const tbody = document.getElementById('ov-auditTbody');
    tbody.innerHTML = '';
    (d.recentLogs || []).forEach(l => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50/50';
      tr.innerHTML = `
        <td class="py-2.5 px-4 text-slate-400">${fmtDate(l.created_at)}</td>
        <td class="py-2.5 px-4 font-semibold text-slate-900 font-sans">${esc(l.action)}</td>
        <td class="py-2.5 px-4 text-slate-600">${esc(l.user_email || 'Anon')} <span class="text-slate-400">/ ${esc(l.ip_address || '-')}</span></td>
        <td class="py-2.5 px-4 text-slate-500 max-w-xs truncate" title="${esc(l.details||'')}">${esc(l.details || '-')}</td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  } catch (err) { console.error(err); }
}

/* ═══════════════════════════════════════════
   CLIENT ACCOUNTS
═══════════════════════════════════════════ */
async function loadUsers() {
  const search = document.getElementById('userSearchInput')?.value || '';
  const status = document.getElementById('userStatusFilter')?.value || '';
  try {
    let qs = [];
    if (search) qs.push('search=' + encodeURIComponent(search));
    if (status) qs.push('status=' + encodeURIComponent(status));
    const d = await api('/users' + (qs.length ? '?' + qs.join('&') : ''));
    if (!d.success) return;

    const tbody = document.getElementById('usersTbody');
    tbody.innerHTML = '';
    if (!d.users.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400">No clients found.</td></tr>`;
      return;
    }

    d.users.forEach(u => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50/60 transition cursor-pointer';
      tr.onclick = () => openUserModal(u.id);
      tr.innerHTML = `
        <td class="py-3 px-4">
          <div class="font-semibold text-slate-900">${esc(u.name)}</div>
          <div class="text-slate-500 font-mono text-xs">${esc(u.email)}</div>
        </td>
        <td class="py-3 px-4 text-slate-600">${esc(u.company || '—')}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">${esc(u.plan_name || 'Free')}</span>
        </td>
        <td class="py-3 px-4 font-mono font-bold text-slate-900">${fmt(u.credits_remaining)}</td>
        <td class="py-3 px-4 text-slate-600">${fmt(u.total_messages)}</td>
        <td class="py-3 px-4"><span class="badge-${(u.plan_status||'').toLowerCase()}">${u.plan_status || 'ACTIVE'}</span></td>
        <td class="py-3 px-4 text-slate-400 text-xs">${fmtDate(u.created_at)}</td>
        <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
          <button onclick="event.stopPropagation(); impersonateUser(${u.id})"
                  title="Login directly as this client"
                  class="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition">
            Login As User
          </button>
          <button onclick="event.stopPropagation(); openUserModal(${u.id})"
                  class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition">
            Manage
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  } catch (err) { console.error(err); }
}

async function impersonateUser(userId) {
  if (!confirm('Access client dashboard as this user? A new session will open.')) return;
  try {
    const d = await api('/users/' + userId + '/impersonate', { method: 'POST' });
    if (d.success && d.token) {
      localStorage.setItem('un_user_token', d.token);
      localStorage.setItem('un_user_data', JSON.stringify(d.user));
      window.open('/?token=' + encodeURIComponent(d.token), '_blank');
      showToast('Opened client portal as ' + (d.user.name || d.user.email), 'success');
    } else {
      showToast(d.message || 'Failed to access user account.', 'error');
    }
  } catch (err) {
    showToast('Error accessing user account.', 'error');
  }
}

/* ── USER DETAIL MODAL ── */
async function openUserModal(userId) {
  activeUserId = userId;
  document.getElementById('userModal').classList.remove('hidden');

  try {
    const [userRes, plansRes] = await Promise.all([
      api('/users/' + userId),
      api('/plans')
    ]);
    if (!userRes.success) return;
    allPlans = plansRes.plans || [];

    const u = userRes.user;
    document.getElementById('modalUserName').textContent  = u.name || 'Client';
    document.getElementById('modalUserEmail').textContent = u.email;

    // Overview panel
    document.getElementById('mpanel-overview').innerHTML = `
      <div class="col-span-2 grid grid-cols-3 gap-3 mb-2">
        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <p class="text-xl font-extrabold text-slate-900">${fmt(u.credits_remaining)}</p>
          <p class="text-xs text-slate-500 mt-0.5">Credits Remaining</p>
        </div>
        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <p class="text-xl font-extrabold text-slate-900">${fmt(u.credits_used)}</p>
          <p class="text-xs text-slate-500 mt-0.5">Credits Used</p>
        </div>
        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <p class="text-xl font-extrabold text-slate-900">${fmt(userRes.recentMessages?.length || 0)}</p>
          <p class="text-xs text-slate-500 mt-0.5">Recent Messages</p>
        </div>
      </div>
      ${infoRow('Email', u.email)}
      ${infoRow('Phone', u.phone || '—')}
      ${infoRow('Company', u.company || '—')}
      ${infoRow('Plan', u.plan_name || 'Free Starter')}
      ${infoRow('Plan Status', `<span class="badge-${(u.plan_status||'active').toLowerCase()}">${u.plan_status}</span>`)}
      ${infoRow('Registered', fmtDate(u.created_at))}
    `;

    // Credits & Plan panel
    document.getElementById('m-credits').value = u.credits_remaining;
    document.getElementById('m-status').value  = u.plan_status || 'ACTIVE';
    const planSel = document.getElementById('m-planId');
    planSel.innerHTML = allPlans.map(p => `<option value="${p.id}" ${p.id === u.plan_id ? 'selected' : ''}>${esc(p.name)} (BDT ${p.price_bdt})</option>`).join('');

    // Load anti-ban settings
    loadModalAntiBan();

    // Message history
    const msgTbody = document.getElementById('m-msgTbody');
    msgTbody.innerHTML = '';
    (userRes.recentMessages || []).forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="py-2 px-3 text-slate-400">${fmtDate(m.created_at)}</td>
        <td class="py-2 px-3 uppercase text-slate-700">${esc(m.gateway_type)}</td>
        <td class="py-2 px-3 text-slate-700">${esc(m.recipient_phone)}</td>
        <td class="py-2 px-3 text-slate-600">${esc(m.message_type)}</td>
        <td class="py-2 px-3 text-slate-600 max-w-xs truncate" title="${esc(m.content||'')}">
          ${esc((m.content || m.template_name || '—').substring(0, 60))}
        </td>
        <td class="py-2 px-3"><span class="badge-${(m.status||'').toLowerCase()}">${esc(m.status)}</span></td>
      `;
      msgTbody.appendChild(tr);
    });

    switchModalTab('overview');
    lucide.createIcons();
  } catch (err) { console.error(err); }
}

function infoRow(label, val) {
  return `
    <div class="col-span-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
      <p class="text-xs text-slate-400 uppercase font-semibold mb-0.5">${label}</p>
      <p class="text-sm text-slate-900 font-medium">${val}</p>
    </div>`;
}

async function loadModalAntiBan() {
  if (!activeUserId) return;
  try {
    const d = await api('/users/' + activeUserId + '/settings');
    if (!d.success) return;
    const s = d.settings;
    document.getElementById('m-ab-min').value     = s.anti_ban_min_delay;
    document.getElementById('m-ab-max').value     = s.anti_ban_max_delay;
    document.getElementById('m-ab-daily').value   = s.anti_ban_daily_limit;
    document.getElementById('m-ab-typing').value  = s.anti_ban_typing_sim ? '1' : '0';
    document.getElementById('m-ab-gateway').value = s.default_gateway || 'meta';
  } catch (err) { console.error(err); }
}

function switchModalTab(tab) {
  document.querySelectorAll('.modal-panel').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.modal-tab-btn').forEach(b => {
    b.className = 'modal-tab-btn px-4 py-2 text-xs font-semibold rounded-t-lg text-slate-500 hover:text-slate-700';
  });
  const panel = document.getElementById('mpanel-' + tab);
  const btn   = document.getElementById('mtab-' + tab);
  if (panel) panel.classList.remove('hidden');
  if (btn)   btn.className = 'modal-tab-btn px-4 py-2 font-semibold rounded-t-lg text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50';
}

function closeUserModal() {
  document.getElementById('userModal').classList.add('hidden');
  activeUserId = null;
}

async function saveUserCredits() {
  const credits  = parseInt(document.getElementById('m-credits').value);
  const plan_id  = document.getElementById('m-planId').value;
  const status   = document.getElementById('m-status').value;
  const reason   = document.getElementById('m-reason').value;

  try {
    const [r1, r2] = await Promise.all([
      api('/users/' + activeUserId + '/credits', { method:'PUT', body: JSON.stringify({ credits_remaining: credits, reason }) }),
      api('/users/' + activeUserId + '/plan',    { method:'PUT', body: JSON.stringify({ plan_id, plan_status: status }) }),
    ]);
    if (r1.success || r2.success) {
      showToast('Client account updated successfully.', 'success');
      closeUserModal();
      loadUsers();
    } else {
      showToast(r1.message || r2.message || 'Update failed.', 'error');
    }
  } catch (err) { showToast('Error saving.', 'error'); }
}

async function saveUserAntiBan() {
  const payload = {
    anti_ban_min_delay:  parseInt(document.getElementById('m-ab-min').value),
    anti_ban_max_delay:  parseInt(document.getElementById('m-ab-max').value),
    anti_ban_daily_limit: parseInt(document.getElementById('m-ab-daily').value),
    anti_ban_typing_sim: document.getElementById('m-ab-typing').value === '1',
    default_gateway:     document.getElementById('m-ab-gateway').value,
    anti_ban_quiet_hours: false,
    anti_ban_quiet_start: '23:00',
    anti_ban_quiet_end:   '07:00',
    notify_on_delivery:   true,
  };
  try {
    const d = await api('/users/' + activeUserId + '/settings', { method:'POST', body: JSON.stringify(payload) });
    if (d.success) showToast('Anti-ban settings saved for this client.', 'success');
    else           showToast(d.message || 'Failed.', 'error');
  } catch { showToast('Error saving anti-ban settings.', 'error'); }
}

async function saveUserPassword() {
  const pw = document.getElementById('m-newPassword').value;
  if (!pw || pw.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }
  try {
    const d = await api('/users/' + activeUserId + '/password', { method:'PUT', body: JSON.stringify({ new_password: pw }) });
    if (d.success) { showToast('Password reset successfully.', 'success'); document.getElementById('m-newPassword').value = ''; }
    else           showToast(d.message || 'Failed.', 'error');
  } catch { showToast('Error resetting password.', 'error'); }
}

/* ═══════════════════════════════════════════
   PAYMENTS
═══════════════════════════════════════════ */
async function loadPayments() {
  const filter = document.getElementById('paymentFilter')?.value || '';
  try {
    const d = await api('/payments' + (filter ? '?status=' + filter : ''));
    if (!d.success) return;

    const tbody = document.getElementById('paymentsTbody');
    tbody.innerHTML = '';

    if (!d.payments.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400">No payment records found.</td></tr>`;
      return;
    }

    d.payments.forEach(p => {
      const pending = p.status === 'PENDING';
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50/50 transition';
      tr.innerHTML = `
        <td class="py-3 px-4 font-mono font-bold text-slate-900">#${p.id}</td>
        <td class="py-3 px-4">
          <div class="font-semibold text-slate-900">${esc(p.user_name)}</div>
          <div class="text-xs text-slate-500 font-mono">${esc(p.user_email)}</div>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-900">${esc(p.currency)} ${p.amount}</div>
          <div class="text-xs text-brand-600 font-semibold">${esc(p.plan_name)}</div>
        </td>
        <td class="py-3 px-4">
          <div class="uppercase font-semibold text-slate-800">${esc(p.payment_method)}</div>
          <div class="text-xs text-slate-500 font-mono">${esc(p.sender_number || '—')}</div>
        </td>
        <td class="py-3 px-4 font-mono font-bold text-slate-900 select-all cursor-text">${esc(p.transaction_id)}</td>
        <td class="py-3 px-4"><span class="badge-${(p.status||'').toLowerCase()}">${p.status}</span></td>
        <td class="py-3 px-4 text-xs text-slate-400">${fmtDate(p.created_at)}</td>
        <td class="py-3 px-4 text-right space-x-2">
          ${pending ? `
            <button onclick="approvePayment(${p.id})" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition">Approve</button>
            <button onclick="rejectPayment(${p.id})"  class="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition">Reject</button>
          ` : `<span class="text-xs text-slate-400">Processed</span>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  } catch (err) { console.error(err); }
}

async function approvePayment(id) {
  if (!confirm('Approve and credit client account?')) return;
  const d = await api('/payments/' + id + '/approve', { method:'POST' });
  if (d.success) { showToast(d.message, 'success'); loadPayments(); loadOverview(); }
  else           showToast(d.message || 'Failed', 'error');
}

async function rejectPayment(id) {
  const reason = prompt('Rejection reason (shown in notes):');
  if (reason === null) return;
  const d = await api('/payments/' + id + '/reject', { method:'POST', body: JSON.stringify({ reason }) });
  if (d.success) { showToast('Payment rejected.', 'success'); loadPayments(); }
  else           showToast(d.message || 'Failed', 'error');
}

/* ═══════════════════════════════════════════
   GATEWAYS
═══════════════════════════════════════════ */
async function loadGateways() {
  try {
    const d = await api('/gateways');
    if (!d.success) return;
    const grid = document.getElementById('gatewaysGrid');
    grid.innerHTML = '';
    d.gateways.forEach(g => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4';
      const isMeta = g.type === 'meta';
      const isConnected = g.status === 'CONNECTED';
      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl ${isMeta ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'} flex items-center justify-center">
              <i data-lucide="${isMeta ? 'check-circle-2' : 'qr-code'}" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-sm">${esc(g.name)}</h3>
              <p class="text-xs text-slate-500 uppercase tracking-wider">${g.type.toUpperCase()} Gateway</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-bold ${isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
            ${g.status}
          </span>
        </div>
        <div class="space-y-2 text-xs font-mono bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div class="flex justify-between"><span class="text-slate-500">Default:</span><span class="font-semibold text-slate-800">${g.is_default ? 'YES' : 'NO'}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Today Sent:</span><span class="font-semibold text-slate-800">${fmt(g.today_count || 0)}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Daily Limit:</span><span class="font-semibold text-slate-800">${fmt(g.daily_limit)}</span></div>
          <div class="w-full bg-slate-200 rounded-full h-1.5 mt-2">
            <div class="bg-brand-500 h-1.5 rounded-full" style="width:${Math.min(100, ((g.today_count||0)/g.daily_limit)*100)}%"></div>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
    lucide.createIcons();
  } catch (err) { console.error(err); }
}

/* ═══════════════════════════════════════════
   AUDIT LOGS
═══════════════════════════════════════════ */
async function loadAuditLogs() {
  try {
    const d = await api('/audit-logs?limit=200');
    if (!d.success) return;
    const tbody = document.getElementById('auditTbody');
    tbody.innerHTML = '';
    (d.logs || []).forEach(l => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50/50';
      tr.innerHTML = `
        <td class="py-2.5 px-4 text-slate-400">${l.id}</td>
        <td class="py-2.5 px-4 text-slate-500">${fmtDate(l.created_at)}</td>
        <td class="py-2.5 px-4 font-bold text-slate-900 font-sans">${esc(l.action)}</td>
        <td class="py-2.5 px-4 text-slate-600">${esc(l.user_email || 'Unauthenticated')}</td>
        <td class="py-2.5 px-4 text-slate-600">${esc(l.ip_address || '—')}</td>
        <td class="py-2.5 px-4 text-slate-500 max-w-xs truncate text-xs" title="${esc(l.details||'')}">${esc(l.details || '—')}</td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  } catch (err) { console.error(err); }
}

/* ═══════════════════════════════════════════
   ANTI-BAN SETTINGS
═══════════════════════════════════════════ */
async function loadAntiBanSettings() {
  try {
    const d = await api('/settings');
    if (!d.success) return;
    const s = d.settings;
    document.getElementById('ab-min').value     = s.anti_ban_min_delay || 5;
    document.getElementById('ab-max').value     = s.anti_ban_max_delay || 15;
    document.getElementById('ab-typing').value  = s.anti_ban_typing_sim || 'true';
    document.getElementById('ab-daily').value   = s.anti_ban_daily_limit || 1000;
    document.getElementById('ab-quiet').value   = s.anti_ban_quiet_hours || 'false';
    document.getElementById('ab-qstart').value  = s.anti_ban_quiet_start || '23:00';
    document.getElementById('ab-qend').value    = s.anti_ban_quiet_end || '07:00';
    document.getElementById('ab-gateway').value = s.default_gateway || 'meta';
  } catch (err) { console.error(err); }
}

async function saveAntiBanSettings(e) {
  e.preventDefault();
  const payload = {
    anti_ban_min_delay:   document.getElementById('ab-min').value,
    anti_ban_max_delay:   document.getElementById('ab-max').value,
    anti_ban_typing_sim:  document.getElementById('ab-typing').value,
    anti_ban_daily_limit: document.getElementById('ab-daily').value,
    anti_ban_quiet_hours: document.getElementById('ab-quiet').value,
    anti_ban_quiet_start: document.getElementById('ab-qstart').value,
    anti_ban_quiet_end:   document.getElementById('ab-qend').value,
    default_gateway:      document.getElementById('ab-gateway').value,
  };
  try {
    const d = await api('/settings', { method:'POST', body: JSON.stringify(payload) });
    if (d.success) showToast('Anti-ban settings saved globally.', 'success');
    else           showToast(d.message || 'Failed.', 'error');
  } catch { showToast('Error saving settings.', 'error'); }
}

/* ═══════════════════════════════════════════
   SYSTEM SETTINGS
═══════════════════════════════════════════ */
async function loadSettings() {
  try {
    const d = await api('/settings');
    if (!d.success) return;
    const s = d.settings;
    document.getElementById('s-bkash').value  = s.payment_bkash_number  || '';
    document.getElementById('s-nagad').value  = s.payment_nagad_number  || '';
    document.getElementById('s-rocket').value = s.payment_rocket_number || '';
    document.getElementById('s-bank').value   = s.payment_bank_details  || '';
  } catch (err) { console.error(err); }
}

async function saveSettings(e) {
  e.preventDefault();
  const payload = {
    payment_bkash_number:  document.getElementById('s-bkash').value,
    payment_nagad_number:  document.getElementById('s-nagad').value,
    payment_rocket_number: document.getElementById('s-rocket').value,
    payment_bank_details:  document.getElementById('s-bank').value,
  };
  try {
    const d = await api('/settings', { method:'POST', body: JSON.stringify(payload) });
    if (d.success) showToast('Payment settings updated.', 'success');
    else           showToast(d.message || 'Failed.', 'error');
  } catch { showToast('Error saving settings.', 'error'); }
}

/* ═══════════════════════════════════════════
   PLANS
═══════════════════════════════════════════ */
async function loadPlans() {
  try {
    const d = await api('/plans');
    if (!d.success) return;
    const grid = document.getElementById('plansGrid');
    grid.innerHTML = '';
    d.plans.forEach(p => {
      const features = (() => { try { return JSON.parse(p.features || '[]'); } catch { return []; } })();
      const card = document.createElement('div');
      card.className = `bg-white rounded-2xl border shadow-sm p-6 space-y-4 ${p.is_popular ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`;
      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-bold text-slate-900">${esc(p.name)}</h3>
            <p class="text-xs text-slate-500">${p.billing_cycle || 'monthly'}</p>
          </div>
          ${p.is_popular ? '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Popular</span>' : ''}
        </div>
        <div>
          <p class="text-2xl font-extrabold text-slate-900">BDT ${p.price_bdt}</p>
          <p class="text-xs text-slate-500">/ ${p.billing_cycle || 'month'}</p>
        </div>
        <div class="space-y-1.5">
          ${features.map(f => `<div class="flex items-center gap-1.5 text-xs text-slate-700"><i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0"></i>${esc(f)}</div>`).join('')}
        </div>
        <div class="pt-3 border-t border-slate-100 text-xs font-mono text-slate-500">
          Limit: ${fmt(p.message_limit)} msgs/mo | ${p.device_limit} device(s)
        </div>
      `;
      grid.appendChild(card);
    });
    lucide.createIcons();
  } catch (err) { console.error(err); }
}

/* ═══════════════════════════════════════════
   UTILS
═══════════════════════════════════════════ */
function fmt(n) { return Number(n || 0).toLocaleString(); }

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return iso; }
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function showToast(msg, type = 'success') {
  const zone = document.getElementById('toastZone');
  const toast = document.createElement('div');
  const colors = type === 'success'
    ? 'bg-emerald-700 text-white border-emerald-600'
    : 'bg-rose-700 text-white border-rose-600';
  toast.className = `pointer-events-auto px-4 py-3 rounded-xl border shadow-lg text-sm font-semibold max-w-sm ${colors} flex items-center gap-2`;
  toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" class="w-4 h-4 flex-shrink-0"></i><span>${esc(msg)}</span>`;
  zone.appendChild(toast);
  lucide.createIcons();
  setTimeout(() => toast.remove(), 4000);
}

/* ═══════════════════════════════════════════
   SMS ADMIN CONTROLLERS
═══════════════════════════════════════════ */

let allSmsGateways = [];
let allSmsPackages = [];

// 1. SMS Gateways
async function loadSmsGateways() {
  const grid = document.getElementById('smsGatewaysGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="col-span-3 text-center text-xs text-slate-400 py-8">Loading SMS Gateways...</div>';

  try {
    const d = await api('/sms/gateways');
    if (!d.success) return;
    allSmsGateways = d.gateways || [];
    grid.innerHTML = '';

    if (allSmsGateways.length === 0) {
      grid.innerHTML = '<div class="col-span-3 text-center text-xs text-slate-400 py-8">No SMS Gateways configured. Click "Add Gateway Provider" above.</div>';
      return;
    }

    allSmsGateways.forEach(gw => {
      const card = document.createElement('div');
      card.className = `p-5 rounded-2xl border ${gw.is_active ? 'border-slate-200 bg-white shadow-xs' : 'border-slate-200 bg-slate-50/70 opacity-75'}`;
      card.innerHTML = `
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl ${gw.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'} flex items-center justify-center font-bold text-xs">
              <i data-lucide="radio" class="w-4 h-4"></i>
            </div>
            <div>
              <p class="font-bold text-slate-900 text-xs">${esc(gw.provider_name).toUpperCase()}</p>
              <p class="text-[11px] text-slate-500 font-mono truncate max-w-[150px]">${esc(gw.api_url)}</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            ${gw.is_default ? '<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Default</span>' : ''}
            <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${gw.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}">
              ${gw.is_active ? 'Active' : 'Disabled'}
            </span>
          </div>
        </div>

        <div class="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 mb-4">
          <div class="flex justify-between">
            <span class="text-slate-400 text-[11px]">Mask / Sender ID:</span>
            <span class="font-mono font-semibold text-slate-800">${esc(gw.sender_id || 'None')}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400 text-[11px]">API Key:</span>
            <span class="font-mono text-slate-600">${gw.api_key ? '••••' + gw.api_key.slice(-4) : 'Not set'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-400 text-[11px]">Notes:</span>
            <span class="text-slate-700 truncate max-w-[160px]">${esc(gw.notes || '—')}</span>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-slate-100 pt-3">
          <button onclick='openTestSmsModal(${gw.id})' class="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
            <i data-lucide="send" class="w-3.5 h-3.5"></i>Test
          </button>
          <div class="flex items-center gap-1.5">
            ${!gw.is_default ? `<button onclick="setDefaultSmsGateway(${gw.id})" class="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-medium">Set Default</button>` : ''}
            <button onclick="toggleSmsGateway(${gw.id})" class="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-medium">
              ${gw.is_active ? 'Disable' : 'Enable'}
            </button>
            <button onclick='editSmsGateway(${JSON.stringify(gw).replace(/'/g, "&apos;")})' class="p-1.5 text-slate-500 hover:text-slate-800">
              <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="deleteSmsGateway(${gw.id})" class="p-1.5 text-rose-500 hover:text-rose-700">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
    lucide.createIcons();
  } catch (err) { console.error(err); }
}

function openAddSmsGatewayModal() {
  document.getElementById('modalSmsGatewayTitle').textContent = 'Add Third-Party SMS Gateway';
  document.getElementById('gw-id').value = '';
  document.getElementById('gw-provider').value = 'greenweb';
  document.getElementById('gw-url').value = 'http://api.greenweb.com.bd/api.php';
  document.getElementById('gw-key').value = '';
  document.getElementById('gw-sender').value = 'UNIQUE';
  document.getElementById('gw-default').value = '0';
  document.getElementById('gw-notes').value = '';
  document.getElementById('modalSmsGateway').classList.remove('hidden');
  lucide.createIcons();
}

function editSmsGateway(gw) {
  document.getElementById('modalSmsGatewayTitle').textContent = 'Edit SMS Gateway';
  document.getElementById('gw-id').value = gw.id;
  document.getElementById('gw-provider').value = gw.provider_name;
  document.getElementById('gw-url').value = gw.api_url;
  document.getElementById('gw-key').value = gw.api_key || '';
  document.getElementById('gw-sender').value = gw.sender_id || '';
  document.getElementById('gw-default').value = gw.is_default ? '1' : '0';
  document.getElementById('gw-notes').value = gw.notes || '';
  document.getElementById('modalSmsGateway').classList.remove('hidden');
  lucide.createIcons();
}

function closeSmsGatewayModal() {
  document.getElementById('modalSmsGateway').classList.add('hidden');
}

async function saveSmsGateway(e) {
  e.preventDefault();
  const id = document.getElementById('gw-id').value;
  const provider_name = document.getElementById('gw-provider').value;
  const api_url = document.getElementById('gw-url').value.trim();
  const api_key = document.getElementById('gw-key').value.trim();
  const sender_id = document.getElementById('gw-sender').value.trim();
  const is_default = document.getElementById('gw-default').value === '1';
  const notes = document.getElementById('gw-notes').value.trim();

  try {
    const res = await api('/sms/gateways', {
      method: 'POST',
      body: JSON.stringify({ id: id || undefined, provider_name, api_url, api_key, sender_id, is_default, is_active: 1, notes })
    });
    if (res.success) {
      showToast(res.message);
      closeSmsGatewayModal();
      loadSmsGateways();
    } else {
      showToast(res.message || 'Failed to save gateway', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleSmsGateway(id) {
  try {
    const res = await api(`/sms/gateways/${id}/toggle`, { method: 'POST' });
    if (res.success) { showToast(res.message); loadSmsGateways(); }
  } catch (err) { showToast(err.message, 'error'); }
}

async function setDefaultSmsGateway(id) {
  try {
    const res = await api(`/sms/gateways/${id}/default`, { method: 'POST' });
    if (res.success) { showToast(res.message); loadSmsGateways(); }
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteSmsGateway(id) {
  if (!confirm('Are you sure you want to delete this SMS Gateway?')) return;
  try {
    const res = await api(`/sms/gateways/${id}`, { method: 'DELETE' });
    if (res.success) { showToast(res.message); loadSmsGateways(); }
  } catch (err) { showToast(err.message, 'error'); }
}

function openTestSmsModal(gwId) {
  const sel = document.getElementById('test-sms-gateway');
  sel.innerHTML = '';
  allSmsGateways.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = `${g.provider_name.toUpperCase()} (${g.is_default ? 'Default' : 'Secondary'})`;
    if (gwId && g.id == gwId) opt.selected = true;
    sel.appendChild(opt);
  });
  document.getElementById('modalSmsTest').classList.remove('hidden');
  lucide.createIcons();
}

function closeTestSmsModal() {
  document.getElementById('modalSmsTest').classList.add('hidden');
}

async function handleTestSmsSend(e) {
  e.preventDefault();
  const btn = document.getElementById('btnTestSmsSubmit');
  const gateway_id = document.getElementById('test-sms-gateway').value;
  const phone = document.getElementById('test-sms-phone').value.trim();
  const message = document.getElementById('test-sms-message').value.trim();

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner">&#8635;</span> Dispatching...';

  try {
    const res = await api('/sms/gateways/test-send', {
      method: 'POST',
      body: JSON.stringify({ gateway_id, phone, message })
    });
    if (res.success) {
      showToast(res.message);
      closeTestSmsModal();
    } else {
      showToast(res.message || 'Dispatch test failed', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5"></i>Dispatch Test SMS';
    lucide.createIcons();
  }
}

// 2. SMS Pricing & Packages
async function loadSmsBilling() {
  try {
    // Load Settings
    const setRes = await api('/sms/settings');
    if (setRes.success) {
      document.getElementById('sms-set-rate').value = setRes.settings.default_sms_rate;
      document.getElementById('sms-set-min').value = setRes.settings.min_sms_recharge;
    }

    // Load Packages
    const pkgRes = await api('/sms/packages');
    if (pkgRes.success) {
      allSmsPackages = pkgRes.packages || [];
      const grid = document.getElementById('smsPackagesAdminGrid');
      grid.innerHTML = '';

      if (allSmsPackages.length === 0) {
        grid.innerHTML = '<div class="col-span-4 text-center text-xs text-slate-400 py-6">No SMS packages created yet.</div>';
        return;
      }

      allSmsPackages.forEach(p => {
        let features = [];
        try { features = typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || []); } catch { features = []; }

        const card = document.createElement('div');
        card.className = `p-5 rounded-2xl border ${p.is_popular ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20' : 'border-slate-200'} bg-white flex flex-col justify-between`;
        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-900">${esc(p.name)}</span>
              ${p.is_popular ? '<span class="px-2 py-0.5 text-[9px] font-bold uppercase rounded-full bg-emerald-100 text-emerald-800">Popular</span>' : ''}
            </div>
            <div class="mb-3">
              <span class="text-2xl font-black text-slate-900">৳${fmt(p.price_bdt)}</span>
              <span class="text-xs text-slate-500">/ ${fmt(p.sms_count)} SMS</span>
            </div>
            <div class="p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl mb-3 text-[11px] font-semibold text-emerald-800 flex justify-between">
              <span>Per SMS Cost:</span>
              <span>৳${Number(p.price_per_sms).toFixed(3)}</span>
            </div>
            <ul class="space-y-1.5 text-xs text-slate-600 mb-4">
              <li class="flex items-center gap-1.5"><i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i>${fmt(p.sms_count)} SMS Units</li>
              <li class="flex items-center gap-1.5"><i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i>${p.validity_days} Days Validity</li>
              ${features.map(f => `<li class="flex items-center gap-1.5"><i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i>${esc(f)}</li>`).join('')}
            </ul>
          </div>
          <div class="border-t border-slate-100 pt-3 flex items-center justify-between">
            <span class="text-[11px] font-medium ${p.is_active ? 'text-emerald-600' : 'text-slate-400'}">${p.is_active ? 'Active' : 'Disabled'}</span>
            <div class="flex items-center gap-1">
              <button onclick='editSmsPackage(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="p-1.5 text-slate-500 hover:text-slate-800">
                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="deleteSmsPackage(${p.id})" class="p-1.5 text-rose-500 hover:text-rose-700">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
      lucide.createIcons();
    }
  } catch (err) { console.error(err); }
}

async function saveSmsPricingSettings(e) {
  e.preventDefault();
  const default_sms_rate = document.getElementById('sms-set-rate').value;
  const min_sms_recharge = document.getElementById('sms-set-min').value;

  try {
    const res = await api('/sms/settings', {
      method: 'POST',
      body: JSON.stringify({ default_sms_rate, min_sms_recharge })
    });
    if (res.success) showToast(res.message);
  } catch (err) { showToast(err.message, 'error'); }
}

function calculatePkgRate() {
  const count = parseFloat(document.getElementById('pkg-count').value || 0);
  const price = parseFloat(document.getElementById('pkg-price').value || 0);
  if (count > 0 && price > 0) {
    document.getElementById('pkg-rate').value = (price / count).toFixed(3);
  } else {
    document.getElementById('pkg-rate').value = '0.350';
  }
}

function openAddSmsPackageModal() {
  document.getElementById('modalSmsPackageTitle').textContent = 'Create SMS Package';
  document.getElementById('pkg-id').value = '';
  document.getElementById('pkg-name').value = '';
  document.getElementById('pkg-count').value = '1000';
  document.getElementById('pkg-price').value = '350.00';
  document.getElementById('pkg-validity').value = '365';
  document.getElementById('pkg-features').value = 'Priority Queue Tier\nReal-time DLR\n365 Days Validity';
  document.getElementById('pkg-popular').checked = false;
  document.getElementById('pkg-active').checked = true;
  calculatePkgRate();
  document.getElementById('modalSmsPackage').classList.remove('hidden');
  lucide.createIcons();
}

function editSmsPackage(p) {
  document.getElementById('modalSmsPackageTitle').textContent = 'Edit SMS Package';
  document.getElementById('pkg-id').value = p.id;
  document.getElementById('pkg-name').value = p.name;
  document.getElementById('pkg-count').value = p.sms_count;
  document.getElementById('pkg-price').value = p.price_bdt;
  document.getElementById('pkg-validity').value = p.validity_days || 365;
  
  let featText = '';
  try {
    const arr = typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || []);
    featText = Array.isArray(arr) ? arr.join('\n') : '';
  } catch { featText = ''; }
  document.getElementById('pkg-features').value = featText;
  document.getElementById('pkg-popular').checked = !!p.is_popular;
  document.getElementById('pkg-active').checked = !!p.is_active;
  calculatePkgRate();
  document.getElementById('modalSmsPackage').classList.remove('hidden');
  lucide.createIcons();
}

function closeSmsPackageModal() {
  document.getElementById('modalSmsPackage').classList.add('hidden');
}

async function saveSmsPackage(e) {
  e.preventDefault();
  const id = document.getElementById('pkg-id').value;
  const name = document.getElementById('pkg-name').value.trim();
  const sms_count = document.getElementById('pkg-count').value;
  const price_bdt = document.getElementById('pkg-price').value;
  const price_per_sms = document.getElementById('pkg-rate').value;
  const validity_days = document.getElementById('pkg-validity').value;
  const features = document.getElementById('pkg-features').value.split('\n').map(s => s.trim()).filter(Boolean);
  const is_popular = document.getElementById('pkg-popular').checked;
  const is_active = document.getElementById('pkg-active').checked;

  try {
    const res = await api('/sms/packages', {
      method: 'POST',
      body: JSON.stringify({ id: id || undefined, name, sms_count, price_bdt, price_per_sms, validity_days, features, is_popular, is_active })
    });
    if (res.success) {
      showToast(res.message);
      closeSmsPackageModal();
      loadSmsBilling();
    } else {
      showToast(res.message || 'Failed to save package', 'error');
    }
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteSmsPackage(id) {
  if (!confirm('Are you sure you want to delete this SMS package?')) return;
  try {
    const res = await api(`/sms/packages/${id}`, { method: 'DELETE' });
    if (res.success) { showToast(res.message); loadSmsBilling(); }
  } catch (err) { showToast(err.message, 'error'); }
}

// 3. User SMS Wallets
async function loadSmsUsers() {
  const tbody = document.getElementById('smsUsersTbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="text-center text-slate-400 py-6">Loading client SMS wallets...</td></tr>';

  try {
    const d = await api('/sms/users');
    if (!d.success) return;
    const users = d.users || [];
    tbody.innerHTML = '';

    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-slate-400 py-6">No users found.</td></tr>';
      return;
    }

    users.forEach(u => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition';
      tr.innerHTML = `
        <td class="py-3 px-4">
          <p class="font-bold text-slate-900">${esc(u.name)}</p>
          <p class="text-[11px] text-slate-500 font-mono">${esc(u.email)}</p>
        </td>
        <td class="py-3 px-4 font-mono font-bold text-emerald-700">
          ৳${Number(u.sms_balance || 0).toFixed(2)}
        </td>
        <td class="py-3 px-4 font-mono font-semibold text-slate-800">
          ${fmt(u.sms_credits || 0)} SMS
        </td>
        <td class="py-3 px-4 font-mono text-slate-600">
          ${u.custom_sms_rate ? `<span class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">৳${Number(u.custom_sms_rate).toFixed(2)} (Custom)</span>` : '<span class="text-slate-400">৳0.35 (Default)</span>'}
        </td>
        <td class="py-3 px-4 text-[11px] text-slate-500">${fmtDate(u.created_at)}</td>
        <td class="py-3 px-4 text-right">
          <button onclick='openAdjustSmsModal(${JSON.stringify(u).replace(/'/g, "&apos;")})' class="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition flex items-center gap-1 ml-auto">
            <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>Adjust Balance
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  } catch (err) { console.error(err); }
}

function openAdjustSmsModal(u) {
  document.getElementById('adj-user-id').value = u.id;
  document.getElementById('modalSmsUserName').textContent = `Adjust SMS: ${u.name}`;
  document.getElementById('modalSmsUserEmail').textContent = u.email;
  document.getElementById('adj-curr-cash').textContent = `৳${Number(u.sms_balance || 0).toFixed(2)}`;
  document.getElementById('adj-curr-credits').textContent = `${fmt(u.sms_credits || 0)} SMS`;
  document.getElementById('adj-amount').value = '';
  document.getElementById('adj-credits').value = '';
  document.getElementById('adj-custom-rate').value = u.custom_sms_rate || '';
  document.getElementById('adj-note').value = '';
  document.getElementById('modalAdjustSmsUser').classList.remove('hidden');
  lucide.createIcons();
}

function closeAdjustSmsModal() {
  document.getElementById('modalAdjustSmsUser').classList.add('hidden');
}

async function handleAdjustSmsSubmit(e) {
  e.preventDefault();
  const userId = document.getElementById('adj-user-id').value;
  const action = document.getElementById('adj-action').value;
  const amount_bdt = document.getElementById('adj-amount').value;
  const sms_credits = document.getElementById('adj-credits').value;
  const custom_sms_rate = document.getElementById('adj-custom-rate').value;
  const note = document.getElementById('adj-note').value.trim();

  try {
    const res = await api(`/sms/users/${userId}/adjust-balance`, {
      method: 'POST',
      body: JSON.stringify({ action, amount_bdt, sms_credits, custom_sms_rate, note })
    });
    if (res.success) {
      showToast(res.message);
      closeAdjustSmsModal();
      loadSmsUsers();
    } else {
      showToast(res.message || 'Adjustment failed', 'error');
    }
  } catch (err) { showToast(err.message, 'error'); }
}

// 4. SMS Top-up & Transactions Approval
async function loadSmsTransactions() {
  const tbody = document.getElementById('smsTransactionsTbody');
  if (!tbody) return;
  const statusFilter = document.getElementById('smsTxStatusFilter')?.value || 'all';
  tbody.innerHTML = '<tr><td colspan="8" class="text-center text-slate-400 py-6">Loading SMS transactions...</td></tr>';

  try {
    const d = await api(`/sms/transactions?status=${statusFilter}`);
    if (!d.success) return;
    const list = d.transactions || [];
    tbody.innerHTML = '';

    // Update pending badge in sidebar
    const pendingCount = list.filter(t => t.status === 'PENDING').length;
    const badge = document.getElementById('sidebarSmsPendingBadge');
    if (badge) {
      if (pendingCount > 0) { badge.textContent = pendingCount; badge.classList.remove('hidden'); }
      else { badge.classList.add('hidden'); }
    }

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-slate-400 py-6">No SMS transactions recorded.</td></tr>';
      return;
    }

    list.forEach(tx => {
      const isPending = tx.status === 'PENDING';
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition';
      tr.innerHTML = `
        <td class="py-3 px-4 font-mono font-bold text-slate-800">
          ${esc(tx.transaction_id || '#' + tx.id)}
        </td>
        <td class="py-3 px-4">
          <p class="font-bold text-slate-900">${esc(tx.user_name)}</p>
          <p class="text-[11px] text-slate-500 font-mono">${esc(tx.user_email)}</p>
        </td>
        <td class="py-3 px-4">
          <span class="font-semibold text-slate-800">${esc(tx.type)}</span>
          <p class="text-[11px] text-slate-500">${esc(tx.description)}</p>
        </td>
        <td class="py-3 px-4 font-mono font-bold ${tx.amount_bdt > 0 ? 'text-emerald-700' : 'text-blue-700'}">
          ${tx.amount_bdt > 0 ? '৳' + Number(tx.amount_bdt).toFixed(2) : fmt(tx.sms_count) + ' SMS'}
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">${esc(tx.payment_method || 'wallet')}</span>
          ${tx.sender_number ? `<p class="text-[11px] text-slate-500 font-mono mt-0.5">${esc(tx.sender_number)}</p>` : ''}
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : tx.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}">
            ${tx.status}
          </span>
        </td>
        <td class="py-3 px-4 text-[11px] text-slate-500 font-mono">${fmtDate(tx.created_at)}</td>
        <td class="py-3 px-4 text-right">
          ${isPending ? `
            <div class="flex items-center justify-end gap-1.5">
              <button onclick="approveSmsTransaction(${tx.id})" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition">
                Approve
              </button>
              <button onclick="rejectSmsTransaction(${tx.id})" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition">
                Reject
              </button>
            </div>
          ` : '<span class="text-slate-400 text-[11px]">Processed</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  } catch (err) { console.error(err); }
}

async function approveSmsTransaction(id) {
  if (!confirm(`Approve SMS transaction #${id} and credit client account?`)) return;
  try {
    const res = await api(`/sms/transactions/${id}/approve`, { method: 'POST' });
    if (res.success) {
      showToast(res.message);
      loadSmsTransactions();
    } else {
      showToast(res.message || 'Approval failed', 'error');
    }
  } catch (err) { showToast(err.message, 'error'); }
}

async function rejectSmsTransaction(id) {
  if (!confirm(`Reject SMS transaction #${id}?`)) return;
  try {
    const res = await api(`/sms/transactions/${id}/reject`, { method: 'POST' });
    if (res.success) {
      showToast(res.message);
      loadSmsTransactions();
    } else {
      showToast(res.message || 'Rejection failed', 'error');
    }
  } catch (err) { showToast(err.message, 'error'); }
}

/* ═══════════════════════════════════════════
   ANDROID SMS NODES & SENDER ID ASSIGNMENT
═══════════════════════════════════════════ */
let adminSmsDevicesList = [];
let adminUsersList = [];

async function loadAdminSmsDevices() {
  const tbody = document.getElementById('adminSmsDevicesTbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-slate-400">Loading devices...</td></tr>';
  try {
    const res = await api('/sms/devices');
    if (!res.success) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-rose-500 py-6">Failed to load devices.</td></tr>';
      return;
    }
    adminSmsDevicesList = res.devices || [];
    adminUsersList = res.users || [];

    // Populate user select in modal
    const userSelect = document.getElementById('assign-user-select');
    if (userSelect) {
      userSelect.innerHTML = '<option value="">-- Select Client Account --</option>' +
        adminUsersList.map(u => `<option value="${u.id}">${esc(u.name)} (${esc(u.email)})</option>`).join('');
    }

    if (adminSmsDevicesList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-slate-400 py-8">No Android devices paired yet. Pair an Android Gateway node to configure sender IDs.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    adminSmsDevicesList.forEach(dev => {
      const isOnline = dev.status === 'ONLINE';
      const isShared = dev.is_shared == 1;
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition';
      tr.innerHTML = `
        <td class="py-3 px-4">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'} flex items-center justify-center font-bold text-xs">
              <i data-lucide="smartphone" class="w-4 h-4"></i>
            </div>
            <div>
              <p class="font-bold text-slate-900">${esc(dev.device_name || 'Android Device')}</p>
              <p class="text-[11px] text-slate-500 font-mono">${esc(dev.phone_model || '')} ${dev.phone_number ? '&bull; ' + esc(dev.phone_number) : ''}</p>
            </div>
          </div>
        </td>
        <td class="py-3 px-4">
          <p class="font-bold text-slate-800">${esc(dev.owner_name || 'Admin / Platform')}</p>
          <p class="text-[11px] text-slate-400 font-mono">${esc(dev.owner_email || 'System')}</p>
        </td>
        <td class="py-3 px-4">
          <div class="font-semibold text-slate-800">${esc(dev.sim1_operator || 'SIM 1')}</div>
          ${dev.sim1_sender_id ? `<span class="inline-block mt-0.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold text-[10px] border border-emerald-200">${esc(dev.sim1_sender_id)}</span>` : '<span class="text-[11px] text-slate-400 italic">No Sender ID</span>'}
        </td>
        <td class="py-3 px-4">
          <div class="font-semibold text-slate-800">${esc(dev.sim2_operator || 'SIM 2')}</div>
          ${dev.sim2_sender_id ? `<span class="inline-block mt-0.5 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold text-[10px] border border-blue-200">${esc(dev.sim2_sender_id)}</span>` : '<span class="text-[11px] text-slate-400 italic">No Sender ID</span>'}
        </td>
        <td class="py-3 px-4">
          ${isShared 
            ? '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Shared Platform Pool</span>' 
            : '<span class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">Dedicated Gateway</span>'}
        </td>
        <td class="py-3 px-4">
          ${isShared 
            ? '<span class="text-[11px] text-slate-500">All System Users</span>' 
            : (dev.assigned_name ? `<div><p class="font-bold text-purple-900">${esc(dev.assigned_name)}</p><p class="text-[11px] text-slate-400 font-mono">${esc(dev.assigned_email)}</p></div>` : '<span class="text-rose-500 text-[11px] font-semibold">Unassigned</span>')}
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
            <span class="font-semibold text-[11px] ${isOnline ? 'text-emerald-700' : 'text-slate-400'}">${dev.status || 'OFFLINE'}</span>
          </div>
          <p class="text-[10px] text-slate-400 mt-0.5">${dev.battery_level ? 'Battery: ' + dev.battery_level + '%' : 'Battery: N/A'}</p>
        </td>
        <td class="py-3 px-4 text-right">
          <button onclick="openAssignDeviceModal(${dev.id})" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition flex items-center gap-1.5 ml-auto">
            <i data-lucide="settings-2" class="w-3.5 h-3.5"></i>
            <span>Configure</span>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    lucide.createIcons();
  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-rose-500 py-6">Error loading devices: ' + esc(err.message) + '</td></tr>';
  }
}

function openAssignDeviceModal(deviceId) {
  const dev = adminSmsDevicesList.find(d => d.id === deviceId);
  if (!dev) return;

  document.getElementById('assign-device-id').value = dev.id;
  document.getElementById('modalAssignDeviceTitle').textContent = `Configure ${dev.device_name || 'Device #' + dev.id}`;
  document.getElementById('modalAssignDeviceSubtitle').textContent = `Model: ${dev.phone_model || 'Unknown'} | SIM1: ${dev.sim1_operator || 'Active'} | SIM2: ${dev.sim2_operator || 'Empty'}`;
  document.getElementById('assign-sim1-sender').value = dev.sim1_sender_id || '';
  document.getElementById('assign-sim2-sender').value = dev.sim2_sender_id || '';

  const isShared = dev.is_shared == 1;
  const radios = document.getElementsByName('assign_routing_mode');
  for (const r of radios) {
    if (isShared && r.value === 'shared') r.checked = true;
    if (!isShared && r.value === 'dedicated') r.checked = true;
  }

  toggleAssignClientDropdown(!isShared);
  if (dev.assigned_user_id) {
    document.getElementById('assign-user-select').value = dev.assigned_user_id;
  } else {
    document.getElementById('assign-user-select').value = '';
  }

  document.getElementById('modalAssignDevice').classList.remove('hidden');
  lucide.createIcons();
}

function closeAssignDeviceModal() {
  document.getElementById('modalAssignDevice').classList.add('hidden');
}

function toggleAssignClientDropdown(isDedicated) {
  const box = document.getElementById('assign-client-box');
  if (isDedicated) {
    box.classList.remove('hidden');
  } else {
    box.classList.add('hidden');
  }
}

async function handleAssignDeviceSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('assign-device-id').value;
  const sim1_sender_id = document.getElementById('assign-sim1-sender').value.trim();
  const sim2_sender_id = document.getElementById('assign-sim2-sender').value.trim();
  
  let routingMode = 'shared';
  const radios = document.getElementsByName('assign_routing_mode');
  for (const r of radios) {
    if (r.checked) routingMode = r.value;
  }
  const is_shared = routingMode === 'shared' ? 1 : 0;
  const assigned_user_id = is_shared ? null : (document.getElementById('assign-user-select').value || null);

  if (!is_shared && !assigned_user_id) {
    showToast('Please select a client account for dedicated assignment.', 'error');
    return;
  }

  try {
    const res = await api(`/sms/devices/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({
        sim1_sender_id,
        sim2_sender_id,
        is_shared,
        assigned_user_id
      })
    });

    if (res.success) {
      showToast(res.message);
      closeAssignDeviceModal();
      loadAdminSmsDevices();
    } else {
      showToast(res.message || 'Failed to update device settings', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

