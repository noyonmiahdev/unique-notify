<?php
/**
 * Super Admin Console - PHP Native Wrapper
 * Unique-Notify WhatsApp Multi-Gateway SaaS Platform
 */
?>
<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-50">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unique-Notify — Super Admin Console</title>
  <!-- Local Static Tailwind CSS (Zero Dependency / Offline Ready) -->
  <link rel="stylesheet" href="/css/tailwind.min.css">
  <!-- Admin Custom Styling -->
  <link rel="stylesheet" href="/css/admin.css">
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <!-- Google Fonts: Inter & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body class="h-full bg-slate-50 text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-800">

<!-- ============================================================
     SECTION 1: PURE LIGHT-THEME ADMIN AUTH SCREEN
     ============================================================ -->
<div id="authScreen" class="min-h-screen flex items-center justify-center p-4 bg-slate-50">
  <div class="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-lg p-8">
    <!-- Header -->
    <div class="text-center mb-7">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs mb-3.5">
        <i data-lucide="shield-check" class="w-7 h-7"></i>
      </div>
      <h1 class="text-xl font-bold text-slate-900 tracking-tight">Super Admin Console</h1>
      <p class="text-xs text-slate-500 mt-1">Unique-Notify — Dedicated Administrative Authentication</p>
      
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium mt-3 border border-slate-200">
        <i data-lucide="lock" class="w-3 h-3 text-slate-500"></i>
        <span>Protected Gateway: 5 attempts max / 15m</span>
      </div>
    </div>

    <!-- Alert Box -->
    <div id="authAlert" class="hidden mb-4 p-3.5 rounded-xl border text-xs"></div>

    <!-- Login Form -->
    <form id="authForm" onsubmit="doAdminLogin(event)" class="space-y-4 text-xs">
      <div>
        <label class="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Admin Email</label>
        <div class="relative">
          <i data-lucide="mail" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
          <input id="loginEmail" type="email" value="admin@uniquenotify.com" required
                 class="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition">
        </div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Admin Password</label>
        <div class="relative">
          <i data-lucide="key-round" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
          <input id="loginPassword" type="password" value="admin123" required
                 class="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition">
        </div>
      </div>

      <button type="submit" id="loginBtn" class="btn-submit-login mt-2">
        <i data-lucide="shield-check" class="w-4 h-4"></i>
        <span>Authenticate as Super Admin</span>
      </button>
    </form>

    <!-- Footer Links -->
    <div class="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
      <a href="/" class="hover:text-slate-800 transition flex items-center gap-1">
        <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
        <span>Main Site</span>
      </a>
      <a href="/docs" class="hover:text-slate-800 transition flex items-center gap-1">
        <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
        <span>Public Docs</span>
      </a>
    </div>
  </div>
</div>

<!-- ============================================================
     SECTION 2: PURE LIGHT-THEME ADMIN DASHBOARD APP
     ============================================================ -->
