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

<!-- Toast Container -->
<div id="toastZone" class="fixed top-5 right-5 z-[60] space-y-2 pointer-events-none"></div>

<script src="/admin/js/admin.js"></script>
</body>
</html>
