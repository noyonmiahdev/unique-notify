/**
 * Unique-Notify SaaS Controller
 * Handles Public Landing Page, Multi-User Auth, Subscription Plans, Payment Gateway & Dashboard
 */

// Universal API Base URL Resolution (Works seamlessly on Apache / XAMPP subdirectories and direct Node.js ports)
const API_BASE = (window.location.port === '3000' || window.location.port === '3001')
  ? ''
  : (window.location.protocol + '//' + window.location.hostname + ':3000');

const _nativeFetch = window.fetch;
window.fetch = function(url, options) {
  if (typeof url === 'string' && url.startsWith('/api/')) {
    url = API_BASE + url;
  }
  return _nativeFetch.call(this, url, options);
};

// Application State
const state = {
  viewMode: 'landing', // 'landing' or 'dashboard'
  currentTab: 'overview',
  currentUser: null,
  plans: [],
  stats: {},
  devices: [],
  smsDevices: [],
  smsGateways: {},
  smsLogs: [],
  smsWallet: null,
  smsPackages: [],
  activeSmsSubTab: 'send',
  metaConfig: {},
  settings: {},
  qrData: null,
  qrStatus: 'DISCONNECTED',
  connectedPhone: null,
  socket: null
};

// DOM Initialization
document.addEventListener('DOMContentLoaded', async () => {
  initSocket();
  await loadLandingPlans();
  checkAuthSession();
});

/**
 * Socket.io Real-time WebSocket
 */
function initSocket() {
  try {
    if (typeof io !== 'function') return;
    const socketTarget = (window.location.port === '3000' || window.location.port === '3001')
      ? undefined
      : (window.location.protocol + '//' + window.location.hostname + ':3000');
    state.socket = io(socketTarget);

    state.socket.on('session_status', (data) => {
      state.qrStatus = data.status || 'DISCONNECTED';
      state.connectedPhone = data.phoneNumber || data.phone || null;
      updateHeaderBadges();
      if (state.viewMode === 'dashboard' && (state.currentTab === 'devices' || state.currentTab === 'overview')) {
        renderCurrentTab();
      }
    });

    state.socket.on('session_qr', (data) => {
      state.qrData = data.qr;
      state.qrStatus = 'SCAN_QR';
      updateHeaderBadges();
      if (state.viewMode === 'dashboard' && state.currentTab === 'devices') {
        renderDevicesTab(document.getElementById('tab-content'));
      }
    });

    state.socket.on('campaign_progress', () => {
      if (state.viewMode === 'dashboard' && (state.currentTab === 'broadcasts' || state.currentTab === 'overview')) {
        renderCurrentTab();
      }
    });

    state.socket.on('campaign_status', (data) => {
      showToast(`Campaign #${data.campaignId}: ${data.status}`, 'info');
      if (state.viewMode === 'dashboard' && state.currentTab === 'broadcasts') {
        renderBroadcastsTab(document.getElementById('tab-content'));
      }
    });

    state.socket.on('inbound_message', (data) => {
      showToast(`Inbound message from ${data.from}`, 'info');
      if (state.viewMode === 'dashboard' && (state.currentTab === 'logs' || state.currentTab === 'overview')) {
        renderCurrentTab();
      }
    });

    state.socket.on('sms_device_paired', (data) => {
      showToast(`Android Device "${data.device_name}" paired successfully!`, 'success');
      if (state.viewMode === 'dashboard' && state.currentTab === 'sms-gateway') {
        renderCurrentTab();
      }
    });

    state.socket.on('sms_heartbeat', (data) => {
      if (state.viewMode === 'dashboard' && state.currentTab === 'sms-gateway') {
        const battText = document.getElementById(`battery-val-${data.device_id}`);
        if (battText) {
          battText.innerText = `${data.battery_level}% ${data.is_charging ? '(Charging)' : ''}`;
        }
      }
    });

    state.socket.on('sms_job_updated', (data) => {
      if (state.viewMode === 'dashboard' && state.currentTab === 'sms-gateway') {
        if (state.activeSmsSubTab === 'logs') {
          fetchSmsLogsAndRenderTable();
        }
      }
    });
  } catch (err) {
    console.error('Socket error:', err);
  }
}

/**
 * Auth Session Verifier
 */
async function checkAuthSession() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramToken = urlParams.get('token') || urlParams.get('impersonate_token');
  if (paramToken) {
    localStorage.setItem('un_token', paramToken);
    localStorage.setItem('un_user_token', paramToken);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const token = localStorage.getItem('un_token') || localStorage.getItem('un_user_token');
  if (!token) {
    showLandingView();
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.user) {
      state.currentUser = data.user;
      showDashboardView();
      loadDashboardData();
    } else {
      localStorage.removeItem('un_token');
      localStorage.removeItem('un_user_token');
      showLandingView();
    }
  } catch (e) {
    localStorage.removeItem('un_token');
    localStorage.removeItem('un_user_token');
    showLandingView();
  }
}

function showLandingView() {
  state.viewMode = 'landing';
  document.getElementById('landing-page-view').classList.remove('hidden');
  document.getElementById('app-dashboard-view').classList.add('hidden');
  window.scrollTo(0, 0);
  lucide.createIcons();
}

function showDashboardView() {
  state.viewMode = 'dashboard';
  document.getElementById('landing-page-view').classList.add('hidden');
  document.getElementById('app-dashboard-view').classList.remove('hidden');

  // Update User Header Info
  const user = state.currentUser || {};
  document.getElementById('user-display-name').innerText = user.name || 'User Account';
  document.getElementById('user-role-badge').innerText = user.role || 'USER';
  document.getElementById('user-plan-label').innerText = `${user.plan_name || 'Free Starter'} Plan`;
  document.getElementById('header-credits-count').innerText = user.credits_remaining !== undefined ? user.credits_remaining : '200';

  // Toggle Super Admin Nav
  const adminNav = document.getElementById('admin-nav-section');
  if (user.role === 'SUPER_ADMIN') {
    adminNav.classList.remove('hidden');
  } else {
    adminNav.classList.add('hidden');
  }

  switchTab('overview');
}

/**
 * Mobile Drawer Menu
 */
function toggleMobileMenu() {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('mobile-overlay');
  if (!sidebar || !overlay) return;

  const isClosed = sidebar.classList.contains('-translate-x-full');
  if (isClosed) {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
  } else {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  }
}

function closeMobileMenu() {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('mobile-overlay');
  if (sidebar) sidebar.classList.add('-translate-x-full');
  if (overlay) overlay.classList.add('hidden');
}

/**
 * Load Landing Page Plans
 */
async function loadLandingPlans() {
  try {
    const res = await fetch('/api/billing/plans');
    const data = await res.json();
    if (data.success && data.data) {
      state.plans = data.data;
      renderLandingPlans();
    }
  } catch (e) {
    console.error('Failed to load plans:', e);
  }
}

function renderLandingPlans() {
  const container = document.getElementById('landing-plans-container');
  if (!container) return;

  container.innerHTML = state.plans.map(plan => {
    const isPopular = !!plan.is_popular;
    const isFree = parseFloat(plan.price_bdt) === 0;

    return `
      <div class="saas-card p-6 flex flex-col justify-between relative ${isPopular ? 'border-2 border-emerald-600 shadow-md ring-1 ring-emerald-600/10' : ''}">
        ${isPopular ? `
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold tracking-wide uppercase shadow-xs">
            Most Popular
          </div>
        ` : ''}

        <div class="space-y-4">
          <div>
            <h3 class="font-bold text-base text-slate-900">${escapeHtml(plan.name)}</h3>
            <p class="text-xs text-slate-500 mt-1">${plan.message_limit.toLocaleString()} Messages per Month</p>
          </div>

          <div class="flex items-baseline gap-1">
            <span class="text-3xl font-extrabold text-slate-900">${isFree ? 'Free' : '৳' + plan.price_bdt}</span>
            <span class="text-xs text-slate-500 font-medium">/ month</span>
          </div>

          <ul class="text-xs text-slate-600 space-y-2.5 pt-4 border-t border-slate-100">
            ${(plan.features || []).map(f => `
              <li class="flex items-center gap-2">
                <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600 shrink-0"></i>
                <span>${escapeHtml(f)}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="pt-6 mt-4 border-t border-slate-100">
          <button onclick="handlePlanSelect(${plan.id})" class="w-full py-2.5 rounded-lg ${isPopular ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : 'border border-slate-300 hover:bg-slate-50 text-slate-700'} text-xs font-semibold transition-colors">
            ${isFree ? 'Start Free Trial' : 'Subscribe Now'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function handlePlanSelect(planId) {
  if (!state.currentUser) {
    openAuthModal('register');
    return;
  }
  openCheckoutModal(planId);
}

/**
 * Auth Modals & Handlers
 */
function openAuthModal(mode = 'login') {
  setAuthMode(mode);
  document.getElementById('modal-auth').classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('modal-auth').classList.add('hidden');
}

function setAuthMode(mode) {
  const loginForm = document.getElementById('form-login');
  const regForm = document.getElementById('form-register');
  const tabLogin = document.getElementById('auth-tab-login');
  const tabReg = document.getElementById('auth-tab-register');
  const title = document.getElementById('auth-modal-title');

  if (mode === 'register') {
    loginForm.classList.add('hidden');
    regForm.classList.remove('hidden');
    tabReg.className = 'flex-1 pb-2 font-medium text-emerald-600 border-b-2 border-emerald-600 text-center';
    tabLogin.className = 'flex-1 pb-2 font-medium text-slate-500 hover:text-slate-700 text-center';
    title.innerHTML = '<i data-lucide="user-plus" class="w-4 h-4 text-emerald-600"></i><span>Create Free Account</span>';
  } else {
    regForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    tabLogin.className = 'flex-1 pb-2 font-medium text-emerald-600 border-b-2 border-emerald-600 text-center';
    tabReg.className = 'flex-1 pb-2 font-medium text-slate-500 hover:text-slate-700 text-center';
    title.innerHTML = '<i data-lucide="lock" class="w-4 h-4 text-emerald-600"></i><span>Account Sign In</span>';
  }
  lucide.createIcons();
}

function fillTestAccount(email, password) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = password;
}

async function handleAuthLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const btn = document.getElementById('btn-login-submit');
  btn.disabled = true;
  btn.innerText = 'Signing In...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('un_token', data.token);
      state.currentUser = data.user;
      closeAuthModal();
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      showDashboardView();
      loadDashboardData();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Sign In to Dashboard';
  }
}

async function handleAuthRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const company = document.getElementById('reg-company').value;

  const btn = document.getElementById('btn-register-submit');
  btn.disabled = true;
  btn.innerText = 'Creating Account...';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, company })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('un_token', data.token);
      state.currentUser = data.user;
      closeAuthModal();
      showToast('Registration successful! 200 free trial credits added.', 'success');
      showDashboardView();
      loadDashboardData();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Create Account & Get 200 Credits';
  }
}

function handleLogout() {
  localStorage.removeItem('un_token');
  state.currentUser = null;
  showToast('Signed out successfully', 'info');
  showLandingView();
}

/**
 * Checkout & Payment Modal
 */
function openCheckoutModal(planId) {
  const plan = state.plans.find(p => p.id === planId) || state.plans[1];
  if (!plan) return;

  document.getElementById('checkout-plan-id').value = plan.id;
  document.getElementById('checkout-plan-name').innerText = `${plan.name} - ৳${plan.price_bdt} / month`;
  updatePaymentInstructions('bkash');
  document.getElementById('modal-checkout').classList.remove('hidden');
  lucide.createIcons();
}

function closeCheckoutModal() {
  document.getElementById('modal-checkout').classList.add('hidden');
}

function updatePaymentInstructions(method) {
  const box = document.getElementById('payment-instructions-box');
  const manualFields = document.getElementById('checkout-manual-fields');

  if (method === 'bkash') {
    box.innerHTML = 'Send payment to <strong>bKash Merchant/Personal: 01700000000</strong>. Enter your Transaction ID below.';
    manualFields.classList.remove('hidden');
  } else if (method === 'nagad') {
    box.innerHTML = 'Send payment to <strong>Nagad Number: 01800000000</strong>. Enter your Transaction ID below.';
    manualFields.classList.remove('hidden');
  } else if (method === 'bank') {
    box.innerHTML = 'Bank: <strong>City Bank Ltd</strong> | A/C: <strong>1102938471</strong> | Name: <strong>Unique Notify</strong>. Enter reference TrxID.';
    manualFields.classList.remove('hidden');
  } else if (method === 'card') {
    box.innerHTML = '<span class="text-emerald-700 font-medium">Instant Online / Card Simulation:</span> Plan will activate immediately upon submission.';
    manualFields.classList.add('hidden');
  }
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  const planId = document.getElementById('checkout-plan-id').value;
  const method = document.querySelector('input[name="checkout_method"]:checked').value;
  const senderPhone = document.getElementById('checkout-sender-phone').value;
  const trxId = document.getElementById('checkout-trx-id').value;

  const btn = document.getElementById('btn-checkout-submit');
  btn.disabled = true;
  btn.innerText = 'Processing...';

  try {
    const token = localStorage.getItem('un_token');
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        plan_id: planId,
        payment_method: method,
        sender_number: senderPhone,
        transaction_id: trxId
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeCheckoutModal();
      await checkAuthSession();
      if (state.currentTab === 'billing') renderBillingTab(document.getElementById('tab-content'));
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Submit Payment';
  }
}

/**
 * Dashboard Tab Router
 */
function switchTab(tabId) {
  state.currentTab = tabId;
  closeMobileMenu();

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('bg-slate-100', 'text-slate-900', 'font-semibold');
    btn.classList.add('text-slate-600');
    const icon = btn.querySelector('svg');
    if (icon) icon.classList.remove('text-emerald-600');
  });

  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-slate-100', 'text-slate-900', 'font-semibold');
    activeBtn.classList.remove('text-slate-600');
    const icon = activeBtn.querySelector('svg');
    if (icon) icon.classList.add('text-emerald-600');
  }

  const titles = {
    overview: 'System Overview',
    otp: 'OTP Center',
    devices: 'WhatsApp Gateways',
    'sms-send': 'Quick Send SMS',
    'sms-campaign': 'Bulk SMS Campaign Manager',
    contacts: 'Phone Book & Contacts',
    'sms-devices': 'Android Mobile Nodes & SIMs',
    'sms-wallet': 'Prepaid SMS Wallet & Packages',
    'sms-logs': 'SMS Queue & Delivery Logs',
    'sms-gateway': 'Quick Send SMS',
    broadcasts: 'WhatsApp Broadcast Campaigns',
    messenger: 'Direct Messenger',
    logs: 'Delivery Logs',
    'api-keys': 'API Keys Management',
    'api-docs': 'API Reference & Integrations',
    billing: 'Plans & Subscription Billing',
    settings: 'Anti-Ban & System Settings',
    'admin-users': 'Super Admin: Client Directory',
    'admin-payments': 'Super Admin: Payment Approvals'
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.innerText = titles[tabId] || 'Dashboard';

  renderCurrentTab();
}

async function loadDashboardData() {
  await fetchStats();
  await fetchDevices();
  await fetchSettings();
  renderCurrentTab();
}

async function refreshCurrentTab() {
  await checkAuthSession();
  await fetchStats();
  await fetchDevices();
  renderCurrentTab();
  showToast('Dashboard refreshed', 'info');
}

async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success) {
      state.stats = data.stats;
      state.recentLogs = data.recent_logs;
      updateHeaderBadges();
    }
  } catch (e) {}
}

async function fetchDevices() {
  try {
    const res = await fetch('/api/v1/devices');
    const data = await res.json();
    if (data.success) {
      state.devices = data.data;
      const qrDevice = state.devices.find(d => d.type === 'qr');
      if (qrDevice) {
        state.qrStatus = qrDevice.liveStatus || qrDevice.status;
        state.connectedPhone = qrDevice.phoneNumber;
        state.qrData = qrDevice.qr;
      }
      updateHeaderBadges();
    }
  } catch (e) {}
}

async function fetchSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success) {
      state.settings = data.settings;
      state.metaConfig = data.meta_config;
    }
  } catch (e) {}
}

function updateHeaderBadges() {
  const metaPill = document.getElementById('pill-meta-status');
  const qrPill = document.getElementById('pill-qr-status');
  const sideBadge = document.getElementById('sidebar-device-badge');

  if (metaPill) {
    const isMetaOk = state.stats.meta_configured;
    metaPill.innerHTML = `
      <span class="w-1.5 h-1.5 rounded-full ${isMetaOk ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
      <span>Meta API: <strong class="${isMetaOk ? 'text-emerald-700' : 'text-slate-600'}">${isMetaOk ? 'Ready' : 'Setup Needed'}</strong></span>
    `;
  }

  if (qrPill) {
    const isQrOk = state.qrStatus === 'CONNECTED';
    qrPill.innerHTML = `
      <span class="w-1.5 h-1.5 rounded-full ${isQrOk ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
      <span>QR Device: <strong class="${isQrOk ? 'text-emerald-700' : 'text-slate-600'}">${state.qrStatus}</strong></span>
    `;
  }

  if (sideBadge) {
    const anyConnected = state.stats.meta_configured || state.qrStatus === 'CONNECTED';
    sideBadge.className = `w-2 h-2 rounded-full ${anyConnected ? 'bg-emerald-500' : 'bg-amber-400'}`;
  }
}

/**
 * Render Current Active Dashboard Tab
 */
function renderCurrentTab() {
  const container = document.getElementById('tab-content');
  if (!container) return;

  switch (state.currentTab) {
    case 'overview':
      renderOverviewTab(container);
      break;
    case 'otp':
      renderOtpTab(container);
      break;
    case 'devices':
      renderDevicesTab(container);
      break;
    case 'sms-send':
    case 'sms-gateway':
      renderSmsDirectPage(container);
      break;
    case 'sms-campaign':
      renderSmsCampaignPage(container);
      break;
    case 'sms-devices':
      renderSmsDirectPage(container);
      break;
    case 'sms-wallet':
      renderSmsWalletPage(container);
      break;
    case 'sms-logs':
      renderSmsLogsPage(container);
      break;
    case 'broadcasts':
      renderBroadcastsTab(container);
      break;
    case 'contacts':
      renderContactsTab(container);
      break;
    case 'messenger':
      renderMessengerTab(container);
      break;
    case 'logs':
      renderLogsTab(container);
      break;
    case 'api-keys':
      renderApiKeysTab(container);
      break;
    case 'api-docs':
      renderApiDocsTab(container);
      break;
    case 'billing':
      renderBillingTab(container);
      break;
    case 'settings':
      renderSettingsTab(container);
      break;
    case 'admin-users':
      renderAdminUsersTab(container);
      break;
    case 'admin-payments':
      renderAdminPaymentsTab(container);
      break;
  }

  lucide.createIcons();
}