<div id="adminApp" class="hidden h-screen flex overflow-hidden bg-slate-50">

  <!-- ─── PURE LIGHT SIDEBAR ─── -->
  <aside id="sidebar" class="w-64 min-h-screen bg-white border-r border-slate-200 flex flex-col flex-shrink-0 transition-all duration-200">
    <!-- Brand -->
    <div class="p-5 border-b border-slate-100 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
          <i data-lucide="shield-check" class="w-5 h-5"></i>
        </div>
        <div>
          <p class="font-bold text-slate-900 text-sm tracking-tight leading-tight">Unique-Notify</p>
          <p class="text-[11px] text-slate-500 font-medium">Super Admin</p>
        </div>
      </div>
    </div>

    <!-- Admin Profile Badge -->
    <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
          <i data-lucide="user" class="w-3.5 h-3.5"></i>
        </div>
        <div class="overflow-hidden">
          <p id="sidebarAdminName" class="text-xs font-semibold text-slate-900 truncate">Administrator</p>
          <p id="sidebarAdminEmail" class="text-[11px] text-slate-500 font-mono truncate">admin@...</p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1">Main</p>
      <a class="sidebar-link active" id="nav-overview" onclick="gotoPage('overview')">
        <i data-lucide="layout-grid" class="w-4 h-4 text-slate-500"></i>
        <span>Dashboard Overview</span>
      </a>

      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-4 pb-1">Management</p>
      <a class="sidebar-link" id="nav-users" onclick="gotoPage('users')">
        <i data-lucide="users" class="w-4 h-4 text-slate-500"></i>
        <span>Client Accounts</span>
      </a>
      <a class="sidebar-link" id="nav-payments" onclick="gotoPage('payments')">
        <i data-lucide="credit-card" class="w-4 h-4 text-slate-500"></i>
        <span>Payments & Billing</span>
        <span id="sidebarPaymentBadge" class="hidden ml-auto px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white"></span>
      </a>
      <a class="sidebar-link" id="nav-gateways" onclick="gotoPage('gateways')">
        <i data-lucide="server" class="w-4 h-4 text-slate-500"></i>
        <span>Gateway Engines</span>
      </a>

      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-4 pb-1">SMS Automation &amp; Billing</p>
      <a class="sidebar-link" id="nav-smsgateways" onclick="gotoPage('smsgateways')">
        <i data-lucide="radio" class="w-4 h-4 text-slate-500"></i>
        <span>SMS Gateways</span>
      </a>
      <a class="sidebar-link" id="nav-smsdevices" onclick="gotoPage('smsdevices')">
        <i data-lucide="smartphone" class="w-4 h-4 text-slate-500"></i>
        <span>Android Nodes &amp; Sender IDs</span>
      </a>
      <a class="sidebar-link" id="nav-smsbilling" onclick="gotoPage('smsbilling')">
        <i data-lucide="coins" class="w-4 h-4 text-slate-500"></i>
        <span>SMS Pricing &amp; Packages</span>
      </a>
      <a class="sidebar-link" id="nav-smsusers" onclick="gotoPage('smsusers')">
        <i data-lucide="wallet" class="w-4 h-4 text-slate-500"></i>
        <span>User SMS Wallets</span>
      </a>
      <a class="sidebar-link" id="nav-smstransactions" onclick="gotoPage('smstransactions')">
        <i data-lucide="receipt" class="w-4 h-4 text-slate-500"></i>
        <span>SMS Top-up Requests</span>
        <span id="sidebarSmsPendingBadge" class="hidden ml-auto px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white"></span>
      </a>

      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-4 pb-1">Security</p>
      <a class="sidebar-link" id="nav-audit" onclick="gotoPage('audit')">
        <i data-lucide="shield" class="w-4 h-4 text-slate-500"></i>
        <span>Audit Logs</span>
      </a>

      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-4 pb-1">Configuration</p>
      <a class="sidebar-link" id="nav-antiban" onclick="gotoPage('antiban')">
        <i data-lucide="settings-2" class="w-4 h-4 text-slate-500"></i>
        <span>Anti-Ban Settings</span>
      </a>
      <a class="sidebar-link" id="nav-settings" onclick="gotoPage('settings')">
        <i data-lucide="settings" class="w-4 h-4 text-slate-500"></i>
        <span>System Settings</span>
      </a>
      <a class="sidebar-link" id="nav-plans" onclick="gotoPage('plans')">
        <i data-lucide="package" class="w-4 h-4 text-slate-500"></i>
        <span>Pricing Plans</span>
      </a>
    </nav>

    <!-- Sidebar Footer -->
    <div class="p-3 border-t border-slate-100 bg-slate-50/50 space-y-1">
      <a href="/docs" target="_blank" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white transition">
        <i data-lucide="book-open" class="w-3.5 h-3.5 text-slate-500"></i>
        <span>Developer Docs</span>
      </a>
      <a href="/" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white transition">
        <i data-lucide="home" class="w-3.5 h-3.5 text-slate-500"></i>
        <span>View Main Site</span>
      </a>
      <button onclick="doLogout()" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition">
        <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
        <span>Sign Out</span>
      </button>
    </div>
  </aside>

  <!-- ─── MAIN APP CONTENT AREA ─── -->
  <div class="flex-1 flex flex-col overflow-hidden">

    <!-- Top Navigation Header -->
    <header class="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between flex-shrink-0 shadow-xs z-20">
      <div>
        <h1 id="pageTitle" class="text-base font-bold text-slate-900">Dashboard Overview</h1>
        <p id="pageSubtitle" class="text-xs text-slate-500 mt-0.5">Welcome back, Administrator</p>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>System Online</span>
        </div>
        <div class="text-xs text-slate-500 hidden sm:block font-mono">
          <span id="currentTime"></span>
        </div>
      </div>
    </header>

    <!-- Page Body -->
    <main class="flex-1 overflow-y-auto p-6 space-y-6">

      <!-- ──────────── TAB: OVERVIEW ──────────── -->
      <div id="page-overview" class="tab-content active space-y-6">
        <!-- Metrics Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="stat-card">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-slate-500">Total Clients</span>
              <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <i data-lucide="users" class="w-4 h-4"></i>
              </div>
            </div>
            <p id="ov-totalUsers" class="text-2xl font-bold text-slate-900">—</p>
            <p class="text-[11px] text-slate-500 mt-1"><span id="ov-activeUsers">0</span> active accounts</p>
          </div>

          <div class="stat-card">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-slate-500">Messages Sent</span>
              <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <i data-lucide="send" class="w-4 h-4"></i>
              </div>
            </div>
            <p id="ov-sentMessages" class="text-2xl font-bold text-slate-900">—</p>
            <p class="text-[11px] text-slate-500 mt-1">of <span id="ov-totalMessages">0</span> total routed</p>
          </div>

          <div class="stat-card">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-slate-500">Pending Payments</span>
              <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <i data-lucide="clock-3" class="w-4 h-4"></i>
              </div>
            </div>
            <p id="ov-pendingPayments" class="text-2xl font-bold text-amber-600">—</p>
            <p class="text-[11px] text-slate-500 mt-1">Awaiting approval</p>
          </div>

          <div class="stat-card">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-slate-500">Total Revenue</span>
              <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <i data-lucide="banknote" class="w-4 h-4"></i>
              </div>
            </div>
            <p id="ov-totalRevenue" class="text-2xl font-bold text-slate-900">—</p>
            <p class="text-[11px] text-slate-500 mt-1">BDT collected (approved)</p>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="flex flex-wrap gap-2.5">
          <button onclick="gotoPage('payments')" class="btn-primary">
            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>Review Pending Payments
          </button>
          <button onclick="gotoPage('users')" class="btn-secondary">
            <i data-lucide="users" class="w-3.5 h-3.5"></i>Manage Clients
          </button>
          <button onclick="loadOverview()" class="btn-secondary">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>Refresh Dashboard
          </button>
        </div>

        <!-- Recent Audit Events -->
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div class="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <i data-lucide="activity" class="w-4 h-4 text-emerald-600"></i>
              Recent Security & Administrative Actions
            </div>
            <button onclick="gotoPage('audit')" class="text-xs font-semibold text-emerald-700 hover:text-emerald-800">View All Logs</button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th class="py-2.5 px-4 text-left">Time</th>
                  <th class="py-2.5 px-4 text-left">Action</th>
                  <th class="py-2.5 px-4 text-left">User / IP</th>
                  <th class="py-2.5 px-4 text-left">Details</th>
                </tr>
              </thead>
              <tbody id="ov-auditTbody" class="divide-y divide-slate-50 font-mono"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ──────────── TAB: CLIENT ACCOUNTS ──────────── -->
      <div id="page-users" class="tab-content space-y-5">
        <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Registered SaaS Clients</h2>
            <p class="text-xs text-slate-500">Manage client accounts, adjust credits, change plans, and login as user.</p>
          </div>
          <div class="flex items-center gap-2">
            <input id="userSearchInput" type="text" placeholder="Search by name, email..." onkeyup="loadUsers()"
                   class="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white w-52 focus:border-emerald-600 focus:outline-none">
            <select id="userStatusFilter" onchange="loadUsers()" class="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING">Pending</option>
            </select>
            <button onclick="loadUsers()" class="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                <tr>
                  <th class="py-3 px-4 text-left">Client</th>
                  <th class="py-3 px-4 text-left">Company</th>
                  <th class="py-3 px-4 text-left">Plan</th>
                  <th class="py-3 px-4 text-left">Credits</th>
                  <th class="py-3 px-4 text-left">Messages</th>
                  <th class="py-3 px-4 text-left">Status</th>
                  <th class="py-3 px-4 text-left">Joined</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="usersTbody" class="divide-y divide-slate-100"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ──────────── TAB: PAYMENTS & BILLING ──────────── -->
      <div id="page-payments" class="tab-content space-y-5">
        <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Payments & Billing Approvals</h2>
            <p class="text-xs text-slate-500">Verify bKash, Nagad, Rocket, and Bank TrxIDs before approving client upgrades.</p>
          </div>
          <div class="flex items-center gap-2">
            <select id="paymentFilter" onchange="loadPayments()" class="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
              <option value="PENDING">Pending Approval</option>
              <option value="">All Transactions</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button onclick="loadPayments()" class="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                <tr>
                  <th class="py-3 px-4 text-left">#</th>
                  <th class="py-3 px-4 text-left">Client</th>
                  <th class="py-3 px-4 text-left">Plan & Amount</th>
                  <th class="py-3 px-4 text-left">Method</th>
                  <th class="py-3 px-4 text-left">Transaction ID</th>
                  <th class="py-3 px-4 text-left">Status</th>
                  <th class="py-3 px-4 text-left">Date</th>
                  <th class="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody id="paymentsTbody" class="divide-y divide-slate-100"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ──────────── TAB: GATEWAYS ──────────── -->
      <div id="page-gateways" class="tab-content space-y-5">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Gateway Engine Status</h2>
          <p class="text-xs text-slate-500">Monitor WhatsApp delivery engines — Meta Cloud API and Baileys QR sessions.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5" id="gatewaysGrid"></div>
      </div>

      <!-- ──────────── TAB: AUDIT LOGS ──────────── -->
      <div id="page-audit" class="tab-content space-y-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Security Audit Logs</h2>
            <p class="text-xs text-slate-500">Immutable log of logins, brute-force blocks, credit adjustments, and settings changes.</p>
          </div>
          <button onclick="loadAuditLogs()" class="btn-secondary">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>Refresh
          </button>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs font-mono">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-sans font-semibold text-[11px]">
                <tr>
                  <th class="py-3 px-4 text-left">ID</th>
                  <th class="py-3 px-4 text-left">Timestamp</th>
                  <th class="py-3 px-4 text-left">Security Action</th>
                  <th class="py-3 px-4 text-left">User</th>
                  <th class="py-3 px-4 text-left">IP Address</th>
                  <th class="py-3 px-4 text-left">Details</th>
                </tr>
              </thead>
              <tbody id="auditTbody" class="divide-y divide-slate-100"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ──────────── TAB: ANTI-BAN SETTINGS ──────────── -->
      <div id="page-antiban" class="tab-content space-y-5">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Global Anti-Ban Engine Configuration</h2>
          <p class="text-xs text-slate-500">These are global defaults for all clients to ensure WhatsApp accounts do not get flagged.</p>
        </div>
        <form id="antibanForm" onsubmit="saveAntiBanSettings(event)" class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 text-xs">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <h3 class="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-100 pb-2">
                <i data-lucide="timer" class="w-4 h-4 text-emerald-600"></i>Message Dispatch Timing
              </h3>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-semibold text-slate-700 uppercase mb-1">Min Delay (sec)</label>
                  <input type="number" id="ab-min" min="1" max="60"
                         class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
                </div>
                <div>
                  <label class="block font-semibold text-slate-700 uppercase mb-1">Max Delay (sec)</label>
                  <input type="number" id="ab-max" min="1" max="120"
                         class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
                </div>
              </div>
              <div>
                <label class="block font-semibold text-slate-700 uppercase mb-1">Typing Simulation</label>
                <select id="ab-typing" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
                  <option value="true">Enabled — Sends composing... indicator</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div>
                <label class="block font-semibold text-slate-700 uppercase mb-1">Daily Message Limit (per device)</label>
                <input type="number" id="ab-daily" min="100" max="10000"
                       class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
              </div>
            </div>
            <div class="space-y-4">
              <h3 class="font-bold text-slate-900 text-xs flex items-center gap-2 border-b border-slate-100 pb-2">
                <i data-lucide="moon" class="w-4 h-4 text-emerald-600"></i>Quiet Hours (No Dispatch)
              </h3>
              <div>
                <label class="block font-semibold text-slate-700 uppercase mb-1">Enable Quiet Hours</label>
                <select id="ab-quiet" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
                  <option value="false">Disabled — Send 24/7</option>
                  <option value="true">Enabled — Pause during quiet period</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-semibold text-slate-700 uppercase mb-1">Quiet Start</label>
                  <input type="time" id="ab-qstart"
                         class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
                </div>
                <div>
                  <label class="block font-semibold text-slate-700 uppercase mb-1">Quiet End</label>
                  <input type="time" id="ab-qend"
                         class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
                </div>
              </div>
              <div>
                <label class="block font-semibold text-slate-700 uppercase mb-1">Default Gateway</label>
                <select id="ab-gateway" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
                  <option value="meta">Meta WhatsApp Cloud API (Official, Zero Ban Risk)</option>
                  <option value="qr">Baileys Multi-Device QR Session</option>
                </select>
              </div>
            </div>
          </div>
          <div class="pt-4 mt-5 border-t border-slate-100 flex justify-end">
            <button type="submit" class="btn-primary">
              <i data-lucide="save" class="w-3.5 h-3.5"></i>Save Global Anti-Ban Settings
            </button>
          </div>
        </form>
      </div>

      <!-- ──────────── TAB: SYSTEM SETTINGS ──────────── -->
      <div id="page-settings" class="tab-content space-y-5">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Payment Channels & System Configuration</h2>
          <p class="text-xs text-slate-500">Configure bKash, Nagad, Rocket, and Bank transfer receiving accounts shown to clients during checkout.</p>
        </div>
        <form id="settingsForm" onsubmit="saveSettings(event)" class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4 text-xs">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-3">
              <div>
                <label class="block font-semibold text-slate-700 uppercase mb-1">bKash Account Number</label>
                <input type="text" id="s-bkash" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
              </div>
              <div>
                <label class="block font-semibold text-slate-700 uppercase mb-1">Nagad Account Number</label>
                <input type="text" id="s-nagad" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
              </div>
              <div>
                <label class="block font-semibold text-slate-700 uppercase mb-1">Rocket Account Number</label>
                <input type="text" id="s-rocket" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
              </div>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 uppercase mb-1">Bank Transfer Details</label>
              <textarea id="s-bank" rows="6" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none resize-none"></textarea>
            </div>
          </div>
          <div class="pt-4 border-t border-slate-100 flex justify-end">
            <button type="submit" class="btn-primary"><i data-lucide="save" class="w-3.5 h-3.5"></i>Save Settings</button>
          </div>
        </form>
      </div>

      <!-- ──────────── TAB: PLANS ──────────── -->
      <div id="page-plans" class="tab-content space-y-5">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Subscription Plans</h2>
          <p class="text-xs text-slate-500">Overview of active SaaS pricing tiers.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5" id="plansGrid"></div>
      </div>

      <!-- ──────────── TAB: SMS GATEWAYS (ADMIN ONLY) ──────────── -->
      <div id="page-smsgateways" class="tab-content space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Third-Party SMS Gateways</h2>
            <p class="text-xs text-slate-500">Super Admin only. Configure Greenweb, BulkSMSBD, or Custom HTTP SMS Gateways.</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="openTestSmsModal()" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition">
              <i data-lucide="send" class="w-3.5 h-3.5"></i>
              <span>Test SMS Dispatch</span>
            </button>
            <button onclick="openAddSmsGatewayModal()" class="btn-primary">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Add Gateway Provider</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="smsGatewaysGrid"></div>
      </div>

      <!-- ──────────── TAB: ANDROID NODES & SENDER IDS (ADMIN ONLY) ──────────── -->
      <div id="page-smsdevices" class="tab-content space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">Android Mobile Nodes &amp; Sender IDs</h2>
            <p class="text-xs text-slate-500">Configure Sender ID names for SIM 1 &amp; SIM 2, and assign devices as Shared Platform Pool or Dedicated to a client.</p>
          </div>
          <button onclick="loadAdminSmsDevices()" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            <span>Refresh Devices</span>
          </button>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-500 font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th class="py-3 px-4">Device &amp; Phone</th>
                  <th class="py-3 px-4">Paired By</th>
                  <th class="py-3 px-4">SIM 1 &amp; Sender ID</th>
                  <th class="py-3 px-4">SIM 2 &amp; Sender ID</th>
                  <th class="py-3 px-4">Routing Pool</th>
                  <th class="py-3 px-4">Assigned Client</th>
                  <th class="py-3 px-4">Status &amp; Battery</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="adminSmsDevicesTbody" class="divide-y divide-slate-100 font-medium text-slate-700">
                <tr><td colspan="8" class="text-center py-8 text-slate-400">Loading Android devices...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ──────────── TAB: SMS PRICING & PACKAGES ──────────── -->
      <div id="page-smsbilling" class="tab-content space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">SMS Pricing &amp; Packages</h2>
            <p class="text-xs text-slate-500">Set Pay-as-you-go per-SMS rates (Default: ৳0.35) and create bundle packages.</p>
          </div>
          <button onclick="openAddSmsPackageModal()" class="btn-primary">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Create SMS Package</span>
          </button>
        </div>

        <!-- Global Rate Settings Box -->
        <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <h3 class="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <i data-lucide="coins" class="w-4 h-4 text-emerald-600"></i>
            <span>Global Pay-As-You-Go Rate Settings</span>
          </h3>
          <p class="text-xs text-slate-500 mb-4">When a user has no active bundle, each SMS sent through Cloud Gateway deducts this rate.</p>
          <form onsubmit="saveSmsPricingSettings(event)" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Per SMS Rate (BDT)</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                <input type="number" step="0.01" min="0.01" id="sms-set-rate" required value="0.35" class="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none text-xs font-semibold text-slate-900">
              </div>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 uppercase text-[11px] mb-1">Min Recharge Amount (BDT)</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                <input type="number" step="1" min="10" id="sms-set-min" required value="50.00" class="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none text-xs font-semibold text-slate-900">
              </div>
            </div>
            <div class="flex items-end">
              <button type="submit" class="btn-primary w-full justify-center">
                <i data-lucide="save" class="w-3.5 h-3.5"></i>
                <span>Save Rate Settings</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Packages List -->
        <div>
          <h3 class="text-sm font-bold text-slate-900 mb-3">Prepaid SMS Bundle Packages</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="smsPackagesAdminGrid"></div>
        </div>
      </div>

      <!-- ──────────── TAB: USER SMS WALLETS ──────────── -->
      <div id="page-smsusers" class="tab-content space-y-5">
        <div>
          <h2 class="text-lg font-bold text-slate-900">User SMS Wallets</h2>
          <p class="text-xs text-slate-500">Monitor all clients' prepaid SMS cash balances, unit credits, and assign custom per-SMS rates.</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th class="py-3 px-4 text-left">Client</th>
                  <th class="py-3 px-4 text-left">Cash Balance</th>
                  <th class="py-3 px-4 text-left">SMS Credits</th>
                  <th class="py-3 px-4 text-left">Rate / SMS</th>
                  <th class="py-3 px-4 text-left">Joined</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="smsUsersTbody" class="divide-y divide-slate-100"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ──────────── TAB: SMS TOP-UP REQUESTS ──────────── -->
      <div id="page-smstransactions" class="tab-content space-y-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">SMS Top-up &amp; Package Approvals</h2>
            <p class="text-xs text-slate-500">Review pending bKash / Nagad / Rocket transaction requests from clients.</p>
          </div>
          <div class="flex items-center gap-2">
            <select id="smsTxStatusFilter" onchange="loadSmsTransactions()" class="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none">
              <option value="all">All Status</option>
              <option value="PENDING" selected>Pending Only</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th class="py-3 px-4 text-left">Trx ID</th>
                  <th class="py-3 px-4 text-left">Client</th>
                  <th class="py-3 px-4 text-left">Type &amp; Description</th>
                  <th class="py-3 px-4 text-left">Amount / Credits</th>
                  <th class="py-3 px-4 text-left">Method &amp; Sender</th>
                  <th class="py-3 px-4 text-left">Status</th>
                  <th class="py-3 px-4 text-left">Date</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="smsTransactionsTbody" class="divide-y divide-slate-100 font-mono"></tbody>
            </table>
          </div>
        </div>
      </div>

    </main>
  </div>
