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
  overview: { title: 'Dashboard Overview',             sub: 'SaaS platform status and recent activity' },
  users:    { title: 'Client Accounts',                sub: 'Manage clients, plans, credits, and account status' },
  payments: { title: 'Payments & Billing Approvals',   sub: 'Review and approve offline payment transactions' },
  gateways: { title: 'Gateway Engine Status',          sub: 'Monitor Meta Cloud API and Baileys QR sessions' },
  audit:    { title: 'Security Audit Logs',            sub: 'Immutable log of all security events' },
  antiban:  { title: 'Anti-Ban Engine Configuration',  sub: 'Global WhatsApp safety parameters for all clients' },
  settings: { title: 'Payment Channels & System Settings', sub: 'bKash, Nagad, Rocket, Bank transfer details' },
  plans:    { title: 'Subscription Plans',             sub: 'Active SaaS pricing tiers overview' },
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
    overview: loadOverview,
    users:    loadUsers,
    payments: loadPayments,
    gateways: loadGateways,
    audit:    loadAuditLogs,
    antiban:  loadAntiBanSettings,
    settings: loadSettings,
    plans:    loadPlans,
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