/**
 * TAB 1: OVERVIEW
 */
function renderOverviewTab(container) {
  const s = state.stats || {};
  const user = state.currentUser || {};

  container.innerHTML = `
    <!-- Top Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="saas-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500">Credits Remaining</span>
          <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <i data-lucide="zap" class="w-4 h-4"></i>
          </div>
        </div>
        <div class="mt-3">
          <div class="text-2xl font-bold text-slate-900">${(user.credits_remaining || 0).toLocaleString()}</div>
          <div class="text-xs text-slate-500 mt-1">${user.plan_name || 'Free Starter'} Plan</div>
        </div>
      </div>

      <div class="saas-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500">Messages Dispatched</span>
          <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <i data-lucide="send" class="w-4 h-4"></i>
          </div>
        </div>
        <div class="mt-3">
          <div class="text-2xl font-bold text-slate-900">${s.total_sent || 0}</div>
          <div class="text-xs text-slate-500 mt-1">${s.total_delivered || 0} Delivered</div>
        </div>
      </div>

      <div class="saas-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500">OTP Success Rate</span>
          <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <i data-lucide="shield-check" class="w-4 h-4"></i>
          </div>
        </div>
        <div class="mt-3">
          <div class="text-2xl font-bold text-slate-900">${s.otp_success_rate || 100}%</div>
          <div class="text-xs text-slate-500 mt-1">${s.verified_otp || 0} Verified</div>
        </div>
      </div>

      <div class="saas-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500">Gateways Ready</span>
          <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <i data-lucide="cpu" class="w-4 h-4"></i>
          </div>
        </div>
        <div class="mt-3 space-y-1 text-xs">
          <div class="flex justify-between items-center">
            <span class="text-slate-500">Meta API:</span>
            <span class="font-medium ${s.meta_configured ? 'text-emerald-600' : 'text-amber-600'}">${s.meta_configured ? 'Ready' : 'Setup Needed'}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-500">QR Device:</span>
            <span class="font-medium ${state.qrStatus === 'CONNECTED' ? 'text-emerald-600' : 'text-slate-600'}">${state.qrStatus}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Dual Gateway Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="saas-card p-5 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <i data-lucide="cloud" class="w-4 h-4"></i>
              </div>
              <h2 class="font-semibold text-sm text-slate-900">Official Meta WhatsApp API</h2>
            </div>
            <span class="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Official</span>
          </div>
          <p class="text-xs text-slate-500 mt-2 leading-relaxed">
            Direct Cloud API integration via Meta Graph API v21.0. Zero ban risk for OTP verification codes and transactional notifications.
          </p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-slate-500">${s.meta_configured ? 'Configured' : 'Needs Token Setup'}</span>
          <button onclick="switchTab('devices')" class="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
            <span>Configure</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>

      <div class="saas-card p-5 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <i data-lucide="qr-code" class="w-4 h-4"></i>
              </div>
              <h2 class="font-semibold text-sm text-slate-900">Multi-Device QR Gateway</h2>
            </div>
            <span class="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Baileys</span>
          </div>
          <p class="text-xs text-slate-500 mt-2 leading-relaxed">
            Multi-device socket connection. Direct marketing dispatches with Spintax variation, typing simulation, and 5s-15s safe random delay.
          </p>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span class="text-slate-500">${state.connectedPhone ? 'Connected: ' + state.connectedPhone : 'Device: ' + state.qrStatus}</span>
          <button onclick="switchTab('devices')" class="text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
            <span>${state.qrStatus === 'CONNECTED' ? 'Manage' : 'Scan Code'}</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Live Activity Table -->
    <div class="saas-card overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <h2 class="font-semibold text-sm text-slate-900 flex items-center gap-2">
          <i data-lucide="activity" class="w-4 h-4 text-emerald-600"></i>
          <span>Live Activity Feed</span>
        </h2>
        <button onclick="switchTab('logs')" class="text-xs font-medium text-emerald-600 hover:text-emerald-700">View All Logs &rarr;</button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-medium text-[11px] border-b border-slate-200/80">
            <tr>
              <th class="py-2.5 px-4">Gateway</th>
              <th class="py-2.5 px-4">Recipient</th>
              <th class="py-2.5 px-4">Type</th>
              <th class="py-2.5 px-4">Content</th>
              <th class="py-2.5 px-4">Status</th>
              <th class="py-2.5 px-4">Time</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${(state.recentLogs && state.recentLogs.length > 0) ? state.recentLogs.map(log => `
              <tr class="hover:bg-slate-50/70">
                <td class="py-2.5 px-4">
                  <span class="px-2 py-0.5 rounded text-[10px] font-medium ${log.gateway_type === 'meta' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
                    ${log.gateway_type.toUpperCase()}
                  </span>
                </td>
                <td class="py-2.5 px-4 font-mono text-slate-700">${log.recipient_phone}</td>
                <td class="py-2.5 px-4 text-slate-500">${log.message_type}</td>
                <td class="py-2.5 px-4 max-w-xs truncate text-slate-700">${escapeHtml(log.content || '')}</td>
                <td class="py-2.5 px-4">
                  <span class="px-2 py-0.5 rounded text-[10px] font-medium badge-${(log.status || 'sent').toLowerCase()}">
                    ${log.status}
                  </span>
                </td>
                <td class="py-2.5 px-4 text-slate-400 font-mono text-[11px]">${formatDate(log.created_at)}</td>
              </tr>
            `).join('') : `
              <tr><td colspan="6" class="py-8 text-center text-slate-400">No dispatches logged yet. Use Quick Send to test.</td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * TAB: USER SUBSCRIPTION & BILLING
 */
async function renderBillingTab(container) {
  const token = localStorage.getItem('un_token');
  let subData = null;

  try {
    const res = await fetch('/api/billing/my-subscription', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.success) subData = json.data;
  } catch (e) {}

  const user = subData?.user || state.currentUser || {};
  const plan = subData?.plan || {};
  const payments = subData?.payments || [];

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- Current Plan Status Card -->
      <div class="saas-card p-6 border-l-4 border-emerald-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="font-bold text-base text-slate-900">${plan.name || 'Free Starter'}</h2>
            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">${user.plan_status || 'ACTIVE'}</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">Available Message Balance: <strong>${(user.credits_remaining || 0).toLocaleString()} Credits</strong></p>
        </div>

        <div class="flex items-center gap-3">
          <button onclick="openCheckoutModal(2)" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs">
            Upgrade Subscription
          </button>
        </div>
      </div>

      <!-- Upgrade Plans Grid -->
      <div class="space-y-3">
        <h3 class="font-semibold text-sm text-slate-900">Available Subscription Plans</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${state.plans.map(p => `
            <div class="saas-card p-5 flex flex-col justify-between ${p.id === user.plan_id ? 'border-2 border-emerald-600' : ''}">
              <div>
                <div class="flex items-center justify-between">
                  <h4 class="font-bold text-slate-900 text-sm">${escapeHtml(p.name)}</h4>
                  ${p.id === user.plan_id ? '<span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Current</span>' : ''}
                </div>
                <div class="mt-2 text-2xl font-bold text-slate-900">${parseFloat(p.price_bdt) === 0 ? 'Free' : '৳' + p.price_bdt} <span class="text-xs font-normal text-slate-500">/ mo</span></div>
                <p class="text-xs text-slate-500 mt-1">${p.message_limit.toLocaleString()} Messages included</p>
                <ul class="text-xs text-slate-600 space-y-1.5 mt-3 pt-3 border-t border-slate-100">
                  ${(p.features || []).map(f => `<li class="flex items-center gap-1.5"><i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i> ${escapeHtml(f)}</li>`).join('')}
                </ul>
              </div>
              <div class="mt-4 pt-3 border-t border-slate-100">
                <button onclick="openCheckoutModal(${p.id})" class="w-full py-2 rounded-lg ${p.id === user.plan_id ? 'border border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'} text-xs font-medium" ${p.id === user.plan_id ? 'disabled' : ''}>
                  ${p.id === user.plan_id ? 'Active Plan' : 'Select Plan'}
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Payment History Table -->
      <div class="saas-card overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-semibold text-sm text-slate-900">Payment History</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 font-medium text-[11px] border-b border-slate-200/80">
              <tr>
                <th class="py-2.5 px-4">Plan</th>
                <th class="py-2.5 px-4">Amount</th>
                <th class="py-2.5 px-4">Method</th>
                <th class="py-2.5 px-4">TrxID</th>
                <th class="py-2.5 px-4">Status</th>
                <th class="py-2.5 px-4">Date</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              ${payments.length > 0 ? payments.map(pm => `
                <tr class="hover:bg-slate-50/70">
                  <td class="py-2.5 px-4 text-slate-900">${pm.plan_name || 'Plan #' + pm.plan_id}</td>
                  <td class="py-2.5 px-4 font-mono text-slate-700">৳${pm.amount}</td>
                  <td class="py-2.5 px-4 text-slate-600 uppercase">${pm.payment_method}</td>
                  <td class="py-2.5 px-4 font-mono text-slate-700">${pm.transaction_id}</td>
                  <td class="py-2.5 px-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${pm.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : pm.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                      ${pm.status}
                    </span>
                  </td>
                  <td class="py-2.5 px-4 text-slate-400 font-mono text-[11px]">${formatDate(pm.created_at)}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="6" class="py-6 text-center text-slate-400">No payment transactions found.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

/**
 * TAB: SUPER ADMIN USERS LIST
 */
async function renderAdminUsersTab(container) {
  const token = localStorage.getItem('un_token');
  let users = [];

  try {
    const res = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } });
    const json = await res.json();
    if (json.success) users = json.data;
  } catch (e) {}

  container.innerHTML = `
    <div class="saas-card overflow-hidden space-y-4">
      <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 class="font-semibold text-sm text-slate-900">SaaS Client Directory</h2>
          <p class="text-xs text-slate-500 mt-0.5">Total registered clients: ${users.length}</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-medium text-[11px] border-b border-slate-200/80">
            <tr>
              <th class="py-2.5 px-4">ID</th>
              <th class="py-2.5 px-4">Name</th>
              <th class="py-2.5 px-4">Email</th>
              <th class="py-2.5 px-4">Company</th>
              <th class="py-2.5 px-4">Plan</th>
              <th class="py-2.5 px-4">Credits Remaining</th>
              <th class="py-2.5 px-4">Role</th>
              <th class="py-2.5 px-4">Joined</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            ${users.map(u => `
              <tr class="hover:bg-slate-50/70">
                <td class="py-2.5 px-4 text-slate-400 font-mono">#${u.id}</td>
                <td class="py-2.5 px-4 font-semibold text-slate-900">${escapeHtml(u.name)}</td>
                <td class="py-2.5 px-4 text-slate-600">${escapeHtml(u.email)}</td>
                <td class="py-2.5 px-4 text-slate-500">${escapeHtml(u.company || '-')}</td>
                <td class="py-2.5 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">${u.plan_name || 'Free Starter'}</span></td>
                <td class="py-2.5 px-4 font-mono text-emerald-700 font-bold">${(u.credits_remaining || 0).toLocaleString()}</td>
                <td class="py-2.5 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-semibold ${u.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-slate-50 text-slate-700'}">${u.role}</span></td>
                <td class="py-2.5 px-4 text-slate-400 font-mono text-[11px]">${formatDate(u.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * TAB: SUPER ADMIN PAYMENT APPROVALS
 */
async function renderAdminPaymentsTab(container) {
  const token = localStorage.getItem('un_token');
  let payments = [];

  try {
    const res = await fetch('/api/admin/payments', { headers: { 'Authorization': `Bearer ${token}` } });
    const json = await res.json();
    if (json.success) payments = json.data;
  } catch (e) {}

  container.innerHTML = `
    <div class="saas-card overflow-hidden space-y-4">
      <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 class="font-semibold text-sm text-slate-900">Subscription Payment Approvals</h2>
          <p class="text-xs text-slate-500 mt-0.5">Approve bKash, Nagad, and Bank payment submissions to activate client plans.</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-medium text-[11px] border-b border-slate-200/80">
            <tr>
              <th class="py-2.5 px-4">User</th>
              <th class="py-2.5 px-4">Requested Plan</th>
              <th class="py-2.5 px-4">Amount</th>
              <th class="py-2.5 px-4">Gateway</th>
              <th class="py-2.5 px-4">Sender Phone</th>
              <th class="py-2.5 px-4">Transaction ID</th>
              <th class="py-2.5 px-4">Status</th>
              <th class="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            ${payments.length > 0 ? payments.map(pm => `
              <tr class="hover:bg-slate-50/70">
                <td class="py-2.5 px-4">
                  <div class="font-semibold text-slate-900">${escapeHtml(pm.user_name)}</div>
                  <div class="text-[11px] text-slate-400">${pm.user_email}</div>
                </td>
                <td class="py-2.5 px-4 text-slate-800">${pm.plan_name}</td>
                <td class="py-2.5 px-4 font-mono font-bold text-slate-900">৳${pm.amount}</td>
                <td class="py-2.5 px-4 uppercase text-slate-600 font-semibold">${pm.payment_method}</td>
                <td class="py-2.5 px-4 font-mono text-slate-700">${pm.sender_number || '-'}</td>
                <td class="py-2.5 px-4 font-mono text-emerald-700 font-bold">${pm.transaction_id}</td>
                <td class="py-2.5 px-4">
                  <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${pm.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : pm.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                    ${pm.status}
                  </span>
                </td>
                <td class="py-2.5 px-4 text-right space-x-1.5">
                  ${pm.status === 'PENDING' ? `
                    <button onclick="handleAdminApprovePayment(${pm.id})" class="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shadow-xs">Approve</button>
                    <button onclick="handleAdminRejectPayment(${pm.id})" class="px-2.5 py-1 rounded border border-rose-200 hover:bg-rose-50 text-rose-700 text-[11px] font-semibold">Reject</button>
                  ` : `
                    <span class="text-slate-400 text-xs">Processed</span>
                  `}
                </td>
              </tr>
            `).join('') : `
              <tr><td colspan="8" class="py-8 text-center text-slate-400">No payment submissions pending.</td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function handleAdminApprovePayment(id) {
  const token = localStorage.getItem('un_token');
  try {
    const res = await fetch(`/api/admin/payments/${id}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      renderAdminPaymentsTab(document.getElementById('tab-content'));
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleAdminRejectPayment(id) {
  if (!confirm('Reject this payment submission?')) return;
  const token = localStorage.getItem('un_token');
  try {
    const res = await fetch(`/api/admin/payments/${id}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'info');
      renderAdminPaymentsTab(document.getElementById('tab-content'));
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * OTP, DEVICES, BROADCASTS, LOGS, API KEYS, SETTINGS TABS
 */
async function renderOtpTab(container) {
  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="saas-card p-5 space-y-4">
        <div>
          <h2 class="font-semibold text-sm text-slate-900 flex items-center gap-2">
            <i data-lucide="send" class="w-4 h-4 text-emerald-600"></i>
            <span>Dispatch Test OTP</span>
          </h2>
          <p class="text-xs text-slate-500 mt-1">High-speed OTP dispatch via Meta Cloud API or QR Multi-Device engine.</p>
        </div>

        <form id="otp-send-form" onsubmit="handleSendOtpSubmit(event)" class="space-y-3 pt-1 text-xs">
          <div>
            <label class="block font-medium text-slate-700 mb-1">Phone Number</label>
            <input type="text" id="otp-phone" required placeholder="017xxxxxxxx or 88017xxxxxxxx" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Brand / Service Name</label>
            <input type="text" id="otp-service" value="Unique-Notify" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 mb-1">Length</label>
              <select id="otp-length" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
                <option value="6" selected>6 Digits</option>
                <option value="4">4 Digits</option>
              </select>
            </div>
            <div>
              <label class="block font-medium text-slate-700 mb-1">Gateway</label>
              <select id="otp-gateway" class="w-full bg-slate-900 text-white rounded-lg px-3 py-2 text-xs focus:outline-none">
                <option value="auto">Auto Route</option>
                <option value="meta">Meta Cloud API</option>
                <option value="qr">QR Device</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Expiry (Minutes)</label>
            <input type="number" id="otp-expiry" value="5" min="1" max="60" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <button type="submit" id="btn-send-otp" class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs">
            Dispatch OTP
          </button>
        </form>
      </div>

      <div class="saas-card p-5 space-y-4">
        <div>
          <h2 class="font-semibold text-sm text-slate-900 flex items-center gap-2">
            <i data-lucide="shield-check" class="w-4 h-4 text-blue-600"></i>
            <span>Verify OTP Code</span>
          </h2>
          <p class="text-xs text-slate-500 mt-1">Verify user input code against the verification database.</p>
        </div>

        <form id="otp-verify-form" onsubmit="handleVerifyOtpSubmit(event)" class="space-y-3 pt-1 text-xs">
          <div>
            <label class="block font-medium text-slate-700 mb-1">Phone Number</label>
            <input type="text" id="verify-phone" required placeholder="017xxxxxxxx or 88017xxxxxxxx" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Received Code</label>
            <input type="text" id="verify-code" required placeholder="582910" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono tracking-widest text-center text-base font-bold focus:border-blue-600 focus:outline-none">
          </div>
          <button type="submit" id="btn-verify-otp" class="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs">
            Verify Code
          </button>
        </form>
        <div id="verify-result-box" class="hidden p-3 rounded-lg text-xs font-medium border"></div>
      </div>

      <div class="saas-card p-5 space-y-3">
        <div class="flex items-center gap-2">
          <i data-lucide="code" class="w-4 h-4 text-slate-700"></i>
          <h2 class="font-semibold text-sm text-slate-900">API 1-Liner</h2>
        </div>
        <p class="text-xs text-slate-500 leading-relaxed">
          Call <code class="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">POST /api/v1/otp/send</code>:
        </p>
        <pre class="bg-slate-50 p-3 rounded-lg text-[11px] font-mono text-slate-800 border border-slate-200 overflow-x-auto">
$client->sendOtp(
  phone: '01700000000',
  serviceName: 'WHMCS'
);</pre>
        <div class="text-[11px] text-slate-500 space-y-1 pt-1">
          <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Cryptographically random digits</div>
          <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 5-minute auto expiration</div>
          <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Max 3 attempts lock</div>
        </div>
      </div>
    </div>

    <div class="saas-card overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
        <h2 class="font-semibold text-sm text-slate-900 flex items-center gap-2">
          <i data-lucide="history" class="w-4 h-4 text-slate-600"></i>
          <span>OTP Audit Log</span>
        </h2>
        <button onclick="renderOtpTab(document.getElementById('tab-content'))" class="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
        </button>
      </div>
      <div id="otp-logs-table-container" class="overflow-x-auto">
        <div class="text-center py-6 text-slate-400 text-xs">Loading logs...</div>
      </div>
    </div>
  `;

  loadOtpLogs();
}

async function loadOtpLogs() {
  const container = document.getElementById('otp-logs-table-container');
  if (!container) return;

  try {
    const res = await fetch('/api/v1/otp/logs?limit=25');
    const data = await res.json();
    if (data.success && data.data) {
      container.innerHTML = `
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-medium text-[11px] border-b border-slate-200/80">
            <tr>
              <th class="py-2.5 px-4">Recipient</th>
              <th class="py-2.5 px-4">Brand</th>
              <th class="py-2.5 px-4">Gateway</th>
              <th class="py-2.5 px-4">Status</th>
              <th class="py-2.5 px-4">Attempts</th>
              <th class="py-2.5 px-4">Sent At</th>
              <th class="py-2.5 px-4">Verified At</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            ${data.data.length > 0 ? data.data.map(log => `
              <tr class="hover:bg-slate-50/70">
                <td class="py-2.5 px-4 font-mono text-slate-800">${log.phone}</td>
                <td class="py-2.5 px-4 text-slate-600">${log.service_name}</td>
                <td class="py-2.5 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">${log.gateway_used}</span></td>
                <td class="py-2.5 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-medium badge-${log.status.toLowerCase()}">${log.status}</span></td>
                <td class="py-2.5 px-4 text-slate-500">${log.attempts || 0}</td>
                <td class="py-2.5 px-4 text-slate-400 font-mono text-[11px]">${formatDate(log.created_at)}</td>
                <td class="py-2.5 px-4 text-emerald-700 font-mono text-[11px]">${log.verified_at ? formatDate(log.verified_at) : '-'}</td>
              </tr>
            `).join('') : `
              <tr><td colspan="7" class="py-6 text-center text-slate-400">No OTP logs recorded yet.</td></tr>
            `}
          </tbody>
        </table>
      `;
    }
  } catch (e) {
    container.innerHTML = `<div class="text-rose-600 text-xs py-4 text-center">Failed to load: ${e.message}</div>`;
  }
}

function renderDevicesTab(container) {
  const isMetaConfigured = state.stats.meta_configured;
  const isQrConnected = state.qrStatus === 'CONNECTED';
  const meta = state.metaConfig || {};

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="saas-card p-5 sm:p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <i data-lucide="cloud" class="w-5 h-5"></i>
            </div>
            <div>
              <h2 class="font-semibold text-sm text-slate-900">Meta WhatsApp Cloud API</h2>
              <p class="text-xs text-slate-500">Official Graph API (Zero Ban Risk)</p>
            </div>
          </div>
          <span class="px-2.5 py-0.5 rounded-md text-xs font-medium ${isMetaConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
            ${isMetaConfigured ? 'Connected' : 'Setup Needed'}
          </span>
        </div>

        <form id="meta-config-form" onsubmit="handleSaveMetaConfig(event)" class="space-y-3.5 pt-1 text-xs">
          <div>
            <label class="block font-medium text-slate-700 mb-1">Phone Number ID</label>
            <input type="text" id="meta-phone-id" value="${meta.phone_number_id || ''}" placeholder="104829381729384" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-blue-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">WABA Account ID</label>
            <input type="text" id="meta-waba-id" value="${meta.waba_id || ''}" placeholder="109283746192837" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-blue-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Permanent System User Token</label>
            <input type="password" id="meta-token" value="${meta.access_token || ''}" placeholder="EAAB..." class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-blue-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Webhook URL</label>
            <div class="flex gap-2">
              <input type="text" readonly value="${window.location.origin}/api/v1/webhook/meta" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 font-mono" id="meta-webhook-url">
              <button type="button" onclick="copyToClipboard(document.getElementById('meta-webhook-url').value)" class="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium shrink-0">Copy</button>
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Verify Token: <code class="font-mono text-slate-600">${meta.verify_token || 'unique_notify_verify_token_123'}</code></p>
          </div>

          <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button type="submit" class="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs">Save Meta Credentials</button>
            <button type="button" onclick="handleTestMetaConnection()" class="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium">Test Connection</button>
            <button type="button" onclick="handleSyncTemplates()" class="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-blue-700 font-medium">Sync Templates</button>
          </div>
        </form>
      </div>

      <div class="saas-card p-5 sm:p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i data-lucide="smartphone" class="w-5 h-5"></i>
            </div>
            <div>
              <h2 class="font-semibold text-sm text-slate-900">Personal & Business Device Gateway</h2>
              <p class="text-xs text-slate-500">Baileys Multi-Device Socket Session</p>
            </div>
          </div>
          <span class="px-2.5 py-0.5 rounded-md text-xs font-medium ${isQrConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">${isQrConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        <div class="p-6 bg-slate-50 border border-slate-200/80 rounded-xl text-center flex flex-col items-center justify-center min-h-[250px]">
          ${isQrConnected ? `
            <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5"><i data-lucide="check" class="w-6 h-6"></i></div>
            <h3 class="font-semibold text-slate-900 text-sm">WhatsApp Device Connected</h3>
            <p class="text-emerald-700 font-mono font-bold text-sm mt-0.5">+${state.connectedPhone || 'Active'}</p>
            <p class="text-xs text-slate-500 mt-1 max-w-xs">Device is online and ready for OTP dispatches and marketing campaigns.</p>
            <div class="mt-4"><button onclick="handleLogoutQr()" class="px-3.5 py-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold">Disconnect Device</button></div>
          ` : `
            ${state.qrData ? `
              <div class="p-2 bg-white rounded-lg border border-slate-200 shadow-xs mb-3">
                <img src="${state.qrData}" alt="QR Code" class="w-44 h-44 rounded-md mx-auto">
              </div>
              <p class="text-xs font-semibold text-slate-800">Scan QR Code from WhatsApp</p>
              <p class="text-[11px] text-slate-500 mt-0.5">Open WhatsApp &gt; Linked Devices &gt; Link a Device</p>
              <div class="mt-4 flex gap-2">
                <button onclick="handleInitQr()" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs flex items-center gap-1.5">
                  <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                  <span>Refresh QR</span>
                </button>
                <button onclick="handleCancelQr()" class="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs">
                  Cancel
                </button>
              </div>
            ` : `
              <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
                <i data-lucide="smartphone-charging" class="w-6 h-6 text-slate-400"></i>
              </div>
              <h3 class="font-semibold text-slate-800 text-sm">No WhatsApp Device Linked</h3>
              <p class="text-xs text-slate-500 mt-1 max-w-xs">Click "Add Device" to generate a dynamic pairing QR code on demand.</p>
              <div class="mt-4">
                <button id="btn-add-device" onclick="handleInitQr()" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2">
                  <i data-lucide="plus-circle" class="w-4 h-4"></i>
                  <span>Add Device / Connect WhatsApp</span>
                </button>
              </div>
            `}
          `}
        </div>

        <div class="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div class="font-medium text-slate-700 flex items-center gap-1.5"><i data-lucide="shield" class="w-3.5 h-3.5 text-emerald-600"></i><span>Active Anti-Ban Protections:</span></div>
          <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
            <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Human Typing Simulation</div>
            <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 5-15s Safe Jitter Delay</div>
            <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Dynamic Spintax Engine</div>
            <div class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Daily Message Quota Guard</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * DEDICATED SMS PAGE CONTROLLERS (INDIVIDUAL SUB-MENU ROUTING)
 */
async function ensureSmsStateLoaded() {
  try {
    const token = localStorage.getItem('un_token');
    const [walletRes, devicesRes] = await Promise.all([
      fetch('/api/v1/sms/wallet', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/v1/sms/devices', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    const walletJson = await walletRes.json();
    const devicesJson = await devicesRes.json();
    if (walletJson.success) state.smsWallet = walletJson.data;
    if (devicesJson.success) state.smsDevices = devicesJson.data || [];
  } catch (e) {
    console.error('Failed to load SMS wallet/devices state:', e);
  }
}

async function loadSmsDirectRecentLogs() {
  const box = document.getElementById('sms-direct-recent-logs');
  if (!box) return;
  try {
    const token = localStorage.getItem('un_token');
    const res = await fetch('/api/v1/sms/logs?limit=5', { headers: { 'Authorization': `Bearer ${token}` } });
    const json = await res.json();
    const logs = json.success ? (json.data || []) : [];
    if (logs.length === 0) {
      box.innerHTML = '<p class="text-slate-400 py-3 text-center text-xs">No recent SMS dispatches.</p>';
      return;
    }
    box.innerHTML = `
      <div class="space-y-2">
        ${logs.map(log => `
          <div class="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs">
            <div>
              <p class="font-mono font-bold text-slate-800 text-[11px]">${escapeHtml(log.recipient)}</p>
              <p class="text-[10px] text-slate-500 truncate max-w-[130px]">${escapeHtml(log.message)}</p>
            </div>
            <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase ${log.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : log.status === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'}">
              ${log.status}
            </span>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    box.innerHTML = '<p class="text-slate-400 py-2 text-xs">Unable to load recent logs.</p>';
  }
}

async function renderSmsDirectPage(container) {
  await ensureSmsStateLoaded();
  const wallet = state.smsWallet || { sms_balance: 0, sms_credits: 0, rate_per_sms: 0.35 };

  container.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 class="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <i data-lucide="send" class="w-5 h-5 text-emerald-600"></i>
            <span>Quick Send SMS</span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Direct single SMS dispatcher with real-time character counter and automatic cellular routing.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="switchTab('sms-wallet')" class="px-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition">
            <i data-lucide="wallet" class="w-3.5 h-3.5 text-emerald-600"></i>
            <span>Wallet: ৳${parseFloat(wallet.sms_balance || 0).toFixed(2)}</span>
          </button>
          <button onclick="switchTab('sms-logs')" class="px-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition">
            <i data-lucide="list-filter" class="w-3.5 h-3.5 text-emerald-600"></i>
            <span>SMS Logs</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2" id="sms-direct-form-box"></div>
        <div class="space-y-4">
          <div class="saas-card p-5 space-y-3">
            <h3 class="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <i data-lucide="info" class="w-4 h-4 text-emerald-600"></i>
              <span>SMS Routing &amp; Rates</span>
            </h3>
            <ul class="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li class="flex items-start gap-2">
                <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5"></i>
                <span><strong>Platform Cloud Route:</strong> ৳${parseFloat(wallet.rate_per_sms || 0.35).toFixed(2)} / SMS part deducted from prepaid balance.</span>
              </li>
              <li class="flex items-start gap-2">
                <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5"></i>
                <span><strong>Dedicated Sender ID:</strong> If assigned a dedicated Sender ID by admin, dispatch directly through your assigned route.</span>
              </li>
              <li class="flex items-start gap-2">
                <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5"></i>
                <span><strong>Length Standards:</strong> English GSM 7-bit is 160 chars. Bengali/Unicode is 70 chars per SMS.</span>
              </li>
            </ul>
          </div>
          <div class="saas-card p-5 space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-xs text-slate-900 uppercase tracking-wider">Recent Dispatches</h3>
              <button onclick="switchTab('sms-logs')" class="text-emerald-700 hover:text-emerald-800 text-[11px] font-semibold">View All Logs &rarr;</button>
            </div>
            <div id="sms-direct-recent-logs" class="text-xs text-slate-500">Loading recent logs...</div>
          </div>
        </div>
      </div>
    </div>
  `;
  renderSmsDirectSubTab(document.getElementById('sms-direct-form-box'));
  loadSmsDirectRecentLogs();
  lucide.createIcons();
}

async function renderSmsCampaignPage(container) {
  await ensureSmsStateLoaded();
  const wallet = state.smsWallet || { sms_balance: 0, sms_credits: 0, rate_per_sms: 0.35 };

  container.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 class="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <i data-lucide="megaphone" class="w-5 h-5 text-emerald-600"></i>
            <span>Bulk SMS Campaign Manager</span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Launch high-volume marketing and notification campaigns with automated rate-limiting, randomized anti-ban delay, and Spintax.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="switchTab('contacts')" class="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5">
            <i data-lucide="book-user" class="w-4 h-4 text-emerald-600"></i>
            <span>Phone Book &amp; Contacts</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2" id="sms-campaign-form-box"></div>
        <div class="space-y-4">
          <div class="saas-card p-5 space-y-3">
            <h3 class="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i>
              <span>Anti-Ban &amp; Safety Guidelines</span>
            </h3>
            <ul class="text-xs text-slate-600 space-y-2 leading-relaxed">
              <li class="flex items-start gap-2">
                <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5"></i>
                <span>Use Spintax syntax like <code class="font-mono text-emerald-700">{Hello|Hi|Greetings}</code> to randomize outbound texts.</span>
              </li>
              <li class="flex items-start gap-2">
                <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5"></i>
                <span>Randomized delay intervals (3s - 10s) prevent carrier spam filters from throttling your numbers.</span>
              </li>
              <li class="flex items-start gap-2">
                <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5"></i>
                <span>Import contacts directly from Phone Book or paste hundreds of comma/newline separated numbers.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
  renderSmsBroadcastSubTab(document.getElementById('sms-campaign-form-box'));
  lucide.createIcons();
}

async function renderSmsDevicesPage(container) {
  await ensureSmsStateLoaded();
  container.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 class="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <i data-lucide="smartphone" class="w-5 h-5 text-emerald-600"></i>
            <span>Android Mobile Nodes &amp; SIM Cards</span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Turn your Android phones into high-throughput cellular SMS dispatch gateways using SIM 1 and SIM 2.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="renderSmsDevicesPage(document.getElementById('tab-content'))" class="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" title="Refresh">
            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
          </button>
          <button onclick="openPairAndroidModal()" class="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>Pair New Android Node</span>
          </button>
        </div>
      </div>
      <div id="sms-devices-grid-box"></div>
    </div>
  `;
  await renderSmsDevicesSubTab(document.getElementById('sms-devices-grid-box'));
  lucide.createIcons();
}

async function renderSmsWalletPage(container) {
  await ensureSmsStateLoaded();
  const wallet = state.smsWallet || { sms_balance: 0, sms_credits: 0, rate_per_sms: 0.35, min_recharge: 50 };

  container.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 class="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <i data-lucide="wallet" class="w-5 h-5 text-emerald-600"></i>
            <span>Prepaid SMS Wallet &amp; Bundle Packages</span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Manage your cash balance for pay-as-you-go dispatch (৳${parseFloat(wallet.rate_per_sms || 0.35).toFixed(2)}/SMS) or buy discounted high-volume bundles.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="openSmsRechargeModal()" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5">
            <i data-lucide="credit-card" class="w-4 h-4"></i>
            <span>Top Up Cash Balance</span>
          </button>
        </div>
      </div>

      <div id="sms-wallet-content-box"></div>
    </div>
  `;
  await renderSmsWalletSubTab(document.getElementById('sms-wallet-content-box'));
  lucide.createIcons();
}

async function renderSmsLogsPage(container) {
  container.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 class="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <i data-lucide="list-filter" class="w-5 h-5 text-emerald-600"></i>
            <span>SMS Queue &amp; Dispatch Logs</span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Real-time delivery status, carrier DLR responses, and instant retry for failed cellular messages.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="fetchSmsLogsAndRenderTable()" class="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      <div id="sms-logs-content-box"></div>
    </div>
  `;
  await renderSmsLogsSubTab(document.getElementById('sms-logs-content-box'));
  lucide.createIcons();
}

/**
 * TAB: SMS GATEWAY (PAY-AS-YOU-GO PLATFORM GATEWAY & ANDROID DUAL-SIM)
 */
async function renderSmsGatewayTab(container) {
  const activeSubTab = state.activeSmsSubTab || 'send';

  // Fetch wallet & devices info
  try {
    const token = localStorage.getItem('un_token');
    const [walletRes, devicesRes] = await Promise.all([
      fetch('/api/v1/sms/wallet', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/v1/sms/devices', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    const walletJson = await walletRes.json();
    const devicesJson = await devicesRes.json();
    if (walletJson.success) state.smsWallet = walletJson.data;
    if (devicesJson.success) state.smsDevices = devicesJson.data || [];
  } catch (e) {
    console.error('Failed to load SMS wallet/devices state:', e);
  }

  const wallet = state.smsWallet || { sms_balance: 0, sms_credits: 0, rate_per_sms: 0.35, min_recharge: 50 };
  const deviceCount = (state.smsDevices || []).length;

  container.innerHTML = `
    <!-- Top Stats / Sub Navigation Strip -->
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h2 class="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <i data-lucide="radio" class="w-5 h-5 text-emerald-600"></i>
            <span>SMS Gateway &amp; Prepaid Wallet</span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Send SMS via Platform Cloud Gateway (৳${wallet.rate_per_sms.toFixed(2)}/SMS) or link your Android phone for free cellular SIM 1 / 2 dispatch.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="openPairAndroidModal()" class="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition flex items-center gap-1.5">
            <i data-lucide="smartphone" class="w-4 h-4 text-emerald-600"></i>
            <span>Pair Android Phone</span>
          </button>
          <button onclick="openSmsRechargeModal()" class="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5">
            <i data-lucide="credit-card" class="w-4 h-4"></i>
            <span>Recharge Balance</span>
          </button>
        </div>
      </div>

      <!-- 4 Top KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Card 1: SMS Cash Balance -->
        <div class="saas-card p-4 border-t-2 border-emerald-600 flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">SMS Cash Balance</span>
            <div class="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">৳</div>
          </div>
          <div class="mt-2 flex items-baseline justify-between">
            <span id="sms-kpi-balance" class="text-2xl font-black text-slate-900">৳${parseFloat(wallet.sms_balance || 0).toFixed(2)}</span>
            <button onclick="openSmsRechargeModal()" class="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold">Top Up</button>
          </div>
          <p class="text-[10px] text-slate-400 mt-1">Min Recharge ৳${parseFloat(wallet.min_recharge || 50).toFixed(0)} | Pay As You Go</p>
        </div>

        <!-- Card 2: Bundle SMS Credits -->
        <div class="saas-card p-4 border-t-2 border-blue-600 flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Bundle Credits</span>
            <div class="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <i data-lucide="zap" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="mt-2 flex items-baseline justify-between">
            <span id="sms-kpi-credits" class="text-2xl font-black text-slate-900">${parseInt(wallet.sms_credits || 0, 10).toLocaleString()} <span class="text-xs font-semibold text-slate-500">SMS</span></span>
            <button onclick="setSmsSubTab('wallet')" class="text-[11px] text-blue-700 hover:text-blue-800 font-semibold">Buy Bundle</button>
          </div>
          <p class="text-[10px] text-slate-400 mt-1">Prepaid allowance priority</p>
        </div>

        <!-- Card 3: Platform SMS Rate -->
        <div class="saas-card p-4 border-t-2 border-purple-600 flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cloud SMS Rate</span>
            <div class="w-7 h-7 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
              <i data-lucide="tag" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="mt-2">
            <span class="text-2xl font-black text-slate-900">৳${parseFloat(wallet.rate_per_sms || 0.35).toFixed(2)}</span>
            <span class="text-xs font-semibold text-slate-500">/ SMS part</span>
          </div>
          <p class="text-[10px] text-slate-400 mt-1">160 GSM / 70 Unicode chars</p>
        </div>

        <!-- Card 4: Android Phone Nodes -->
        <div class="saas-card p-4 border-t-2 border-slate-700 flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Android Devices</span>
            <div class="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
              <i data-lucide="smartphone" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="mt-2 flex items-baseline justify-between">
            <span class="text-2xl font-black text-slate-900">${deviceCount} <span class="text-xs font-semibold text-slate-500">Linked</span></span>
            <button onclick="setSmsSubTab('devices')" class="text-[11px] text-slate-700 hover:text-slate-900 font-semibold">Manage</button>
          </div>
          <p class="text-[10px] text-slate-400 mt-1">SIM 1 &amp; SIM 2 Free Dispatch</p>
        </div>
      </div>

      <!-- Sub Navigation Tabs -->
      <div class="flex flex-wrap gap-2 border-b border-slate-200 text-xs font-semibold">
        <button onclick="setSmsSubTab('send')" id="sms-subtab-btn-send" class="pb-3 px-3 border-b-2 ${activeSubTab === 'send' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'} flex items-center gap-1.5">
          <i data-lucide="send" class="w-4 h-4"></i>
          <span>Direct SMS Dispatcher</span>
        </button>
        <button onclick="setSmsSubTab('wallet')" id="sms-subtab-btn-wallet" class="pb-3 px-3 border-b-2 ${activeSubTab === 'wallet' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'} flex items-center gap-1.5">
          <i data-lucide="wallet" class="w-4 h-4"></i>
          <span>SMS Wallet &amp; Packages</span>
        </button>
        <button onclick="setSmsSubTab('devices')" id="sms-subtab-btn-devices" class="pb-3 px-3 border-b-2 ${activeSubTab === 'devices' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'} flex items-center gap-1.5">
          <i data-lucide="smartphone" class="w-4 h-4"></i>
          <span>Android Mobile Nodes (${deviceCount})</span>
        </button>
        <button onclick="setSmsSubTab('broadcast')" id="sms-subtab-btn-broadcast" class="pb-3 px-3 border-b-2 ${activeSubTab === 'broadcast' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'} flex items-center gap-1.5">
          <i data-lucide="megaphone" class="w-4 h-4"></i>
          <span>SMS Broadcast Campaign</span>
        </button>
        <button onclick="setSmsSubTab('logs')" id="sms-subtab-btn-logs" class="pb-3 px-3 border-b-2 ${activeSubTab === 'logs' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'} flex items-center gap-1.5">
          <i data-lucide="list-filter" class="w-4 h-4"></i>
          <span>SMS Queue &amp; Logs</span>
        </button>
      </div>

      <!-- Sub-Tab Content View -->
      <div id="sms-subtab-container">
        <!-- Rendered by setSmsSubTab -->
      </div>
    </div>

    <!-- Pairing Code Modal -->
    <div id="modal-pair-android" class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
      <div class="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i data-lucide="smartphone" class="w-4 h-4"></i>
            </div>
            <div>
              <h3 class="font-bold text-sm text-slate-900">Pair Android SMS Gateway</h3>
              <p class="text-xs text-slate-500">Connect your mobile phone in seconds</p>
            </div>
          </div>
          <button onclick="closePairAndroidModal()" class="text-slate-400 hover:text-slate-600 p-1">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <div class="p-6 space-y-5 text-xs">
          <div class="text-center space-y-2">
            <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Your Pairing Code</span>
            <div class="p-4 bg-slate-50 border-2 border-dashed border-emerald-500 rounded-xl flex items-center justify-center gap-3">
              <span id="android-pairing-code-display" class="font-mono text-3xl font-extrabold text-emerald-700 tracking-widest">------</span>
              <button onclick="copyToClipboard(document.getElementById('android-pairing-code-display').innerText)" class="p-2 border border-slate-200 rounded-lg hover:bg-white text-slate-600" title="Copy Code">
                <i data-lucide="copy" class="w-4 h-4"></i>
              </button>
            </div>
            <p id="android-pairing-code-timer" class="text-[11px] text-slate-400">Valid for 10 minutes</p>
          </div>

          <!-- Step by step instructions -->
          <div class="space-y-3 pt-2 border-t border-slate-100">
            <div class="font-bold text-slate-800 text-xs">3 Simple Steps to Connect:</div>
            <div class="space-y-2.5 text-slate-600">
              <div class="flex items-start gap-2.5">
                <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                <div>Install the <strong>Unique-Notify Gateway APK</strong> on your Android phone (find APK in <code class="font-mono text-slate-700">/android-gateway</code>).</div>
              </div>
              <div class="flex items-start gap-2.5">
                <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                <div>Open the app, enter your Server URL (<code class="font-mono text-slate-700" id="android-modal-server-url">${window.location.origin}</code>) and enter the 6-character code above.</div>
              </div>
              <div class="flex items-start gap-2.5">
                <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                <div>Grant SMS and Phone State permissions, enable the <strong>SMS Dispatch Worker</strong> switch, and tap <strong>Battery Exemption</strong>.</div>
              </div>
            </div>
          </div>

          <div class="pt-2 flex justify-end">
            <button onclick="closePairAndroidModal()" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs">
              Done &amp; Check Devices
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recharge Balance Modal -->
    <div id="modal-sms-recharge" class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
      <div class="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">৳</div>
            <div>
              <h3 class="font-bold text-sm text-slate-900">Top-Up SMS Balance</h3>
              <p class="text-xs text-slate-500">Instant credit upon TrxID verification</p>
            </div>
          </div>
          <button onclick="closeSmsRechargeModal()" class="text-slate-400 hover:text-slate-600 p-1">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <form id="form-sms-modal-recharge" onsubmit="handleModalSmsRechargeSubmit(event)" class="p-6 space-y-4 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Recharge Amount (BDT)</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-slate-400 font-bold">৳</span>
              <input type="number" id="sms-modal-recharge-amount" min="${wallet.min_recharge || 50}" step="10" value="100" required class="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2.5 text-slate-900 font-bold text-base focus:border-emerald-600 focus:outline-none">
            </div>
            <p class="text-[11px] text-slate-400 mt-1">Minimum recharge amount is ৳${parseFloat(wallet.min_recharge || 50).toFixed(0)}.</p>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Select Payment Method</label>
            <div class="grid grid-cols-3 gap-2">
              <label class="flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 cursor-pointer bg-white">
                <input type="radio" name="sms_modal_pay_method" value="bkash" checked onchange="updateSmsModalPayInfo('bkash')" class="mb-1 text-emerald-600">
                <span class="font-bold text-xs text-slate-800">bKash</span>
              </label>
              <label class="flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 cursor-pointer bg-white">
                <input type="radio" name="sms_modal_pay_method" value="nagad" onchange="updateSmsModalPayInfo('nagad')" class="mb-1 text-emerald-600">
                <span class="font-bold text-xs text-slate-800">Nagad</span>
              </label>
              <label class="flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 cursor-pointer bg-white">
                <input type="radio" name="sms_modal_pay_method" value="rocket" onchange="updateSmsModalPayInfo('rocket')" class="mb-1 text-emerald-600">
                <span class="font-bold text-xs text-slate-800">Rocket</span>
              </label>
            </div>
          </div>

          <div id="sms-modal-pay-box" class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed text-[11px]">
            Send Money / Payment to bKash Number: <strong class="font-mono text-slate-900 font-bold" id="sms-modal-pay-number">${wallet.payment_methods?.bkash || '01700000000'}</strong>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Sender Mobile</label>
              <input type="text" id="sms-modal-sender-phone" required placeholder="017xxxxxxxx" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-emerald-600 focus:outline-none">
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Transaction ID (TrxID)</label>
              <input type="text" id="sms-modal-trx-id" required placeholder="e.g. 9B8C7A6D5E" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono uppercase focus:border-emerald-600 focus:outline-none">
            </div>
          </div>

          <div class="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onclick="closeSmsRechargeModal()" class="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold">Cancel</button>
            <button type="submit" id="btn-sms-modal-recharge-submit" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs">Submit Top-Up</button>
          </div>
        </form>
      </div>
    </div>
  `;

  await setSmsSubTab(activeSubTab);
  lucide.createIcons();
}

async function setSmsSubTab(subTab) {
  state.activeSmsSubTab = subTab;
  const container = document.getElementById('sms-subtab-container');
  if (!container) return;

  document.querySelectorAll('[id^="sms-subtab-btn-"]').forEach(btn => {
    btn.className = 'pb-3 px-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-1.5';
  });
  const activeBtn = document.getElementById(`sms-subtab-btn-${subTab}`);
  if (activeBtn) {
    activeBtn.className = 'pb-3 px-3 border-b-2 border-emerald-600 text-emerald-700 flex items-center gap-1.5';
  }

  if (subTab === 'send') {
    renderSmsDirectSubTab(container);
  } else if (subTab === 'wallet') {
    await renderSmsWalletSubTab(container);
  } else if (subTab === 'devices') {
    await renderSmsDevicesSubTab(container);
  } else if (subTab === 'broadcast') {
    renderSmsBroadcastSubTab(container);
  } else if (subTab === 'logs') {
    await renderSmsLogsSubTab(container);
  }

  lucide.createIcons();
}

function openSmsRechargeModal() {
  const modal = document.getElementById('modal-sms-recharge');
  if (modal) modal.classList.remove('hidden');
  updateSmsModalPayInfo('bkash');
}

function closeSmsRechargeModal() {
  const modal = document.getElementById('modal-sms-recharge');
  if (modal) modal.classList.add('hidden');
}

function updateSmsModalPayInfo(method) {
  const box = document.getElementById('sms-modal-pay-box');
  if (!box) return;
  const pm = state.smsWallet?.payment_methods || {};
  const num = pm[method] || '01700000000';
  box.innerHTML = `Send Money / Payment to ${method.toUpperCase()} Number: <strong class="font-mono text-slate-900 font-bold">${num}</strong>. Submit your TrxID below.`;
}

async function handleModalSmsRechargeSubmit(e) {
  e.preventDefault();
  const amount = document.getElementById('sms-modal-recharge-amount').value;
  const method = document.querySelector('input[name="sms_modal_pay_method"]:checked')?.value || 'bkash';
  const senderPhone = document.getElementById('sms-modal-sender-phone').value.trim();
  const trxId = document.getElementById('sms-modal-trx-id').value.trim();

  const btn = document.getElementById('btn-sms-modal-recharge-submit');
  btn.disabled = true;
  btn.innerText = 'Submitting...';

  try {
    const token = localStorage.getItem('un_token');
    const res = await fetch('/api/v1/sms/wallet/recharge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount_bdt: amount,
        payment_method: method,
        sender_number: senderPhone,
        transaction_id: trxId
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      closeSmsRechargeModal();
      document.getElementById('form-sms-modal-recharge').reset();
      // Reload SMS Tab
      if (state.currentTab === 'sms-wallet') {
        renderSmsWalletPage(document.getElementById('tab-content'));
      } else {
        renderSmsGatewayTab(document.getElementById('tab-content'));
      }
    } else {
      showToast(json.message || 'Recharge failed', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Submit Top-Up';
  }
}

/**
 * SUB-TAB 1: ANDROID MOBILE NODES
 */
async function renderSmsDevicesSubTab(container) {
  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-500">Loading connected Android devices...</div>`;

  try {
    const token = localStorage.getItem('un_token');
    const res = await fetch('/api/v1/sms/devices', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    state.smsDevices = json.success ? (json.data || []) : [];

    const sideSmsBadge = document.getElementById('sidebar-sms-badge');
    if (sideSmsBadge) {
      sideSmsBadge.className = `w-2 h-2 rounded-full ${state.smsDevices.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`;
    }

    if (state.smsDevices.length === 0) {
      container.innerHTML = `
        <div class="saas-card p-10 text-center space-y-4">
          <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <i data-lucide="smartphone" class="w-7 h-7"></i>
          </div>
          <div class="max-w-md mx-auto space-y-1">
            <h3 class="font-bold text-sm text-slate-900">No Android SMS Gateways Connected</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Connect any Android smartphone to turn it into your dedicated cellular SMS gateway. Supports Dual-SIM routing (SIM 1 and SIM 2 selection).
            </p>
          </div>
          <button onclick="openPairAndroidModal()" class="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition inline-flex items-center gap-2">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>Pair Android Phone Now</span>
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${state.smsDevices.map(dev => {
          const isOnline = dev.status === 'online';
          const sim1 = dev.sim1_operator || 'Empty';
          const sim2 = dev.sim2_operator || 'Empty';
          const defaultSlot = dev.default_sim_slot || 1;

          return `
            <div id="sms-device-card-${dev.id}" class="saas-card p-5 space-y-4 relative flex flex-col justify-between border-t-4 ${isOnline ? 'border-emerald-600' : 'border-slate-300'}">
              <div class="space-y-3">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'} flex items-center justify-center">
                      <i data-lucide="smartphone" class="w-5 h-5"></i>
                    </div>
                    <div>
                      <h4 class="font-bold text-sm text-slate-900">${escapeHtml(dev.device_name || 'Android Device')}</h4>
                      <p class="text-[11px] text-slate-400 font-mono">${dev.phone_number || 'SIM Ready'}</p>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">
                    ${isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                <!-- Battery & Health Info -->
                <div class="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div class="flex items-center gap-1.5 text-slate-600">
                    <i data-lucide="battery-charging" class="w-4 h-4 text-emerald-600"></i>
                    <span id="battery-val-${dev.id}" class="device-battery-text font-medium">${dev.battery_level !== null ? dev.battery_level + '%' : '--'} ${dev.is_charging ? '(Charging)' : ''}</span>
                  </div>
                  <div class="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                    <i data-lucide="clock" class="w-3.5 h-3.5 text-slate-400"></i>
                    <span>${dev.last_seen_at ? formatDate(dev.last_seen_at) : 'Never'}</span>
                  </div>
                </div>

                <!-- Dual SIM Slots Box -->
                <div class="space-y-2 pt-1">
                  <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cellular SIM Slots</div>
                  
                  <!-- SIM 1 -->
                  <div class="flex items-center justify-between p-2 rounded-lg border ${defaultSlot === 1 ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-white'} text-xs">
                    <div class="flex items-center gap-2">
                      <span class="w-5 h-5 rounded-md ${defaultSlot === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'} flex items-center justify-center font-bold text-[10px]">1</span>
                      <div>
                        <div class="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>SIM 1: ${escapeHtml(sim1)}</span>
                          ${dev.sim1_sender_id ? `<span class="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">ID: ${escapeHtml(dev.sim1_sender_id)}</span>` : ''}
                        </div>
                        ${defaultSlot === 1 ? '<span class="text-[10px] text-emerald-700 font-semibold">Active Default</span>' : ''}
                      </div>
                    </div>
                    ${defaultSlot !== 1 ? `
                      <button onclick="handleSetDefaultSim('${dev.id}', 1)" class="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-[10px] font-semibold text-slate-700">Set Default</button>
                    ` : ''}
                  </div>

                  <!-- SIM 2 -->
                  <div class="flex items-center justify-between p-2 rounded-lg border ${defaultSlot === 2 ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-white'} text-xs">
                    <div class="flex items-center gap-2">
                      <span class="w-5 h-5 rounded-md ${defaultSlot === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'} flex items-center justify-center font-bold text-[10px]">2</span>
                      <div>
                        <div class="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>SIM 2: ${escapeHtml(sim2)}</span>
                          ${dev.sim2_sender_id ? `<span class="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px] font-bold font-mono">ID: ${escapeHtml(dev.sim2_sender_id)}</span>` : ''}
                        </div>
                        ${defaultSlot === 2 ? '<span class="text-[10px] text-emerald-700 font-semibold">Active Default</span>' : ''}
                      </div>
                    </div>
                    ${defaultSlot !== 2 ? `
                      <button onclick="handleSetDefaultSim('${dev.id}', 2)" class="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 text-[10px] font-semibold text-slate-700">Set Default</button>
                    ` : ''}
                  </div>
                </div>
              </div>

              <!-- Card Actions -->
              <div class="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button onclick="switchTab('sms-send')" class="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1">
                  <span>Send SMS via this device</span>
                  <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="handleDeleteSmsDevice('${dev.id}')" class="text-rose-600 hover:text-rose-700 font-medium" title="Unlink Device">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="text-rose-600 text-xs py-4 text-center">Failed to load devices: ${err.message}</div>`;
  }
}

async function openPairAndroidModal() {
  const modal = document.getElementById('modal-pair-android');
  if (!modal) return;
  modal.classList.remove('hidden');

  const codeDisplay = document.getElementById('android-pairing-code-display');
  codeDisplay.innerText = 'GENERATING...';

  try {
    const token = localStorage.getItem('un_token');
    const res = await fetch('/api/v1/sms/device/pair-request', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.success && json.data) {
      codeDisplay.innerText = json.data.code;
    } else {
      codeDisplay.innerText = 'ERROR';
      showToast(json.message || 'Failed to generate code', 'error');
    }
  } catch (e) {
    codeDisplay.innerText = 'ERROR';
    showToast(e.message, 'error');
  }
  lucide.createIcons();
}

function closePairAndroidModal() {
  const modal = document.getElementById('modal-pair-android');
  if (modal) modal.classList.add('hidden');
  if (state.currentTab === 'sms-devices') {
    renderSmsDevicesPage(document.getElementById('tab-content'));
  } else if (state.currentTab === 'sms-gateway' && state.activeSmsSubTab === 'devices') {
    renderSmsDevicesSubTab(document.getElementById('sms-subtab-container'));
  }
}

async function handleSetDefaultSim(deviceId, simSlot) {
  try {
    const token = localStorage.getItem('un_token');
    const res = await fetch(`/api/v1/sms/devices/${deviceId}/default-sim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ sim_slot: simSlot })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Default SIM updated to SIM ${simSlot}`, 'success');
      if (state.currentTab === 'sms-devices') {
        renderSmsDevicesPage(document.getElementById('tab-content'));
      } else {
        renderSmsDevicesSubTab(document.getElementById('sms-subtab-container'));
      }
    } else {
      showToast(json.message, 'error');
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function handleDeleteSmsDevice(deviceId) {
  if (!confirm('Are you sure you want to disconnect this Android device?')) return;
  try {
    const token = localStorage.getItem('un_token');
    const res = await fetch(`/api/v1/sms/devices/${deviceId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.success) {
      showToast('Device removed successfully', 'info');
      if (state.currentTab === 'sms-devices') {
        renderSmsDevicesPage(document.getElementById('tab-content'));
      } else {
        renderSmsDevicesSubTab(document.getElementById('sms-subtab-container'));
      }
    } else {
      showToast(json.message, 'error');
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

/**
 * SUB-TAB 2: DIRECT SMS SENDER
 */
function renderSmsDirectSubTab(container) {
  const wallet = state.smsWallet || { sms_balance: 0, sms_credits: 0, rate_per_sms: 0.35 };
  const devices = state.smsDevices || [];
  const rate = parseFloat(wallet.rate_per_sms || 0.35);

  let deviceOptions = '';
  if (devices.length > 0) {
    deviceOptions = `
      <optgroup label="Dedicated Assigned Sender IDs">
        ${devices.map(dev => {
          const sim1Label = dev.sim1_sender_id ? `${dev.sim1_sender_id} (${dev.sim1_operator || 'SIM 1'})` : (dev.sim1_operator || 'Ready');
          const sim2Label = dev.sim2_sender_id ? `${dev.sim2_sender_id} (${dev.sim2_operator || 'SIM 2'})` : (dev.sim2_operator || 'Ready');
          return `
            <option value="android_sim_${dev.id}_1" ${dev.default_sim_slot === 1 ? 'selected' : ''}>${escapeHtml(dev.device_name)} - SIM 1: ${escapeHtml(sim1Label)}</option>
            <option value="android_sim_${dev.id}_2" ${dev.default_sim_slot === 2 ? 'selected' : ''}>${escapeHtml(dev.device_name)} - SIM 2: ${escapeHtml(sim2Label)}</option>
          `;
        }).join('')}
      </optgroup>
    `;
  }

  container.innerHTML = `
    <div class="max-w-2xl mx-auto saas-card p-6 space-y-5">
      <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
        <div>
          <h3 class="font-bold text-sm text-slate-900">Direct Single SMS Dispatcher</h3>
          <p class="text-xs text-slate-500 mt-0.5">Send a real-time cellular SMS via Platform Cloud Gateway or your Android SIM.</p>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Wallet Balance</span>
          <span class="text-xs font-bold text-emerald-700">৳${parseFloat(wallet.sms_balance || 0).toFixed(2)} (${wallet.sms_credits || 0} Credits)</span>
        </div>
      </div>

      <form id="direct-sms-form" onsubmit="handleDirectSmsSubmit(event)" class="space-y-4 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Recipient Mobile Number</label>
          <input type="text" id="direct-sms-recipient" required placeholder="017xxxxxxxx or +88017xxxxxxxx" class="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 font-mono focus:border-emerald-600 focus:outline-none">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">SMS Dispatch Route</label>
            <select id="direct-sms-gateway" onchange="updateSmsCharCounter()" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none">
              <optgroup label="Platform Gateway (Pay As You Go)">
                <option value="cloud_gateway" selected>Platform Cloud SMS Gateway (৳${rate.toFixed(2)} / SMS)</option>
              </optgroup>
              ${deviceOptions}
            </select>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Encoding &amp; Cost Estimation</label>
            <div id="direct-sms-encoding-badge" class="px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-mono text-[11px] flex items-center justify-between">
              <span>GSM 7-bit</span>
              <span class="text-emerald-700 font-bold">160 Chars | ৳${rate.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="font-semibold text-slate-700">SMS Text Message</label>
            <span id="direct-sms-char-counter" class="text-[11px] font-mono text-slate-500">0 / 160 characters (1 SMS part)</span>
          </div>
          <textarea id="direct-sms-message" rows="4" required oninput="updateSmsCharCounter()" placeholder="Write your SMS text message here..." class="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:border-emerald-600 focus:outline-none"></textarea>
        </div>

        <div id="direct-sms-cost-preview" class="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 text-slate-600">
            <i data-lucide="calculator" class="w-4 h-4 text-emerald-600"></i>
            <span>Estimated Billing:</span>
            <strong id="sms-cost-text" class="text-emerald-700 font-bold">৳${rate.toFixed(2)} BDT (1 SMS part)</strong>
          </div>
          <span class="text-[11px] text-slate-400 font-mono" id="sms-cost-channel-text">Platform Cloud Gateway</span>
        </div>

        <button type="submit" id="btn-direct-sms-submit" class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition flex items-center justify-center gap-2">
          <i data-lucide="send" class="w-4 h-4"></i>
          <span>Dispatch SMS</span>
        </button>
      </form>
    </div>
  `;
}

function updateSmsCharCounter() {
  const textarea = document.getElementById('direct-sms-message');
  const counter = document.getElementById('direct-sms-char-counter');
  const badge = document.getElementById('direct-sms-encoding-badge');
  const gatewaySelect = document.getElementById('direct-sms-gateway');
  const costText = document.getElementById('sms-cost-text');
  const channelText = document.getElementById('sms-cost-channel-text');
  if (!textarea || !counter) return;

  const text = textarea.value;
  const isUnicode = /[^\u0000-\u007F]/.test(text);
  const rate = parseFloat(state.smsWallet?.rate_per_sms || 0.35);
  const isCloud = !gatewaySelect || gatewaySelect.value === 'cloud_gateway';

  let parts = 1;
  if (isUnicode) {
    const limit = text.length <= 70 ? 70 : 67;
    parts = text.length === 0 ? 1 : Math.ceil(text.length / limit);
    counter.innerText = `${text.length} chars (Unicode) - ${parts} SMS part(s)`;
    counter.className = 'text-[11px] font-mono text-blue-700 font-semibold';
    if (badge) {
      badge.innerHTML = `<span>Unicode UTF-16</span><span class="text-blue-700 font-bold">70 Chars/Part</span>`;
    }
  } else {
    const limit = text.length <= 160 ? 160 : 153;
    parts = text.length === 0 ? 1 : Math.ceil(text.length / limit);
    counter.innerText = `${text.length} / 160 chars - ${parts} SMS part(s)`;
    counter.className = 'text-[11px] font-mono text-slate-500';
    if (badge) {
      badge.innerHTML = `<span>GSM 7-bit</span><span class="text-emerald-700 font-bold">160 Chars/Part</span>`;
    }
  }

  if (costText) {
    if (isCloud) {
      const totalCost = (parts * rate).toFixed(2);
      costText.innerText = `৳${totalCost} BDT (${parts} SMS part${parts > 1 ? 's' : ''})`;
      if (channelText) channelText.innerText = 'Debited from SMS Wallet';
    } else {
      costText.innerText = `৳0.00 Free (${parts} part${parts > 1 ? 's' : ''})`;
      if (channelText) channelText.innerText = 'Sent via Android Cellular SIM';
    }
  }
}

async function handleDirectSmsSubmit(e) {
  e.preventDefault();
  const recipient = document.getElementById('direct-sms-recipient').value.trim();
  const gatewayVal = document.getElementById('direct-sms-gateway').value;
  const message = document.getElementById('direct-sms-message').value.trim();

  let simSlot = 1;
  let gatewayType = 'cloud_gateway';
  let deviceId = null;

  if (gatewayVal.startsWith('android_sim_')) {
    const parts = gatewayVal.replace('android_sim_', '').split('_');
    deviceId = parts[0];
    simSlot = parseInt(parts[1] || '1', 10);
    gatewayType = 'android_sim';
  } else {
    gatewayType = 'cloud_gateway';
  }

  const btn = document.getElementById('btn-direct-sms-submit');
  btn.disabled = true;
  btn.innerText = 'Dispatching...';

  try {
    const token = localStorage.getItem('un_token');
    const res = await fetch('/api/v1/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        recipient,
        message,
        gateway_type: gatewayType,
        sim_slot: simSlot,
        device_id: deviceId
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`SMS queued successfully (ID #${json.data?.job_id || ''})`, 'success');
      document.getElementById('direct-sms-form').reset();
      updateSmsCharCounter();
      // Reload wallet balance in background
      try {
        const wRes = await fetch('/api/v1/sms/wallet', { headers: { 'Authorization': `Bearer ${token}` } });
        const wJson = await wRes.json();
        if (wJson.success) {
          state.smsWallet = wJson.data;
          const kpiBal = document.getElementById('sms-kpi-balance');
          const kpiCred = document.getElementById('sms-kpi-credits');
          if (kpiBal) kpiBal.innerText = `৳${parseFloat(wJson.data.sms_balance || 0).toFixed(2)}`;
          if (kpiCred) kpiCred.innerText = `${parseInt(wJson.data.sms_credits || 0, 10).toLocaleString()} SMS`;
        }
      } catch {}
      if (state.currentTab === 'sms-send') {
        loadSmsDirectRecentLogs();
      } else {
        setTimeout(() => setSmsSubTab('logs'), 1000);
      }
    } else {
      showToast(json.message || 'Failed to dispatch SMS', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i><span>Dispatch SMS</span>';
    lucide.createIcons();
  }
}

/**
 * SUB-TAB 3: SMS BROADCAST CAMPAIGN
 */
function renderSmsBroadcastSubTab(container) {
  const wallet = state.smsWallet || { sms_balance: 0, sms_credits: 0, rate_per_sms: 0.35 };
  const devices = state.smsDevices || [];
  const rate = parseFloat(wallet.rate_per_sms || 0.35);

  let deviceOptions = '';
  if (devices.length > 0) {
    deviceOptions = `
      <optgroup label="Dedicated Assigned Sender IDs">
        ${devices.map(dev => {
          const sim1Label = dev.sim1_sender_id ? `${dev.sim1_sender_id} (${dev.sim1_operator || 'SIM 1'})` : (dev.sim1_operator || 'SIM 1');
          const sim2Label = dev.sim2_sender_id ? `${dev.sim2_sender_id} (${dev.sim2_operator || 'SIM 2'})` : (dev.sim2_operator || 'SIM 2');
          return `
            <option value="android_sim_${dev.id}_1">${escapeHtml(dev.device_name)} - SIM 1: ${escapeHtml(sim1Label)}</option>
            <option value="android_sim_${dev.id}_2">${escapeHtml(dev.device_name)} - SIM 2: ${escapeHtml(sim2Label)}</option>
          `;
        }).join('')}
      </optgroup>
    `;
  }

  container.innerHTML = `
    <div class="max-w-2xl mx-auto saas-card p-6 space-y-5">
      <div class="border-b border-slate-100 pb-3">
        <h3 class="font-bold text-sm text-slate-900">Create SMS Bulk Campaign</h3>
        <p class="text-xs text-slate-500 mt-0.5">Send promotional or notification SMS to multiple contacts with safe randomized throttling.</p>
      </div>

      <form id="sms-broadcast-form" onsubmit="handleSmsBroadcastSubmit(event)" class="space-y-4 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Campaign Name</label>
          <input type="text" id="sms-camp-name" required placeholder="Summer Discount Campaign" class="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none">
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Sending Route</label>
          <select id="sms-camp-gateway" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none">
            <optgroup label="Platform Gateway">
              <option value="cloud_gateway" selected>Platform Cloud SMS Gateway (৳${rate.toFixed(2)} / SMS)</option>
            </optgroup>
            ${deviceOptions}
          </select>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">Recipients (One number per line)</label>
          <textarea id="sms-camp-numbers" rows="4" required placeholder="01711111111&#10;01722222222&#10;01833333333" class="w-full bg-white border border-slate-300 rounded-lg p-3 font-mono text-slate-900 focus:border-emerald-600 focus:outline-none"></textarea>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="font-semibold text-slate-700">Message Template</label>
            <span class="text-[11px] text-emerald-700 font-semibold font-mono">Spintax {Hi|Hello} Supported</span>
          </div>
          <textarea id="sms-camp-message" rows="4" required placeholder="{Hi|Hello|Dear customer}, we have an exclusive offer for you..." class="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:border-emerald-600 focus:outline-none"></textarea>
          <div class="flex flex-wrap gap-1 mt-1.5">
            <button type="button" onclick="insertVariable('sms-camp-message', '{name}')" class="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700 hover:bg-slate-200 font-mono">+ {name}</button>
            <button type="button" onclick="insertVariable('sms-camp-message', '{phone}')" class="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700 hover:bg-slate-200 font-mono">+ {phone}</button>
            <button type="button" onclick="insertVariable('sms-camp-message', '{Hi|Hello|Greetings}')" class="px-2 py-0.5 rounded bg-emerald-50 text-[10px] text-emerald-700 border border-emerald-200 font-mono">+ Spintax</button>
          </div>
        </div>

        <button type="submit" id="btn-sms-broadcast-submit" class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition flex items-center justify-center gap-2">
          <i data-lucide="megaphone" class="w-4 h-4"></i>
          <span>Queue SMS Broadcast</span>
        </button>
      </form>
    </div>
  `;
}

async function handleSmsBroadcastSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('sms-camp-name').value.trim();
  const gatewayVal = document.getElementById('sms-camp-gateway').value;
  const numbersText = document.getElementById('sms-camp-numbers').value.trim();
  const message = document.getElementById('sms-camp-message').value.trim();

  const recipients = numbersText.split('\n').map(n => n.trim()).filter(n => n.length > 0);
  if (recipients.length === 0) {
    showToast('Please enter at least one recipient number', 'error');
    return;
  }

  let simSlot = 1;
  let gatewayType = 'cloud_gateway';
  let deviceId = null;

  if (gatewayVal.startsWith('android_sim_')) {
    const parts = gatewayVal.replace('android_sim_', '').split('_');
    deviceId = parts[0];
    simSlot = parseInt(parts[1] || '1', 10);
    gatewayType = 'android_sim';
  } else {
    gatewayType = 'cloud_gateway';
  }

  const btn = document.getElementById('btn-sms-broadcast-submit');
  btn.disabled = true;
  btn.innerText = 'Queueing Broadcast...';

  try {
    const token = localStorage.getItem('un_token');
    const res = await fetch('/api/v1/sms/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        campaign_name: name,
        recipients,
        message,
        gateway_type: gatewayType,
        sim_slot: simSlot,
        device_id: deviceId
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Campaign queued: ${json.data?.queued_count || recipients.length} SMS scheduled`, 'success');
      if (state.currentTab === 'sms-campaign') {
        setTimeout(() => switchTab('sms-logs'), 1000);
      } else {
        setTimeout(() => setSmsSubTab('logs'), 1000);
      }
    } else {
      showToast(json.message || 'Failed to start broadcast', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="megaphone" class="w-4 h-4"></i><span>Queue SMS Broadcast</span>';
    lucide.createIcons();
  }
}

/**
 * SUB-TAB 4: SMS WALLET & PACKAGES
 */
async function renderSmsWalletSubTab(container) {
  container.innerHTML = `<div class="p-8 text-center text-xs text-slate-500">Loading wallet &amp; SMS packages...</div>`;

  try {
    const token = localStorage.getItem('un_token');
    const [wRes, pRes] = await Promise.all([
      fetch('/api/v1/sms/wallet', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/v1/sms/packages', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    const wJson = await wRes.json();
    const pJson = await pRes.json();

    const wallet = wJson.success ? wJson.data : { sms_balance: 0, sms_credits: 0, rate_per_sms: 0.35, min_recharge: 50 };
    const packages = pJson.success ? pJson.data : [];
    state.smsWallet = wallet;
    state.smsPackages = packages;

    const txs = wallet.recent_transactions || [];

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Top Row: Top-up Form & Wallet Info -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Wallet Balance & Direct Recharge Box -->
          <div class="saas-card p-5 space-y-4 lg:col-span-1">
            <div class="border-b border-slate-100 pb-3">
              <h3 class="font-bold text-sm text-slate-900 flex items-center gap-2">
                <i data-lucide="wallet" class="w-4 h-4 text-emerald-600"></i>
                <span>Prepaid SMS Recharge</span>
              </h3>
              <p class="text-xs text-slate-500 mt-0.5">Top-up your balance for Pay-As-You-Go Cloud SMS.</p>
            </div>

            <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-500">Available Balance:</span>
                <span class="font-bold text-emerald-700 font-mono text-sm">৳${parseFloat(wallet.sms_balance || 0).toFixed(2)}</span>
              </div>
              <div class="flex justify-between items-center text-xs">
                <span class="text-slate-500">Bundle Credits:</span>
                <span class="font-bold text-blue-700 font-mono text-sm">${parseInt(wallet.sms_credits || 0, 10).toLocaleString()} SMS</span>
              </div>
              <div class="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                <span class="text-slate-500">Cloud SMS Rate:</span>
                <span class="font-semibold text-slate-800 font-mono">৳${parseFloat(wallet.rate_per_sms || 0.35).toFixed(2)} / SMS</span>
              </div>
            </div>

            <form id="form-direct-sms-recharge" onsubmit="handleDirectRechargeSubmit(event)" class="space-y-3 text-xs">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Recharge Amount (BDT)</label>
                <div class="relative">
                  <span class="absolute left-3 top-2 text-slate-400 font-bold">৳</span>
                  <input type="number" id="recharge-bdt-amount" min="${wallet.min_recharge || 50}" step="10" value="100" required class="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-slate-900 font-bold focus:border-emerald-600 focus:outline-none">
                </div>
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select id="recharge-bdt-method" onchange="updateDirectRechargeInfo(this.value)" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
                  <option value="bkash">bKash (Send Money / Merchant)</option>
                  <option value="nagad">Nagad Payment</option>
                  <option value="rocket">Rocket DBBL</option>
                </select>
              </div>

              <div id="direct-recharge-info-box" class="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg text-slate-700 text-[11px] leading-relaxed">
                Send to bKash Number: <strong class="font-mono text-slate-900 font-bold" id="direct-recharge-number">${wallet.payment_methods?.bkash || '01700000000'}</strong>
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Sender Mobile Number</label>
                <input type="text" id="recharge-sender-phone" required placeholder="017xxxxxxxx" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-emerald-600 focus:outline-none">
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Transaction ID (TrxID)</label>
                <input type="text" id="recharge-trx-id" required placeholder="e.g. 9B8C7A6D5E" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono uppercase focus:border-emerald-600 focus:outline-none">
              </div>

              <button type="submit" id="btn-recharge-submit" class="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs">
                Submit Top-Up Request
              </button>
            </form>
          </div>

          <!-- SMS Packages Grid -->
          <div class="saas-card p-5 space-y-4 lg:col-span-2">
            <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 class="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <i data-lucide="package" class="w-4 h-4 text-blue-600"></i>
                  <span>Prepaid SMS Bundle Packages</span>
                </h3>
                <p class="text-xs text-slate-500 mt-0.5">Discounted bulk bundles with guaranteed delivery priority.</p>
              </div>
              <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Instant Activation</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              ${packages.map(pkg => {
                const isPopular = pkg.price_bdt >= 300 && pkg.price_bdt <= 400;
                return `
                  <div class="p-4 rounded-xl border ${isPopular ? 'border-2 border-emerald-600 shadow-xs ring-1 ring-emerald-600/10' : 'border-slate-200'} bg-white flex flex-col justify-between space-y-3 relative">
                    ${isPopular ? `
                      <span class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold tracking-wide uppercase shadow-2xs">Best Value</span>
                    ` : ''}

                    <div class="space-y-2">
                      <h4 class="font-bold text-slate-900 text-sm">${escapeHtml(pkg.name)}</h4>
                      <div class="flex items-baseline gap-1">
                        <span class="text-2xl font-black text-slate-900">৳${pkg.price_bdt}</span>
                        <span class="text-[10px] text-slate-400 font-medium">/ ${pkg.validity_days || 365} days</span>
                      </div>
                      <div class="text-xs font-semibold text-emerald-700">${pkg.sms_count.toLocaleString()} SMS Credits</div>
                      <div class="text-[10px] text-slate-400 font-mono">৳${parseFloat(pkg.price_per_sms || 0.35).toFixed(2)} / SMS</div>

                      <ul class="text-[11px] text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                        ${(pkg.features || []).map(f => `
                          <li class="flex items-center gap-1.5"><i data-lucide="check" class="w-3 h-3 text-emerald-600 shrink-0"></i><span>${escapeHtml(f)}</span></li>
                        `).join('')}
                      </ul>
                    </div>

                    <div class="space-y-1.5 pt-2 border-t border-slate-100">
                      <button onclick="handleBuyPackageWithWallet(${pkg.id}, '${escapeHtml(pkg.name)}', ${pkg.price_bdt}, ${pkg.sms_count})" class="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition">
                        Buy with Wallet
                      </button>
                      <button onclick="openBuyPackageManualModal(${pkg.id}, '${escapeHtml(pkg.name)}', ${pkg.price_bdt}, ${pkg.sms_count})" class="w-full py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition">
                        Pay via bKash / Nagad
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Transactions History Table -->
        <div class="saas-card overflow-hidden space-y-3">
          <div class="p-4 border-b border-slate-100 flex items-center justify-between">
            <h4 class="font-bold text-sm text-slate-900 flex items-center gap-2">
              <i data-lucide="history" class="w-4 h-4 text-slate-500"></i>
              <span>SMS Wallet &amp; Bundle Transactions</span>
            </h4>
            <span class="text-xs text-slate-400">${txs.length} Recent Records</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-500 font-semibold text-[11px] border-b border-slate-200/80">
                <tr>
                  <th class="py-2.5 px-4">Trx ID / Ref</th>
                  <th class="py-2.5 px-4">Type</th>
                  <th class="py-2.5 px-4">Amount / Credits</th>
                  <th class="py-2.5 px-4">Balance After</th>
                  <th class="py-2.5 px-4">Method / TrxID</th>
                  <th class="py-2.5 px-4">Status</th>
                  <th class="py-2.5 px-4">Date</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                ${txs.length > 0 ? txs.map(t => {
                  const statusClass = t.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    t.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-rose-50 text-rose-700 border-rose-200';

                  const typeLabel = t.type === 'TOPUP_RECHARGE' ? 'Top-Up Recharge' :
                    t.type === 'PACKAGE_PURCHASE' ? 'Package Purchase' :
                    t.type === 'SMS_DEBIT' ? 'SMS Usage Debit' :
                    t.type === 'REFUND' ? 'SMS Refund' : t.type;

                  return `
                    <tr class="hover:bg-slate-50/70">
                      <td class="py-2.5 px-4 font-mono text-slate-400">#${t.id}</td>
                      <td class="py-2.5 px-4 font-semibold text-slate-900">${typeLabel}</td>
                      <td class="py-2.5 px-4 font-mono">
                        ${t.amount_bdt > 0 ? `৳${parseFloat(t.amount_bdt).toFixed(2)}` : ''}
                        ${t.sms_count > 0 ? `<span class="text-blue-700 font-bold ml-1">+${t.sms_count} SMS</span>` : ''}
                      </td>
                      <td class="py-2.5 px-4 font-mono text-slate-600">৳${parseFloat(t.balance_after || 0).toFixed(2)}</td>
                      <td class="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                        ${t.payment_method ? t.payment_method.toUpperCase() : 'WALLET'}
                        ${t.transaction_id ? `(${escapeHtml(t.transaction_id)})` : ''}
                      </td>
                      <td class="py-2.5 px-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${statusClass}">${t.status}</span>
                      </td>
                      <td class="py-2.5 px-4 text-slate-400 font-mono text-[11px]">${formatDate(t.created_at)}</td>
                    </tr>
                  `;
                }).join('') : `
                  <tr><td colspan="7" class="py-6 text-center text-slate-400">No transaction records found.</td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Manual Package Buy Modal -->
      <div id="modal-buy-pkg-manual" class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
        <div class="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up">
          <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 class="font-bold text-sm text-slate-900">Purchase SMS Bundle</h3>
              <p id="modal-buy-pkg-title" class="text-xs text-emerald-700 font-semibold mt-0.5">Starter Package - ৳70</p>
            </div>
            <button onclick="closeBuyPackageManualModal()" class="text-slate-400 hover:text-slate-600 p-1">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form id="form-buy-pkg-manual" onsubmit="handleBuyPackageManualSubmit(event)" class="p-6 space-y-4 text-xs">
            <input type="hidden" id="modal-buy-pkg-id" value="">

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select id="modal-buy-pkg-method" onchange="updatePkgManualInfo(this.value)" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
                <option value="bkash">bKash Personal / Merchant</option>
                <option value="nagad">Nagad Payment</option>
                <option value="rocket">Rocket DBBL</option>
              </select>
            </div>

            <div id="modal-buy-pkg-info-box" class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed text-[11px]">
              Send exact package amount to bKash: <strong class="font-mono text-slate-900 font-bold" id="modal-buy-pkg-number">${wallet.payment_methods?.bkash || '01700000000'}</strong>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Sender Mobile</label>
                <input type="text" id="modal-buy-pkg-sender" required placeholder="017xxxxxxxx" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:border-emerald-600 focus:outline-none">
              </div>
              <div>
                <label class="block font-semibold text-slate-700 mb-1">Transaction ID (TrxID)</label>
                <input type="text" id="modal-buy-pkg-trx" required placeholder="e.g. 9B8C7A6D5E" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono uppercase focus:border-emerald-600 focus:outline-none">
              </div>
            </div>

            <div class="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button type="button" onclick="closeBuyPackageManualModal()" class="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold">Cancel</button>
              <button type="submit" id="btn-buy-pkg-manual-submit" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs">Submit Purchase</button>
            </div>
          </form>
        </div>
      </div>
    `;

    lucide.createIcons();
  } catch (e) {
    container.innerHTML = `<div class="text-rose-600 text-xs py-4 text-center">Failed to load SMS wallet: ${e.message}</div>`;
  }
}

function updateDirectRechargeInfo(method) {
  const box = document.getElementById('direct-recharge-info-box');
  const numSpan = document.getElementById('direct-recharge-number');
  const pm = state.smsWallet?.payment_methods || {};
  const num = pm[method] || '01700000000';
  if (box && numSpan) {
    box.innerHTML = `Send to ${method.toUpperCase()} Number: <strong class="font-mono text-slate-900 font-bold">${num}</strong>. Submit your TrxID below.`;
  }
}

async function handleDirectRechargeSubmit(e) {
  e.preventDefault();
  const amount = document.getElementById('recharge-bdt-amount').value;
  const method = document.getElementById('recharge-bdt-method').value;
  const sender = document.getElementById('recharge-sender-phone').value.trim();
  const trx = document.getElementById('recharge-trx-id').value.trim();

  const btn = document.getElementById('btn-recharge-submit');
  btn.disabled = true;
  btn.innerText = 'Submitting...';

  try {
    const token = localStorage.getItem('un_token');
    const res = await fetch('/api/v1/sms/wallet/recharge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        amount_bdt: amount,
        payment_method: method,
        sender_number: sender,
        transaction_id: trx
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      document.getElementById('form-direct-sms-recharge').reset();
      if (state.currentTab === 'sms-wallet') {
        renderSmsWalletPage(document.getElementById('tab-content'));
      } else {
        renderSmsGatewayTab(document.getElementById('tab-content'));
      }
    } else {
      showToast(json.message || 'Recharge failed', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Submit Top-Up Request';
  }
}

async function handleBuyPackageWithWallet(pkgId, pkgName, price, smsCount) {
  const currentBalance = parseFloat(state.smsWallet?.sms_balance || 0);
  if (currentBalance < price) {
    showToast(`Insufficient balance (৳${currentBalance.toFixed(2)}). Please recharge at least ৳${(price - currentBalance).toFixed(2)} or pay via bKash.`, 'error');
    return;
  }

  if (!confirm(`Confirm purchase of '${pkgName}' (${smsCount} SMS Credits) for ৳${price} from your SMS Wallet balance?`)) return;

  try {
    const token = localStorage.getItem('un_token');
    const res = await fetch('/api/v1/sms/packages/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        package_id: pkgId,
        payment_method: 'wallet'
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      if (state.currentTab === 'sms-wallet') {
        renderSmsWalletPage(document.getElementById('tab-content'));
      } else {
        renderSmsGatewayTab(document.getElementById('tab-content'));
      }
    } else {
      showToast(json.message || 'Purchase failed', 'error');
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function openBuyPackageManualModal(pkgId, pkgName, price, smsCount) {
  const modal = document.getElementById('modal-buy-pkg-manual');
  if (!modal) return;
  document.getElementById('modal-buy-pkg-id').value = pkgId;
  document.getElementById('modal-buy-pkg-title').innerText = `${pkgName} - ৳${price} (${smsCount} SMS)`;
  modal.classList.remove('hidden');
}

function closeBuyPackageManualModal() {
  const modal = document.getElementById('modal-buy-pkg-manual');
  if (modal) modal.classList.add('hidden');
}

function updatePkgManualInfo(method) {
  const box = document.getElementById('modal-buy-pkg-info-box');
  const pm = state.smsWallet?.payment_methods || {};
  const num = pm[method] || '01700000000';
  if (box) {
    box.innerHTML = `Send exact package amount to ${method.toUpperCase()}: <strong class="font-mono text-slate-900 font-bold">${num}</strong>. Submit TrxID below.`;
  }
}

async function handleBuyPackageManualSubmit(e) {
  e.preventDefault();
  const pkgId = document.getElementById('modal-buy-pkg-id').value;
  const method = document.getElementById('modal-buy-pkg-method').value;
  const sender = document.getElementById('modal-buy-pkg-sender').value.trim();
  const trx = document.getElementById('modal-buy-pkg-trx').value.trim();

  const btn = document.getElementById('btn-buy-pkg-manual-submit');
  btn.disabled = true;
  btn.innerText = 'Submitting...';

  try {
    const token = localStorage.getItem('un_token');
    const res = await fetch('/api/v1/sms/packages/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        package_id: pkgId,
        payment_method: method,
        sender_number: sender,
        transaction_id: trx
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast(json.message, 'success');
      closeBuyPackageManualModal();
      document.getElementById('form-buy-pkg-manual').reset();
      if (state.currentTab === 'sms-wallet') {
        renderSmsWalletPage(document.getElementById('tab-content'));
      } else {
        renderSmsGatewayTab(document.getElementById('tab-content'));
      }
    } else {
      showToast(json.message || 'Submission failed', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Submit Purchase';
  }
}

/**
 * SUB-TAB 5: SMS DISPATCH LOGS
 */
async function renderSmsLogsSubTab(container) {
  container.innerHTML = `
    <div class="saas-card overflow-hidden space-y-4">
      <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="font-bold text-sm text-slate-900">SMS Gateway Queue &amp; Logs</h3>
          <p class="text-xs text-slate-500 mt-0.5">Real-time status tracking for all mobile phone and 3rd party SMS dispatches.</p>
        </div>

        <div class="flex items-center gap-2">
          <select id="sms-log-filter" onchange="fetchSmsLogsAndRenderTable(this.value)" class="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
            <option value="all">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
          <button onclick="fetchSmsLogsAndRenderTable()" class="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600" title="Refresh Logs">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>

      <div id="sms-logs-table-box" class="overflow-x-auto">
        <div class="p-6 text-center text-xs text-slate-400">Loading SMS logs...</div>
      </div>
    </div>
  `;

  await fetchSmsLogsAndRenderTable();
}

async function fetchSmsLogsAndRenderTable(statusFilter = 'all') {
  const box = document.getElementById('sms-logs-table-box');
  if (!box) return;

  try {
    const token = localStorage.getItem('un_token');
    const url = `/api/v1/sms/logs?limit=50${statusFilter !== 'all' ? '&status=' + statusFilter : ''}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    const logs = json.success ? (json.data || []) : [];

    box.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-50 text-slate-500 font-semibold text-[11px] border-b border-slate-200/80">
          <tr>
            <th class="py-2.5 px-4">Job ID</th>
            <th class="py-2.5 px-4">Recipient</th>
            <th class="py-2.5 px-4">Gateway / SIM</th>
            <th class="py-2.5 px-4">Message</th>
            <th class="py-2.5 px-4">Status</th>
            <th class="py-2.5 px-4">Timestamp</th>
            <th class="py-2.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 font-medium">
          ${logs.length > 0 ? logs.map(log => {
            const statusUpper = (log.status || '').toUpperCase();
            const statusClass = statusUpper === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              statusUpper === 'SENT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              statusUpper === 'QUEUED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              statusUpper === 'PROCESSING' ? 'bg-purple-50 text-purple-700 border-purple-200' :
              'bg-rose-50 text-rose-700 border-rose-200';

            return `
              <tr class="hover:bg-slate-50/70">
                <td class="py-2.5 px-4 font-mono text-slate-400">#${log.id}</td>
                <td class="py-2.5 px-4 font-mono font-semibold text-slate-900">${log.recipient}</td>
                <td class="py-2.5 px-4">
                  <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">${gwLabel}</span>
                </td>
                <td class="py-2.5 px-4 max-w-xs truncate text-slate-700" title="${escapeHtml(log.message)}">${escapeHtml(log.message)}</td>
                <td class="py-2.5 px-4">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${statusClass}">${statusUpper}</span>
                  ${log.error_reason ? `
                    <div class="mt-1 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-1.5 leading-tight max-w-xs" title="${escapeHtml(log.error_reason)}">
                      <strong>Reason:</strong> ${escapeHtml(log.error_reason)}
                    </div>
                  ` : ''}
                </td>
                <td class="py-2.5 px-4 text-slate-400 font-mono text-[11px]">${formatDate(log.created_at)}</td>
                <td class="py-2.5 px-4 text-right">
                  ${statusUpper === 'FAILED' ? `
                    <button onclick="handleRetrySmsJob('${log.id}')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold">Retry</button>
                  ` : `
                    <span class="text-slate-400 text-xs">-</span>
                  `}
                </td>
              </tr>
            `;
          }).join('') : `
            <tr><td colspan="7" class="py-8 text-center text-slate-400">No SMS jobs found in logs.</td></tr>
          `}
        </tbody>
      </table>
    `;
    lucide.createIcons();
  } catch (e) {
    box.innerHTML = `<div class="text-rose-600 text-xs py-4 text-center">Failed to load logs: ${e.message}</div>`;
  }
}

async function handleRetrySmsJob(jobId) {
  try {
    const token = localStorage.getItem('un_token');
    const res = await fetch(`/api/v1/sms/jobs/${jobId}/retry`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.success) {
      showToast('SMS job requeued for dispatch', 'success');
      fetchSmsLogsAndRenderTable();
    } else {
      showToast(json.message || 'Retry failed', 'error');
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function renderBroadcastsTab(container) {
  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="saas-card p-5 space-y-4 lg:col-span-1">
        <div>
          <h2 class="font-semibold text-sm text-slate-900 flex items-center gap-2"><i data-lucide="plus-circle" class="w-4 h-4 text-emerald-600"></i><span>Create Campaign</span></h2>
          <p class="text-xs text-slate-500 mt-1">Configure Spintax variation and anti-ban delay throttling.</p>
        </div>

        <form id="create-campaign-form" onsubmit="handleCreateCampaignSubmit(event)" class="space-y-3 pt-1 text-xs">
          <div>
            <label class="block font-medium text-slate-700 mb-1">Campaign Title</label>
            <input type="text" id="camp-name" required placeholder="Monthly Promotion" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Sending Gateway</label>
            <select id="camp-gateway" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
              <option value="qr">QR Device (Anti-Ban Throttled)</option>
              <option value="meta">Meta Cloud API (Official)</option>
            </select>
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Target Numbers (1 per line)</label>
            <textarea id="camp-contacts" rows="4" required placeholder="01711111111&#10;01722222222&#10;8801733333333" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:border-emerald-600 focus:outline-none"></textarea>
          </div>
          <div>
            <div class="flex justify-between items-center mb-1"><label class="font-medium text-slate-700">Message Template</label><span class="text-[10px] text-emerald-600 font-mono">Use {Hi|Hello}</span></div>
            <textarea id="camp-template" rows="4" required placeholder="{Hello|Hi|Greetings} {name}, we have an update regarding your service..." class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"></textarea>
            <div class="flex flex-wrap gap-1 mt-1.5">
              <button type="button" onclick="insertVariable('camp-template', '{name}')" class="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700 hover:bg-slate-200 font-mono">+ {name}</button>
              <button type="button" onclick="insertVariable('camp-template', '{phone}')" class="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700 hover:bg-slate-200 font-mono">+ {phone}</button>
              <button type="button" onclick="insertVariable('camp-template', '{date}')" class="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700 hover:bg-slate-200 font-mono">+ {date}</button>
              <button type="button" onclick="insertVariable('camp-template', '{Hello|Hi|Greetings}')" class="px-2 py-0.5 rounded bg-emerald-50 text-[10px] text-emerald-700 border border-emerald-200 font-mono">+ Spintax</button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block font-medium text-slate-700 mb-1">Min Delay (s)</label><input type="number" id="camp-min-delay" value="5" min="2" max="60" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"></div>
            <div><label class="block font-medium text-slate-700 mb-1">Max Delay (s)</label><input type="number" id="camp-max-delay" value="15" min="3" max="120" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"></div>
          </div>
          <button type="submit" id="btn-create-camp" class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs">Start Broadcast Campaign</button>
        </form>
      </div>

      <div class="saas-card p-5 lg:col-span-2 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 class="font-semibold text-sm text-slate-900 flex items-center gap-2"><i data-lucide="megaphone" class="w-4 h-4 text-emerald-600"></i><span>Campaigns Overview</span></h2>
          <button onclick="renderBroadcastsTab(document.getElementById('tab-content'))" class="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"><i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh</button>
        </div>
        <div id="campaigns-list-container" class="space-y-3"><div class="text-center py-8 text-slate-400 text-xs">Loading campaigns...</div></div>
      </div>
    </div>
  `;
  loadCampaigns();
}

async function loadCampaigns() {
  const container = document.getElementById('campaigns-list-container');
  if (!container) return;

  try {
    const res = await fetch('/api/v1/broadcasts');
    const data = await res.json();
    if (data.success && data.data) {
      if (data.data.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs">No broadcast campaigns yet.</div>`;
        return;
      }

      container.innerHTML = data.data.map(c => {
        const total = c.total_contacts || 1;
        const sent = c.sent_count || 0;
        const failed = c.failed_count || 0;
        const percent = Math.min(100, Math.round(((sent + failed) / total) * 100));

        return `
          <div class="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-slate-900 text-sm">${escapeHtml(c.name)}</h3>
                <p class="text-[11px] text-slate-500 mt-0.5">Gateway: ${c.gateway_type.toUpperCase()} | Jitter: ${c.min_delay_sec}s-${c.max_delay_sec}s</p>
              </div>
              <span class="px-2.5 py-0.5 rounded-md text-xs font-medium ${c.status === 'RUNNING' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : c.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600'}">${c.status}</span>
            </div>
            <div class="space-y-1">
              <div class="flex justify-between text-xs text-slate-500"><span>Progress: ${sent + failed} / ${total} contacts</span><span>${percent}%</span></div>
              <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden"><div class="bg-emerald-600 h-2 rounded-full transition-all duration-300" style="width: ${percent}%"></div></div>
            </div>
            <div class="flex items-center justify-between pt-1 text-xs">
              <div class="flex gap-3 text-slate-600 text-[11px]"><span class="text-emerald-700 font-medium">${sent} Sent</span><span class="text-rose-700 font-medium">${failed} Failed</span></div>
              <div class="flex gap-2">
                ${c.status === 'RUNNING' ? `
                  <button onclick="handlePauseCampaign(${c.id})" class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-md text-xs font-medium">Pause</button>
                  <button onclick="handleCancelCampaign(${c.id})" class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-medium">Cancel</button>
                ` : c.status === 'PAUSED' ? `
                  <button onclick="handleResumeCampaign(${c.id})" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium">Resume</button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (e) {
    container.innerHTML = `<div class="text-rose-600 text-xs py-4 text-center">Failed: ${e.message}</div>`;
  }
}

/**
 * TAB: CONTACT BOOK & LISTS
 */
async function renderContactsTab(container) {
  container.innerHTML = `
    <div class="space-y-5">
      <!-- Contact Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="saas-card p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500">Total Saved Contacts</span>
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i data-lucide="users" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="mt-3">
            <div id="contact-total-count" class="text-2xl font-bold text-slate-900">0</div>
            <div class="text-xs text-slate-500 mt-1">Ready for Broadcasts</div>
          </div>
        </div>

        <div class="saas-card p-5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500">Contact Groups</span>
            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <i data-lucide="folder" class="w-4 h-4"></i>
            </div>
          </div>
          <div class="mt-3">
            <div id="contact-groups-count" class="text-2xl font-bold text-slate-900">0</div>
            <div class="text-xs text-slate-500 mt-1">Organized Segments</div>
          </div>
        </div>

        <div class="saas-card p-5 flex flex-col justify-center gap-2">
          <button onclick="openAddContactModal()" class="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs transition flex items-center justify-center gap-1.5">
            <i data-lucide="user-plus" class="w-3.5 h-3.5"></i>
            <span>Add Single Contact</span>
          </button>
          <button onclick="openBulkImportModal()" class="w-full py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs transition flex items-center justify-center gap-1.5">
            <i data-lucide="file-up" class="w-3.5 h-3.5"></i>
            <span>Bulk CSV / Text Import</span>
          </button>
        </div>
      </div>

      <!-- Contacts Table Card -->
      <div class="saas-card overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <i data-lucide="contact" class="w-4 h-4 text-emerald-600"></i>
            <h2 class="font-semibold text-sm text-slate-900">Contact Directory</h2>
          </div>
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input type="text" id="contact-search" oninput="loadContactsTable()" placeholder="Search name or phone..." class="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none w-full sm:w-44">
            <select id="contact-filter-group" onchange="loadContactsTable()" class="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700">
              <option value="">All Groups</option>
            </select>
            <button onclick="loadContactsTable()" class="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <div id="contacts-table-container" class="overflow-x-auto">
          <div class="text-center py-8 text-slate-400 text-xs">Loading contacts...</div>
        </div>
      </div>
    </div>

    <!-- Add Contact Modal -->
    <div id="modal-add-contact" class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
      <div class="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl">
        <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-semibold text-sm text-slate-900 flex items-center gap-2">
            <i data-lucide="user-plus" class="w-4 h-4 text-emerald-600"></i>
            <span>Add New Contact</span>
          </h3>
          <button onclick="closeAddContactModal()" class="text-slate-400 hover:text-slate-600 p-1">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
        <form onsubmit="handleSaveContactSubmit(event)" class="p-5 space-y-3 text-xs">
          <div>
            <label class="block font-medium text-slate-700 mb-1">Full Name</label>
            <input type="text" id="add-contact-name" required placeholder="Rahim Ahmed" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Phone Number (with country code)</label>
            <input type="text" id="add-contact-phone" required placeholder="88017xxxxxxxx" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Group / Tag</label>
            <input type="text" id="add-contact-group" placeholder="VIP Customers, Hosting Clients, etc." class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Email Address (Optional)</label>
            <input type="email" id="add-contact-email" placeholder="client@example.com" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <div class="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onclick="closeAddContactModal()" class="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
            <button type="submit" id="btn-add-contact-submit" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs">Save Contact</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Bulk Import Modal -->
    <div id="modal-bulk-import" class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
      <div class="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden shadow-xl">
        <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-semibold text-sm text-slate-900 flex items-center gap-2">
            <i data-lucide="file-up" class="w-4 h-4 text-emerald-600"></i>
            <span>Bulk Contact Import</span>
          </h3>
          <button onclick="closeBulkImportModal()" class="text-slate-400 hover:text-slate-600 p-1">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
        <form onsubmit="handleBulkImportSubmit(event)" class="p-5 space-y-3.5 text-xs">
          <div>
            <label class="block font-medium text-slate-700 mb-1">Target Group Name</label>
            <input type="text" id="import-group-name" value="Campaign List" required class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Paste Numbers (one per line, or comma-separated)</label>
            <textarea id="import-text" rows="6" required placeholder="8801700000001, Rahim
8801700000002, Karim
8801800000003
01900000004" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono text-xs focus:border-emerald-600 focus:outline-none"></textarea>
            <p class="text-[11px] text-slate-400 mt-1">Format: phone number alone, or "phone, name" per line.</p>
          </div>
          <div class="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onclick="closeBulkImportModal()" class="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
            <button type="submit" id="btn-import-submit" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs">Import Contacts</button>
          </div>
        </form>
      </div>
    </div>
  `;

  await loadContactsTable();
  lucide.createIcons();
}

async function loadContactsTable() {
  const container = document.getElementById('contacts-table-container');
  if (!container) return;

  const search = document.getElementById('contact-search')?.value.trim() || '';
  const group = document.getElementById('contact-filter-group')?.value || '';

  try {
    const token = localStorage.getItem('un_token') || localStorage.getItem('un_user_token');
    let url = '/api/user/contacts';
    const params = [];
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (group) params.push(`group_name=${encodeURIComponent(group)}`);
    if (params.length) url += `?${params.join('&')}`;

    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();

    if (!data.success) {
      container.innerHTML = `<div class="text-center py-6 text-rose-600 text-xs">${data.message || 'Failed to load contacts'}</div>`;
      return;
    }

    const contacts = data.contacts || [];
    const groups = data.groups || [];

    // Update stats
    const totalEl = document.getElementById('contact-total-count');
    if (totalEl) totalEl.innerText = contacts.length.toLocaleString();

    const groupsEl = document.getElementById('contact-groups-count');
    if (groupsEl) groupsEl.innerText = groups.length.toLocaleString();

    // Populate group dropdown filter
    const filterSelect = document.getElementById('contact-filter-group');
    if (filterSelect && filterSelect.options.length <= 1) {
      groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.group_name;
        opt.innerText = `${g.group_name} (${g.count})`;
        filterSelect.appendChild(opt);
      });
      if (group) filterSelect.value = group;
    }

    if (contacts.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-slate-400 text-xs space-y-3">
          <div class="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <i data-lucide="users" class="w-6 h-6"></i>
          </div>
          <p>No contacts saved in this view.</p>
          <button onclick="openAddContactModal()" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs">Add First Contact</button>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs border-collapse">
        <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
          <tr>
            <th class="py-3 px-4">Contact Name</th>
            <th class="py-3 px-4">Phone Number</th>
            <th class="py-3 px-4">Group / Tag</th>
            <th class="py-3 px-4">Email</th>
            <th class="py-3 px-4">Date Added</th>
            <th class="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          ${contacts.map(c => `
            <tr class="hover:bg-slate-50/70 transition">
              <td class="py-3 px-4 font-medium text-slate-900">${escapeHtml(c.name)}</td>
              <td class="py-3 px-4 font-mono font-semibold text-slate-800">${escapeHtml(c.phone)}</td>
              <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ${escapeHtml(c.group_name || 'Default')}
                </span>
              </td>
              <td class="py-3 px-4 text-slate-500">${escapeHtml(c.email || '—')}</td>
              <td class="py-3 px-4 text-slate-400 text-[11px]">${formatDate(c.created_at)}</td>
              <td class="py-3 px-4 text-right space-x-1.5">
                <button onclick="quickSendToContact('${escapeHtml(c.phone)}')" title="Send Message" class="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50">
                  <i data-lucide="send" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="handleDeleteContact(${c.id})" title="Delete Contact" class="p-1 rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="text-center py-6 text-rose-600 text-xs">${err.message}</div>`;
  }
}

function openAddContactModal() {
  document.getElementById('modal-add-contact')?.classList.remove('hidden');
}
function closeAddContactModal() {
  document.getElementById('modal-add-contact')?.classList.add('hidden');
}

function openBulkImportModal() {
  document.getElementById('modal-bulk-import')?.classList.remove('hidden');
}
function closeBulkImportModal() {
  document.getElementById('modal-bulk-import')?.classList.add('hidden');
}

async function handleSaveContactSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('add-contact-name').value.trim();
  const phone = document.getElementById('add-contact-phone').value.trim();
  const group = document.getElementById('add-contact-group').value.trim() || 'Default';
  const email = document.getElementById('add-contact-email').value.trim();
  const btn = document.getElementById('btn-add-contact-submit');

  btn.disabled = true;
  btn.innerText = 'Saving...';

  try {
    const token = localStorage.getItem('un_token') || localStorage.getItem('un_user_token');
    const res = await fetch('/api/user/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name, phone, group_name: group, email })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Contact saved successfully', 'success');
      closeAddContactModal();
      document.getElementById('add-contact-name').value = '';
      document.getElementById('add-contact-phone').value = '';
      document.getElementById('add-contact-email').value = '';
      await loadContactsTable();
    } else {
      showToast(data.message || 'Failed to save contact', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Save Contact';
  }
}

async function handleBulkImportSubmit(e) {
  e.preventDefault();
  const group = document.getElementById('import-group-name').value.trim() || 'Imported';
  const rawText = document.getElementById('import-text').value.trim();
  const btn = document.getElementById('btn-import-submit');

  if (!rawText) return;

  const lines = rawText.split(/[\r\n]+/);
  const contacts = [];
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const parts = trimmed.split(/[,;\t]/);
    const phone = parts[0].trim().replace(/[^\d+]/g, '');
    const name = parts[1] ? parts[1].trim() : phone;
    if (phone) {
      contacts.push({ phone, name, group_name: group });
    }
  });

  if (contacts.length === 0) {
    showToast('No valid phone numbers found in input', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerText = `Importing ${contacts.length} contacts...`;

  try {
    const token = localStorage.getItem('un_token') || localStorage.getItem('un_user_token');
    const res = await fetch('/api/user/contacts/bulk-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ contacts, group_name: group })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeBulkImportModal();
      document.getElementById('import-text').value = '';
      await loadContactsTable();
    } else {
      showToast(data.message || 'Import failed', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Import Contacts';
  }
}

async function handleDeleteContact(id) {
  if (!confirm('Are you sure you want to delete this contact?')) return;
  try {
    const token = localStorage.getItem('un_token') || localStorage.getItem('un_user_token');
    const res = await fetch(`/api/user/contacts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('Contact deleted', 'info');
      await loadContactsTable();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function quickSendToContact(phone) {
  switchTab('messenger');
  setTimeout(() => {
    const phoneInput = document.getElementById('direct-phone');
    if (phoneInput) {
      phoneInput.value = phone;
      phoneInput.focus();
    }
  }, 100);
}

function renderMessengerTab(container) {
  container.innerHTML = `
    <div class="max-w-xl mx-auto saas-card p-6 space-y-4">
      <div class="flex items-center gap-3 border-b border-slate-100 pb-3">
        <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><i data-lucide="send" class="w-4 h-4"></i></div>
        <div><h2 class="font-semibold text-sm text-slate-900">Direct WhatsApp Messenger</h2><p class="text-xs text-slate-500">Send custom messages or attachments</p></div>
      </div>
      <form id="direct-msg-form" onsubmit="handleDirectMsgSubmit(event)" class="space-y-3.5 text-xs">
        <div><label class="block font-medium text-slate-700 mb-1">Recipient Number</label><input type="text" id="direct-phone" required placeholder="017xxxxxxxx or 88017xxxxxxxx" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none"></div>
        <div><label class="block font-medium text-slate-700 mb-1">Gateway</label><select id="direct-gateway" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none"><option value="auto">Auto Route</option><option value="meta">Meta Cloud API (Official)</option><option value="qr">QR Multi-Device Scanner</option></select></div>
        <div><label class="block font-medium text-slate-700 mb-1">Message Content</label><textarea id="direct-content" rows="4" required placeholder="Type message. Supports *bold*, _italic_, ~strike~ and {Hi|Hello} Spintax..." class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none"></textarea></div>
        <div><label class="block font-medium text-slate-700 mb-1">Attachment URL (Optional)</label><input type="url" id="direct-media-url" placeholder="https://example.com/invoice.pdf or image link" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none"></div>
        <button type="submit" id="btn-direct-submit" class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs">Send Message</button>
      </form>
    </div>
  `;
}

async function renderLogsTab(container) {
  container.innerHTML = `
    <div class="saas-card overflow-hidden">
      <div class="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 class="font-semibold text-sm text-slate-900 flex items-center gap-2"><i data-lucide="list-filter" class="w-4 h-4 text-emerald-600"></i><span>Delivery History</span></h2>
        <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input type="text" id="log-search" oninput="loadFullLogs()" placeholder="Search phone or text..." class="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none w-full sm:w-44">
          <select id="log-filter-gateway" onchange="loadFullLogs()" class="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700"><option value="">All Gateways</option><option value="meta">Meta Cloud</option><option value="qr">QR Device</option></select>
          <select id="log-filter-status" onchange="loadFullLogs()" class="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700"><option value="">All Statuses</option><option value="SENT">Sent</option><option value="DELIVERED">Delivered</option><option value="READ">Read</option><option value="FAILED">Failed</option></select>
        </div>
      </div>
      <div id="full-logs-container" class="overflow-x-auto"><div class="text-center py-8 text-slate-400 text-xs">Loading logs...</div></div>
    </div>
  `;
  loadFullLogs();
}

async function loadFullLogs() {
  const container = document.getElementById('full-logs-container');
  if (!container) return;

  const search = document.getElementById('log-search')?.value || '';
  const gateway = document.getElementById('log-filter-gateway')?.value || '';
  const status = document.getElementById('log-filter-status')?.value || '';

  const queryParams = new URLSearchParams({ limit: '50' });
  if (search) queryParams.append('search', search);
  if (gateway) queryParams.append('gateway', gateway);
  if (status) queryParams.append('status', status);

  try {
    const res = await fetch(`/api/v1/messages/logs?${queryParams.toString()}`);
    const data = await res.json();
    if (data.success && data.data) {
      container.innerHTML = `
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-medium text-[11px] border-b border-slate-200/80">
            <tr>
              <th class="py-2.5 px-4">Gateway</th>
              <th class="py-2.5 px-4">Direction</th>
              <th class="py-2.5 px-4">Recipient</th>
              <th class="py-2.5 px-4">Type</th>
              <th class="py-2.5 px-4">Content</th>
              <th class="py-2.5 px-4">Status</th>
              <th class="py-2.5 px-4">Time</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${data.data.length > 0 ? data.data.map(log => `
              <tr class="hover:bg-slate-50/70">
                <td class="py-2.5 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-medium ${log.gateway_type === 'meta' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">${log.gateway_type.toUpperCase()}</span></td>
                <td class="py-2.5 px-4 text-slate-500 text-[11px]">${log.direction}</td>
                <td class="py-2.5 px-4 font-mono text-slate-700">${log.recipient_phone}</td>
                <td class="py-2.5 px-4 text-slate-500">${log.message_type}</td>
                <td class="py-2.5 px-4 max-w-xs truncate text-slate-700" title="${escapeHtml(log.content || '')}">${escapeHtml(log.content || '')}</td>
                <td class="py-2.5 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-medium badge-${(log.status || 'sent').toLowerCase()}">${log.status}</span></td>
                <td class="py-2.5 px-4 text-slate-400 font-mono text-[11px]">${formatDate(log.created_at)}</td>
              </tr>
            `).join('') : `
              <tr><td colspan="7" class="py-8 text-center text-slate-400">No logs match your filter.</td></tr>
            `}
          </tbody>
        </table>
      `;
    }
  } catch (e) {
    container.innerHTML = `<div class="text-rose-600 text-xs py-4 text-center">Failed: ${e.message}</div>`;
  }
}

async function renderApiKeysTab(container) {
  container.innerHTML = `
    <div class="saas-card p-5 space-y-4">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 class="font-semibold text-sm text-slate-900 flex items-center gap-2"><i data-lucide="key" class="w-4 h-4 text-slate-700"></i><span>API Keys</span></h2>
          <p class="text-xs text-slate-500 mt-0.5">Manage authentication keys for WHMCS, PHP scripts, or external CRMs.</p>
        </div>
        <button onclick="handleCreateApiKey()" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Generate Key
        </button>
      </div>
      <div id="api-keys-table-container" class="overflow-x-auto"><div class="text-center py-6 text-slate-400 text-xs">Loading keys...</div></div>
    </div>
  `;
  loadApiKeys();
}

async function loadApiKeys() {
  const container = document.getElementById('api-keys-table-container');
  if (!container) return;

  try {
    const res = await fetch('/api/v1/api-keys');
    const data = await res.json();
    if (data.success && data.data) {
      container.innerHTML = `
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-medium text-[11px] border-b border-slate-200/80">
            <tr>
              <th class="py-2.5 px-4">Label</th>
              <th class="py-2.5 px-4">API Key</th>
              <th class="py-2.5 px-4">Rate Limit</th>
              <th class="py-2.5 px-4">Status</th>
              <th class="py-2.5 px-4">Last Used</th>
              <th class="py-2.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${data.data.map(k => `
              <tr class="hover:bg-slate-50/70">
                <td class="py-2.5 px-4 font-medium text-slate-800">${escapeHtml(k.name)}</td>
                <td class="py-2.5 px-4 font-mono text-emerald-700">
                  <div class="flex items-center gap-2"><span>${k.api_key}</span><button onclick="copyToClipboard('${k.api_key}')" class="text-slate-400 hover:text-slate-700"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button></div>
                </td>
                <td class="py-2.5 px-4 text-slate-500">${k.rate_limit_per_min} req/min</td>
                <td class="py-2.5 px-4"><span class="px-2 py-0.5 rounded text-[10px] font-medium ${k.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">${k.is_active ? 'Active' : 'Disabled'}</span></td>
                <td class="py-2.5 px-4 text-slate-400 font-mono text-[11px]">${k.last_used_at ? formatDate(k.last_used_at) : 'Never'}</td>
                <td class="py-2.5 px-4 text-right space-x-2">
                  <button onclick="handleToggleApiKey(${k.id})" class="text-slate-500 hover:text-slate-800 text-xs">${k.is_active ? 'Disable' : 'Enable'}</button>
                  <button onclick="handleDeleteApiKey(${k.id})" class="text-rose-600 hover:text-rose-700 text-xs">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      lucide.createIcons();
    }
  } catch (e) {
    container.innerHTML = `<div class="text-rose-600 text-xs py-4 text-center">Failed: ${e.message}</div>`;
  }
}

function renderApiDocsTab(container) {
  const apiKey = 'un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c';
  const baseUrl = window.location.origin;

  container.innerHTML = `
    <div class="space-y-4">
      <div class="saas-card p-5">
        <h2 class="font-semibold text-sm text-slate-900 flex items-center gap-2"><i data-lucide="code" class="w-4 h-4 text-emerald-600"></i><span>REST API Reference</span></h2>
        <p class="text-xs text-slate-500 mt-1 leading-relaxed">Authenticate with <code class="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded border border-slate-200">X-API-Key</code> request header.</p>
        <div class="mt-3 flex flex-wrap gap-3 text-xs font-mono">
          <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200"><span class="text-slate-400">Base URL:</span> <span class="text-emerald-700 font-semibold">${baseUrl}/api/v1</span></div>
          <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200"><span class="text-slate-400">Header:</span> <span class="text-blue-700 font-semibold">X-API-Key: &lt;YOUR_KEY&gt;</span></div>
        </div>
      </div>

      <div class="saas-card p-5 space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2"><span class="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px] rounded">POST</span><span class="font-mono text-xs text-slate-800">/api/v1/otp/send</span></div>
          <span class="text-xs text-slate-400">Send Verification Code</span>
        </div>
        <pre class="bg-slate-50 p-3 rounded-lg text-xs font-mono text-slate-800 border border-slate-200 overflow-x-auto">
curl -X POST "${baseUrl}/api/v1/otp/send" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '{
    "phone": "01700000000",
    "service_name": "Ecommerce",
    "gateway": "auto",
    "expiry_minutes": 5
  }'</pre>
      </div>

      <div class="saas-card p-5 space-y-2.5">
        <div class="flex items-center gap-2"><span class="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded border border-slate-200">WHMCS</span><h2 class="font-semibold text-xs text-slate-900">WHMCS Hook Installation</h2></div>
        <p class="text-xs text-slate-500 leading-relaxed">Automate WhatsApp alerts for Invoices, Tickets, and Client registrations:</p>
        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 space-y-1">
          <p>1. Copy <code class="text-emerald-700 font-semibold">integrations/whmcs/UniqueNotifyClient.php</code> to <code class="text-slate-900">/whmcs/includes/</code></p>
          <p>2. Copy <code class="text-emerald-700 font-semibold">integrations/whmcs/hooks/unique_notify.php</code> to <code class="text-slate-900">/whmcs/includes/hooks/</code></p>
        </div>
      </div>
    </div>
  `;
}

function renderSettingsTab(container) {
  const s = state.settings || {};

  container.innerHTML = `
    <div class="max-w-xl mx-auto saas-card p-6 space-y-4">
      <div class="flex items-center gap-3 border-b border-slate-100 pb-3">
        <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><i data-lucide="sliders" class="w-4 h-4"></i></div>
        <div><h2 class="font-semibold text-sm text-slate-900">Anti-Ban & System Settings</h2><p class="text-xs text-slate-500">Configure delays, typing presence, and sleep schedules.</p></div>
      </div>

      <form id="system-settings-form" onsubmit="handleSaveSettings(event)" class="space-y-3.5 pt-1 text-xs">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block font-medium text-slate-700 mb-1">Min Delay (s)</label><input type="number" id="set-min-delay" value="${s.anti_ban_min_delay || '5'}" min="1" max="60" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none"></div>
          <div><label class="block font-medium text-slate-700 mb-1">Max Delay (s)</label><input type="number" id="set-max-delay" value="${s.anti_ban_max_delay || '15'}" min="2" max="120" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none"></div>
        </div>
        <div><label class="block font-medium text-slate-700 mb-1">Daily Limit per Device</label><input type="number" id="set-daily-limit" value="${s.anti_ban_daily_limit || '1000'}" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none"></div>
        <div>
          <label class="block font-medium text-slate-700 mb-1">Default Gateway for Auto Route</label>
          <select id="set-default-gw" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
            <option value="meta" ${s.default_gateway === 'meta' ? 'selected' : ''}>Official Meta WhatsApp Cloud API</option>
            <option value="qr" ${s.default_gateway === 'qr' ? 'selected' : ''}>Multi-Device QR Scanner</option>
          </select>
        </div>
        <div class="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
          <div><span class="font-medium text-slate-800">Simulate Typing Indicator</span><p class="text-[11px] text-slate-500">Shows "composing..." presence for 1.5s-4s before dispatch</p></div>
          <input type="checkbox" id="set-typing-sim" ${s.anti_ban_typing_sim !== 'false' ? 'checked' : ''} class="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded">
        </div>
        <div class="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
          <div class="flex items-center justify-between">
            <div><span class="font-medium text-slate-800">Nighttime Quiet Hours</span><p class="text-[11px] text-slate-500">Automatically pauses bulk broadcasts during sleeping hours</p></div>
            <input type="checkbox" id="set-quiet-hours" ${s.anti_ban_quiet_hours === 'true' ? 'checked' : ''} class="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded">
          </div>
          <div class="grid grid-cols-2 gap-3 pt-1">
            <div><label class="block text-[11px] text-slate-600 mb-1">Start Time</label><input type="time" id="set-quiet-start" value="${s.anti_ban_quiet_start || '23:00'}" class="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-800"></div>
            <div><label class="block text-[11px] text-slate-600 mb-1">End Time</label><input type="time" id="set-quiet-end" value="${s.anti_ban_quiet_end || '07:00'}" class="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-800"></div>
          </div>
        </div>
        <button type="submit" class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs">Save Settings</button>
      </form>
    </div>
  `;
}

/**
 * Event Handlers
 */
async function handleSendOtpSubmit(e) {
  e.preventDefault();
  const phone = document.getElementById('otp-phone').value;
  const serviceName = document.getElementById('otp-service').value;
  const otpLength = document.getElementById('otp-length').value;
  const gateway = document.getElementById('otp-gateway').value;
  const expiryMinutes = document.getElementById('otp-expiry').value;

  const btn = document.getElementById('btn-send-otp');
  btn.disabled = true;
  btn.innerText = 'Dispatching...';

  try {
    const res = await fetch('/api/v1/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, service_name: serviceName, otp_length: otpLength, gateway, expiry_minutes: expiryMinutes })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`OTP dispatched to ${phone}`, 'success');
      loadOtpLogs();
      const verifyPhoneInput = document.getElementById('verify-phone');
      if (verifyPhoneInput) verifyPhoneInput.value = phone;
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Dispatch OTP';
  }
}

async function handleVerifyOtpSubmit(e) {
  e.preventDefault();
  const phone = document.getElementById('verify-phone').value;
  const otpCode = document.getElementById('verify-code').value;
  const resultBox = document.getElementById('verify-result-box');

  const btn = document.getElementById('btn-verify-otp');
  btn.disabled = true;

  try {
    const res = await fetch('/api/v1/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp_code: otpCode })
    });
    const data = await res.json();
    resultBox.classList.remove('hidden', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 'bg-rose-50', 'text-rose-700', 'border-rose-200');

    if (data.success) {
      resultBox.classList.add('bg-emerald-50', 'text-emerald-700', 'border-emerald-200');
      resultBox.innerText = `Verified: OTP confirmed for ${phone}.`;
      showToast('OTP code verified', 'success');
      loadOtpLogs();
    } else {
      resultBox.classList.add('bg-rose-50', 'text-rose-700', 'border-rose-200');
      resultBox.innerText = `Failed: ${data.message}`;
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function handleSaveMetaConfig(e) {
  e.preventDefault();
  const phoneId = document.getElementById('meta-phone-id').value;
  const wabaId = document.getElementById('meta-waba-id').value;
  const token = document.getElementById('meta-token').value;

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meta_config: { phone_number_id: phoneId, waba_id: wabaId, access_token: token }
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Meta credentials saved', 'success');
      await fetchStats();
      await fetchSettings();
      renderDevicesTab(document.getElementById('tab-content'));
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleTestMetaConnection() {
  try {
    showToast('Testing Meta API connection...', 'info');
    const res = await fetch('/api/v1/devices/meta/test', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(`Meta API connected: ${data.message}`, 'success');
    } else {
      showToast(`Meta API failed: ${data.message}`, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleSyncTemplates() {
  try {
    showToast('Syncing approved templates...', 'info');
    const res = await fetch('/api/v1/templates/sync', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleInitQr() {
  const btn = document.getElementById('btn-add-device');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner font-mono">&#8635;</span> <span>Generating QR Code...</span>';
  }
  try {
    showToast('Initializing WhatsApp QR pairing session...', 'info');
    const res = await fetch('/api/v1/devices/qr/init', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    if (data.success) {
      if (data.data?.qr) state.qrData = data.data.qr;
      renderDevicesTab(document.getElementById('tab-content'));
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function handleCancelQr() {
  state.qrData = null;
  state.qrStatus = 'DISCONNECTED';
  renderDevicesTab(document.getElementById('tab-content'));
}

async function handleLogoutQr() {
  if (!confirm('Disconnect this WhatsApp session?')) return;
  try {
    const res = await fetch('/api/v1/devices/qr/logout', { method: 'POST' });
    const data = await res.json();
    showToast(data.message, 'info');
    state.qrStatus = 'DISCONNECTED';
    state.connectedPhone = null;
    state.qrData = null;
    renderDevicesTab(document.getElementById('tab-content'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCreateCampaignSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('camp-name').value;
  const gatewayType = document.getElementById('camp-gateway').value;
  const contacts = document.getElementById('camp-contacts').value;
  const template = document.getElementById('camp-template').value;
  const minDelay = parseInt(document.getElementById('camp-min-delay').value, 10);
  const maxDelay = parseInt(document.getElementById('camp-max-delay').value, 10);

  const btn = document.getElementById('btn-create-camp');
  btn.disabled = true;
  btn.innerText = 'Starting...';

  try {
    const res = await fetch('/api/v1/broadcasts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        gateway_type: gatewayType,
        contacts,
        message_template: template,
        min_delay_sec: minDelay,
        max_delay_sec: maxDelay,
        auto_start: true
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Campaign '${name}' started`, 'success');
      loadCampaigns();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Start Broadcast Campaign';
  }
}

async function handlePauseCampaign(id) {
  await fetch(`/api/v1/broadcasts/${id}/pause`, { method: 'POST' });
  loadCampaigns();
}

async function handleResumeCampaign(id) {
  await fetch(`/api/v1/broadcasts/${id}/start`, { method: 'POST' });
  loadCampaigns();
}

async function handleCancelCampaign(id) {
  if (!confirm('Cancel this campaign?')) return;
  await fetch(`/api/v1/broadcasts/${id}/cancel`, { method: 'POST' });
  loadCampaigns();
}

async function handleDirectMsgSubmit(e) {
  e.preventDefault();
  const phone = document.getElementById('direct-phone').value;
  const gateway = document.getElementById('direct-gateway').value;
  const content = document.getElementById('direct-content').value;
  const mediaUrl = document.getElementById('direct-media-url').value;

  const btn = document.getElementById('btn-direct-submit');
  btn.disabled = true;
  btn.innerText = 'Sending...';

  try {
    let res;
    if (mediaUrl) {
      res = await fetch('/api/v1/messages/send-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, media_url: mediaUrl, caption: content, gateway })
      });
    } else {
      res = await fetch('/api/v1/messages/send-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: content, gateway })
      });
    }

    const data = await res.json();
    if (data.success) {
      showToast(`Message sent to ${phone}`, 'success');
      document.getElementById('direct-content').value = '';
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Send Message';
  }
}

async function handleCreateApiKey() {
  const name = prompt('Enter a label for this API Key (e.g. "WHMCS Server"):', 'WHMCS Server');
  if (!name) return;

  try {
    const res = await fetch('/api/v1/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.success) {
      showToast('API Key generated', 'success');
      loadApiKeys();
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function handleToggleApiKey(id) {
  await fetch(`/api/v1/api-keys/${id}/toggle`, { method: 'PATCH' });
  loadApiKeys();
}

async function handleDeleteApiKey(id) {
  if (!confirm('Delete this API Key?')) return;
  await fetch(`/api/v1/api-keys/${id}`, { method: 'DELETE' });
  loadApiKeys();
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const minDelay = document.getElementById('set-min-delay').value;
  const maxDelay = document.getElementById('set-max-delay').value;
  const dailyLimit = document.getElementById('set-daily-limit').value;
  const defaultGw = document.getElementById('set-default-gw').value;
  const typingSim = document.getElementById('set-typing-sim').checked ? 'true' : 'false';
  const quietHours = document.getElementById('set-quiet-hours').checked ? 'true' : 'false';
  const quietStart = document.getElementById('set-quiet-start').value;
  const quietEnd = document.getElementById('set-quiet-end').value;

  try {
    const token = localStorage.getItem('un_token') || localStorage.getItem('un_user_token');
    const userPayload = {
      anti_ban_min_delay: parseInt(minDelay),
      anti_ban_max_delay: parseInt(maxDelay),
      anti_ban_daily_limit: parseInt(dailyLimit),
      default_gateway: defaultGw,
      anti_ban_typing_sim: typingSim === 'true',
      anti_ban_quiet_hours: quietHours === 'true',
      anti_ban_quiet_start: quietStart,
      anti_ban_quiet_end: quietEnd
    };

    let res;
    if (token) {
      res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(userPayload)
      });
    } else {
      res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: userPayload })
      });
    }

    const data = await res.json();
    if (data.success) {
      showToast('Anti-ban settings saved successfully', 'success');
      await fetchSettings();
    } else {
      showToast(data.message || 'Failed to save settings', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Quick Send Modal
 */
function openQuickSendModal() {
  document.getElementById('modal-quick-send').classList.remove('hidden');
}

function closeQuickSendModal() {
  document.getElementById('modal-quick-send').classList.add('hidden');
}

function toggleQuickType(type) {
  if (type === 'otp') {
    document.getElementById('quick-text-group').classList.add('hidden');
    document.getElementById('quick-otp-group').classList.remove('hidden');
  } else {
    document.getElementById('quick-text-group').classList.remove('hidden');
    document.getElementById('quick-otp-group').classList.add('hidden');
  }
}

async function handleQuickSend(e) {
  e.preventDefault();
  const phone = document.getElementById('quick-phone').value;
  const gateway = document.getElementById('quick-gateway').value;
  const type = document.querySelector('input[name="quick_type"]:checked').value;
  const message = document.getElementById('quick-message').value;
  const service = document.getElementById('quick-service').value;

  const btn = document.getElementById('btn-quick-send-submit');
  btn.disabled = true;
  btn.innerText = 'Dispatching...';

  try {
    let res;
    if (gateway.startsWith('sms_')) {
      let simSlot = 1;
      let gwType = 'cloud_gateway';
      if (gateway === 'sms_cloud') {
        gwType = 'cloud_gateway';
      } else if (gateway === 'sms_android_sim1') {
        simSlot = 1;
        gwType = 'android_sim';
      } else if (gateway === 'sms_android_sim2') {
        simSlot = 2;
        gwType = 'android_sim';
      }

      const token = localStorage.getItem('un_token');
      res = await fetch('/api/v1/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipient: phone,
          message: type === 'otp' ? `Your ${service} verification OTP is: ${Math.floor(100000 + Math.random() * 900000)}` : message,
          gateway_type: gwType,
          sim_slot: simSlot
        })
      });
    } else if (type === 'otp') {
      res = await fetch('/api/v1/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, service_name: service, gateway })
      });
    } else {
      res = await fetch('/api/v1/messages/send-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message, gateway })
      });
    }

    const data = await res.json();
    if (data.success) {
      showToast(`Dispatched to ${phone}`, 'success');
      closeQuickSendModal();
      refreshCurrentTab();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Dispatch';
  }
}

/**
 * Helpers
 */
function insertVariable(textareaId, variable) {
  const el = document.getElementById(textareaId);
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const text = el.value;
  el.value = text.substring(0, start) + variable + text.substring(end);
  el.focus();
  el.selectionStart = el.selectionEnd = start + variable.length;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const styles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-white text-slate-800 border-slate-200 shadow-sm'
  };

  const toast = document.createElement('div');
  toast.className = `px-3.5 py-2.5 rounded-lg text-xs font-medium border shadow-xs pointer-events-auto flex items-center gap-2 animate-slide-up ${styles[type] || styles.info}`;
  toast.innerText = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  showToast('Copied to clipboard', 'info');
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