</div>

<!-- ─── USER DETAIL MODAL ─── -->
<div id="userModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
  <div class="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col max-h-[90vh]">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
      <div>
        <h3 id="modalUserName" class="font-bold text-slate-900 text-sm">Client Details</h3>
        <p id="modalUserEmail" class="text-xs text-slate-500 font-mono"></p>
      </div>
      <button onclick="closeUserModal()" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 px-6 pt-3 border-b border-slate-100 flex-shrink-0 text-xs">
      <button onclick="switchModalTab('overview')" id="mtab-overview" class="modal-tab-btn px-4 py-2 font-semibold rounded-t-lg text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50">Overview</button>
      <button onclick="switchModalTab('credits')" id="mtab-credits" class="modal-tab-btn px-4 py-2 font-semibold rounded-t-lg text-slate-500 hover:text-slate-700">Credits & Plan</button>
      <button onclick="switchModalTab('antiban')" id="mtab-antiban" class="modal-tab-btn px-4 py-2 font-semibold rounded-t-lg text-slate-500 hover:text-slate-700">Anti-Ban Settings</button>
      <button onclick="switchModalTab('messages')" id="mtab-messages" class="modal-tab-btn px-4 py-2 font-semibold rounded-t-lg text-slate-500 hover:text-slate-700">Message History</button>
      <button onclick="switchModalTab('security')" id="mtab-security" class="modal-tab-btn px-4 py-2 font-semibold rounded-t-lg text-slate-500 hover:text-slate-700">Security</button>
    </div>

    <!-- Modal Content Area -->
    <div class="flex-1 overflow-y-auto p-6 text-xs">
      <!-- Tab: Overview -->
      <div id="mpanel-overview" class="modal-panel grid grid-cols-2 gap-3"></div>

      <!-- Tab: Credits & Plan -->
      <div id="mpanel-credits" class="modal-panel hidden space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 uppercase mb-1">Credit Balance</label>
            <input type="number" id="m-credits" class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-semibold text-slate-700 uppercase mb-1">Subscription Plan</label>
            <select id="m-planId" class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none"></select>
          </div>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">Account Status</label>
          <select id="m-status" class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none">
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">Reason / Note</label>
          <input type="text" id="m-reason" placeholder="Optional note for this change..." class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none">
        </div>
        <button onclick="saveUserCredits()" class="btn-primary"><i data-lucide="save" class="w-3.5 h-3.5"></i>Save Credits & Plan</button>
      </div>

      <!-- Tab: Anti-Ban -->
      <div id="mpanel-antiban" class="modal-panel hidden space-y-4">
        <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
          <i data-lucide="shield-alert" class="w-4 h-4 flex-shrink-0 mt-0.5"></i>
          <span>These parameters customize the Anti-Ban engine for this client.</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 uppercase mb-1">Min Delay (sec)</label>
            <input type="number" id="m-ab-min" class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-semibold text-slate-700 uppercase mb-1">Max Delay (sec)</label>
            <input type="number" id="m-ab-max" class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none">
          </div>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">Daily Limit</label>
          <input type="number" id="m-ab-daily" class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">Typing Simulation</label>
          <select id="m-ab-typing" class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none">
            <option value="1">Enabled</option>
            <option value="0">Disabled</option>
          </select>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">Default Gateway</label>
          <select id="m-ab-gateway" class="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-600 focus:outline-none">
            <option value="meta">Meta WhatsApp Cloud API</option>
            <option value="qr">Baileys QR Session</option>
          </select>
        </div>
        <button onclick="saveUserAntiBan()" class="btn-primary"><i data-lucide="save" class="w-3.5 h-3.5"></i>Save Client Anti-Ban</button>
      </div>

      <!-- Tab: Message History -->
      <div id="mpanel-messages" class="modal-panel hidden">
        <div class="overflow-x-auto rounded-xl border border-slate-200">
          <table class="w-full text-xs">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
              <tr>
                <th class="py-2.5 px-3 text-left">Time</th>
                <th class="py-2.5 px-3 text-left">Gateway</th>
                <th class="py-2.5 px-3 text-left">Recipient</th>
                <th class="py-2.5 px-3 text-left">Type</th>
                <th class="py-2.5 px-3 text-left">Content</th>
                <th class="py-2.5 px-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody id="m-msgTbody" class="divide-y divide-slate-100 font-mono"></tbody>
          </table>
        </div>
      </div>

      <!-- Tab: Security -->
      <div id="mpanel-security" class="modal-panel hidden space-y-4">
        <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
          <p class="font-semibold text-slate-800 uppercase mb-2">Reset Client Password</p>
          <div class="flex gap-2.5">
            <input type="password" id="m-newPassword" placeholder="Enter new password (min 6 chars)" class="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
            <button onclick="saveUserPassword()" class="btn-primary flex-shrink-0">
              <i data-lucide="key" class="w-3.5 h-3.5"></i>Reset Password
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ─── MODAL: ADD / EDIT SMS GATEWAY (ADMIN ONLY) ─── -->
<div id="modalSmsGateway" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
  <div class="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <h3 id="modalSmsGatewayTitle" class="font-bold text-slate-900 text-sm">Add Third-Party SMS Gateway</h3>
      <button onclick="closeSmsGatewayModal()" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>
    <form onsubmit="saveSmsGateway(event)" class="p-6 space-y-4 text-xs">
      <input type="hidden" id="gw-id">
      <div>
        <label class="block font-semibold text-slate-700 uppercase mb-1">Provider Driver</label>
        <select id="gw-provider" required class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
          <option value="greenweb">Greenweb Bangladesh (api.greenweb.com.bd)</option>
          <option value="bulksmsbd">BulkSMSBD (bulksmsbd.net)</option>
          <option value="custom_http">Generic Custom HTTP API (GET / POST)</option>
        </select>
      </div>
      <div>
        <label class="block font-semibold text-slate-700 uppercase mb-1">API Endpoint URL</label>
        <input type="text" id="gw-url" required placeholder="http://api.greenweb.com.bd/api.php" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none font-mono">
      </div>
      <div>
        <label class="block font-semibold text-slate-700 uppercase mb-1">API Key / Token</label>
        <input type="text" id="gw-key" placeholder="Enter provider API token or key" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none font-mono">
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">Sender ID / Mask</label>
          <input type="text" id="gw-sender" placeholder="Optional, e.g. UNIQUE" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">Default Gateway?</label>
          <select id="gw-default" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
            <option value="0">No (Secondary)</option>
            <option value="1">Yes (Primary Default)</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block font-semibold text-slate-700 uppercase mb-1">Notes / Description</label>
        <input type="text" id="gw-notes" placeholder="e.g. Bangladesh Bulk SMS Route 1" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
      </div>
      <div class="pt-4 border-t border-slate-100 flex justify-end gap-2">
        <button type="button" onclick="closeSmsGatewayModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
        <button type="submit" class="btn-primary"><i data-lucide="save" class="w-3.5 h-3.5"></i>Save Gateway</button>
      </div>
    </form>
  </div>
</div>

<!-- ─── MODAL: TEST SEND SMS GATEWAY ─── -->
<div id="modalSmsTest" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
  <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <h3 class="font-bold text-slate-900 text-sm">Test Dispatch SMS</h3>
      <button onclick="closeTestSmsModal()" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>
    <form onsubmit="handleTestSmsSend(event)" class="p-6 space-y-4 text-xs">
      <div>
        <label class="block font-semibold text-slate-700 uppercase mb-1">Target Gateway</label>
        <select id="test-sms-gateway" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none"></select>
      </div>
      <div>
        <label class="block font-semibold text-slate-700 uppercase mb-1">Recipient Mobile Number</label>
        <input type="text" id="test-sms-phone" required placeholder="017xxxxxxxx" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none font-mono">
      </div>
      <div>
        <label class="block font-semibold text-slate-700 uppercase mb-1">Test Message</label>
        <textarea id="test-sms-message" rows="3" required class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none resize-none">Test SMS from Unique-Notify Admin Console at ${new Date().toLocaleTimeString()}</textarea>
      </div>
      <div class="pt-4 border-t border-slate-100 flex justify-end gap-2">
        <button type="button" onclick="closeTestSmsModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
        <button type="submit" id="btnTestSmsSubmit" class="btn-primary"><i data-lucide="send" class="w-3.5 h-3.5"></i>Dispatch Test SMS</button>
      </div>
    </form>
  </div>
</div>

<!-- ─── MODAL: CREATE / EDIT SMS PACKAGE ─── -->
<div id="modalSmsPackage" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
  <div class="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <h3 id="modalSmsPackageTitle" class="font-bold text-slate-900 text-sm">Create SMS Package</h3>
      <button onclick="closeSmsPackageModal()" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>
    <form onsubmit="saveSmsPackage(event)" class="p-6 space-y-4 text-xs">
      <input type="hidden" id="pkg-id">
      <div>
        <label class="block font-semibold text-slate-700 uppercase mb-1">Package Name</label>
        <input type="text" id="pkg-name" required placeholder="e.g. Business 1K Pack" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">Total SMS Credits</label>
          <input type="number" id="pkg-count" required min="10" placeholder="1000" oninput="calculatePkgRate()" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">Package Price (BDT)</label>
          <input type="number" step="0.01" id="pkg-price" required min="1" placeholder="350.00" oninput="calculatePkgRate()" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">Calculated Rate / SMS (BDT)</label>
          <input type="number" step="0.001" id="pkg-rate" readonly class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">Validity (Days)</label>
          <input type="number" id="pkg-validity" required value="365" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
        </div>
      </div>
      <div>
        <label class="block font-semibold text-slate-700 uppercase mb-1">Features (One bullet per line)</label>
        <textarea id="pkg-features" rows="3" placeholder="1,000 SMS Credits&#10;Rate: ৳0.35/SMS&#10;Priority Queue&#10;365 Days Validity" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none resize-none"></textarea>
      </div>
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="pkg-popular" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600">
          <span class="font-medium text-slate-700">Mark as Popular / Featured</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="pkg-active" checked class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600">
          <span class="font-medium text-slate-700">Active for Sale</span>
        </label>
      </div>
      <div class="pt-4 border-t border-slate-100 flex justify-end gap-2">
        <button type="button" onclick="closeSmsPackageModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
        <button type="submit" class="btn-primary"><i data-lucide="save" class="w-3.5 h-3.5"></i>Save Package</button>
      </div>
    </form>
  </div>
</div>

<!-- ─── MODAL: ADJUST USER SMS WALLET & CUSTOM RATE ─── -->
<div id="modalAdjustSmsUser" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
  <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <div>
        <h3 id="modalSmsUserName" class="font-bold text-slate-900 text-sm">Adjust SMS Balance</h3>
        <p id="modalSmsUserEmail" class="text-xs text-slate-500 font-mono"></p>
      </div>
      <button onclick="closeAdjustSmsModal()" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>
    <form onsubmit="handleAdjustSmsSubmit(event)" class="p-6 space-y-4 text-xs">
      <input type="hidden" id="adj-user-id">
      
      <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2">
        <div>
          <span class="text-[11px] text-slate-500">Current Cash:</span>
          <p id="adj-curr-cash" class="font-bold text-slate-900 text-sm">৳0.00</p>
        </div>
        <div>
          <span class="text-[11px] text-slate-500">Current Credits:</span>
          <p id="adj-curr-credits" class="font-bold text-slate-900 text-sm">0 SMS</p>
        </div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 uppercase mb-1">Adjustment Action</label>
        <select id="adj-action" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none font-semibold">
          <option value="ADD_BALANCE">Add Cash Balance (৳ BDT)</option>
          <option value="DEDUCT_BALANCE">Deduct Cash Balance (৳ BDT)</option>
          <option value="ADD_CREDITS">Add SMS Unit Credits (SMS Count)</option>
          <option value="DEDUCT_CREDITS">Deduct SMS Unit Credits (SMS Count)</option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">Cash Amount (৳ BDT)</label>
          <input type="number" step="0.01" id="adj-amount" placeholder="0.00" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
        </div>
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">SMS Units (Count)</label>
          <input type="number" id="adj-credits" placeholder="0" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
        </div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 uppercase mb-1">Custom Rate / SMS (Optional, Empty = System Default ৳0.35)</label>
        <input type="number" step="0.01" min="0.01" id="adj-custom-rate" placeholder="e.g. 0.30" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
      </div>

      <div>
        <label class="block font-semibold text-slate-700 uppercase mb-1">Admin Audit Note</label>
        <input type="text" id="adj-note" placeholder="Reason for manual adjustment..." class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
      </div>

      <div class="pt-4 border-t border-slate-100 flex justify-end gap-2">
        <button type="button" onclick="closeAdjustSmsModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
        <button type="submit" class="btn-primary"><i data-lucide="check" class="w-3.5 h-3.5"></i>Apply Adjustment</button>
      </div>
    </form>
  </div>
</div>

<!-- ─── MODAL: CONFIGURE ANDROID SENDER ID & DEDICATED ASSIGNMENT ─── -->
<div id="modalAssignDevice" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
  <div class="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <div>
        <h3 id="modalAssignDeviceTitle" class="font-bold text-slate-900 text-sm">Configure Android Node &amp; Sender ID</h3>
        <p id="modalAssignDeviceSubtitle" class="text-xs text-slate-500 font-mono"></p>
      </div>
      <button onclick="closeAssignDeviceModal()" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>
    <form onsubmit="handleAssignDeviceSubmit(event)" class="p-6 space-y-4 text-xs">
      <input type="hidden" id="assign-device-id">

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">SIM 1 Sender ID / Mask Label</label>
          <input type="text" id="assign-sim1-sender" placeholder="e.g. ITStar-SIM1 or 017..." class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
          <p class="text-[10px] text-slate-400 mt-1">Displayed as the sender channel label</p>
        </div>
        <div>
          <label class="block font-semibold text-slate-700 uppercase mb-1">SIM 2 Sender ID / Mask Label</label>
          <input type="text" id="assign-sim2-sender" placeholder="e.g. ITStar-SIM2 or 018..." class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none">
          <p class="text-[10px] text-slate-400 mt-1">Displayed as the sender channel label</p>
        </div>
      </div>

      <div>
        <label class="block font-semibold text-slate-700 uppercase mb-1">Device Routing Mode</label>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-emerald-500 cursor-pointer bg-white">
            <input type="radio" name="assign_routing_mode" value="shared" onchange="toggleAssignClientDropdown(false)" class="text-emerald-600">
            <div>
              <span class="font-bold text-slate-900 block text-xs">Shared Platform Pool</span>
              <span class="text-[10px] text-slate-500">Available to all users as a public gateway route</span>
            </div>
          </label>
          <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-emerald-500 cursor-pointer bg-white">
            <input type="radio" name="assign_routing_mode" value="dedicated" onchange="toggleAssignClientDropdown(true)" class="text-emerald-600">
            <div>
              <span class="font-bold text-slate-900 block text-xs">Dedicated to Client</span>
              <span class="text-[10px] text-slate-500">Exclusively reserved for one chosen client</span>
            </div>
          </label>
        </div>
      </div>

      <div id="assign-client-box" class="hidden">
        <label class="block font-semibold text-slate-700 uppercase mb-1">Assign to Dedicated Client Account</label>
        <select id="assign-user-select" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:border-emerald-600 focus:outline-none font-medium">
          <!-- Populated dynamically with users -->
        </select>
        <p class="text-[10px] text-slate-400 mt-1">Only this customer will be able to dispatch SMS through this phone/SIMs</p>
      </div>

      <div class="pt-4 border-t border-slate-100 flex justify-end gap-2">
        <button type="button" onclick="closeAssignDeviceModal()" class="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
        <button type="submit" class="btn-primary"><i data-lucide="check" class="w-3.5 h-3.5"></i>Save Configuration</button>
      </div>
    </form>
  </div>
</div>

<!-- Toast Container -->
<div id="toastZone" class="fixed top-5 right-5 z-[60] space-y-2 pointer-events-none"></div>

<script src="/admin/js/admin.js"></script>
</body>
</html>
