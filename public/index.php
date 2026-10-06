<?php
$scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
$scriptDir  = rtrim(dirname($scriptName), '/');
if (preg_match('#/(admin|docs|public)$#i', $scriptDir)) {
    $projectBase = dirname($scriptDir);
} else {
    $projectBase = $scriptDir;
}
$projectBase = rtrim(str_replace('\\', '/', $projectBase), '/') . '/';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <base href="<?= htmlspecialchars($projectBase, ENT_QUOTES, 'UTF-8') ?>">
  <script>window.APP_ROOT = "<?= htmlspecialchars($projectBase, ENT_QUOTES, 'UTF-8') ?>";</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unique-Notify - WhatsApp Multi-Gateway & Notification SaaS</title>
  
  <!-- Local Static Tailwind CSS (Offline Ready) -->
  <link rel="stylesheet" href="css/tailwind.min.css">
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#ecfdf5',
              100: '#d1fae5',
              500: '#10b981',
              600: '#059669',
              700: '#047857'
            }
          }
        }
      }
    }
  </script>
  
  <!-- Google Fonts: Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  
  <!-- Socket.io -->
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
  <script>if(typeof io==='undefined'){document.write('<script src="socket.io/socket.io.js"><\/script>');}</script>

  <!-- Custom Stylesheet -->
  <link rel="stylesheet" href="css/style.css">
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col font-['Inter'] antialiased selection:bg-emerald-500 selection:text-white">

  <!-- Toast Notification Container -->
  <div id="toast-container" class="fixed top-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none"></div>

  <!-- Mobile Overlay Backdrop -->
  <div id="mobile-overlay" onclick="closeMobileMenu()" class="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-30 hidden lg:hidden transition-opacity"></div>

  <!-- ========================================================
       SECTION 1: PUBLIC SAAS LANDING PAGE (Visible when not in dashboard)
       ======================================================== -->
  <div id="landing-page-view" class="flex flex-col min-h-screen">
    
    <!-- Landing Navigation Bar -->
    <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
            <i data-lucide="message-square" class="w-4 h-4"></i>
          </div>
          <span class="font-bold text-base text-slate-900 tracking-tight">Unique-Notify</span>
          <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200">SaaS</span>
        </div>

        <nav class="hidden md:flex items-center gap-7 text-xs font-medium text-slate-600">
          <a href="#features" class="hover:text-slate-900 transition-colors">Features</a>
          <a href="#gateways" class="hover:text-slate-900 transition-colors">Dual Gateways</a>
          <a href="#pricing" class="hover:text-slate-900 transition-colors">Pricing Plans</a>
          <a href="docs/" class="text-emerald-700 font-semibold hover:text-emerald-800 transition-colors flex items-center gap-1">
            <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
            <span>API Docs</span>
          </a>
          <a href="#roadmap" class="hover:text-slate-900 transition-colors flex items-center gap-1">
            <span>Roadmap</span>
            <span class="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-500">SMS & Email</span>
          </a>
        </nav>

        <div class="flex items-center gap-2.5">
          <a href="admin/" title="Admin Access" class="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
            <i data-lucide="shield" class="w-4 h-4"></i>
          </a>
          <button onclick="openAuthModal('login')" class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors">
            Sign In
          </button>
          <button onclick="openAuthModal('register')" class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition-colors">
            Get Started Free
          </button>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>Dual-Gateway WhatsApp Infrastructure for Businesses</span>
      </div>

      <h1 class="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-tight">
        Reliable WhatsApp OTP, Notifications & Marketing at Scale
      </h1>

      <p class="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
        Power your application with high-speed OTP delivery, automated WHMCS alerts, and promotional broadcasts. Zero-ban risk official Meta Cloud API with smart multi-device QR scanner fallback.
      </p>

      <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button onclick="openAuthModal('register')" class="w-full sm:w-auto px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2">
          <span>Start Free Trial (200 Free Credits)</span>
          <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </button>
        <a href="#pricing" class="w-full sm:w-auto px-6 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all">
          View Subscription Plans
        </a>
      </div>

      <!-- Live Highlights Strip -->
      <div class="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
        <div class="saas-card p-4">
          <div class="text-lg font-bold text-slate-900">&lt; 2.5s</div>
          <div class="text-xs text-slate-500 mt-0.5">Average OTP Latency</div>
        </div>
        <div class="saas-card p-4">
          <div class="text-lg font-bold text-slate-900">0% Ban Risk</div>
          <div class="text-xs text-slate-500 mt-0.5">Official Meta Cloud API</div>
        </div>
        <div class="saas-card p-4">
          <div class="text-lg font-bold text-slate-900">99.9% Uptime</div>
          <div class="text-xs text-slate-500 mt-0.5">Multi-Gateway Failover</div>
        </div>
        <div class="saas-card p-4">
          <div class="text-lg font-bold text-slate-900">1-Click Hook</div>
          <div class="text-xs text-slate-500 mt-0.5">WHMCS & PHP Ready</div>
        </div>
      </div>
    </section>

    <!-- Dual Gateway Showcase Section -->
    <section id="gateways" class="py-16 bg-white border-y border-slate-200/80 px-4 sm:px-6 lg:px-8">
      <div class="max-w-6xl mx-auto space-y-12">
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Flexible Dual-Gateway Routing</h2>
          <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Choose the best sending channel for each message, or let our smart router dispatch automatically.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Gateway 1: Meta Official -->
          <div class="saas-card p-6 border-t-4 border-blue-600 space-y-4">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <i data-lucide="cloud" class="w-5 h-5"></i>
              </div>
              <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Official Partner Tier</span>
            </div>
            <div>
              <h3 class="font-bold text-base text-slate-900">Meta WhatsApp Cloud API</h3>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                Connect your Meta Developer app with Phone Number ID and Access Token. Ideal for zero-ban transactional OTP verification codes, password resets, and approved authentication templates.
              </p>
            </div>
            <ul class="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i> Guaranteed delivery without phone socket drops</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i> Webhook delivery & read receipts</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i> Interactive OTP Copy-Code buttons</li>
            </ul>
          </div>

          <!-- Gateway 2: QR Device -->
          <div class="saas-card p-6 border-t-4 border-emerald-600 space-y-4">
            <div class="flex items-center justify-between">
              <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <i data-lucide="qr-code" class="w-5 h-5"></i>
              </div>
              <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Baileys Engine</span>
            </div>
            <div>
              <h3 class="font-bold text-base text-slate-900">Multi-Device QR Scanner</h3>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                Scan QR directly with any physical WhatsApp phone. Built-in Anti-Ban heuristics ensure your account stays secure while running promotional broadcast marketing.
              </p>
            </div>
            <ul class="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i> Dynamic Spintax generator {Hi|Hello}</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i> Human typing simulation (1.5s - 4s presence)</li>
              <li class="flex items-center gap-2"><i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i> 5s - 15s randomized jitter delay between sends</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
      <div class="text-center max-w-2xl mx-auto space-y-2">
        <h2 class="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Transparent Pricing Plans</h2>
        <p class="text-xs sm:text-sm text-slate-500">
          Scale effortlessly from individual developers to high-volume enterprises. Easy local payment via bKash, Nagad, or Card.
        </p>
      </div>

      <div id="landing-plans-container" class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Rendered dynamically -->
      </div>
    </section>

    <!-- Future Roadmap Banner (SMS & Email) -->
    <section id="roadmap" class="py-12 bg-white border-y border-slate-200/80 px-4 sm:px-6 lg:px-8">
      <div class="max-w-5xl mx-auto saas-card p-6 sm:p-8 border-dashed flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="space-y-2 text-center md:text-left">
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
            <i data-lucide="layers" class="w-3.5 h-3.5"></i>
            <span>Architecture Roadmap</span>
          </div>
          <h3 class="font-bold text-base text-slate-900">Direct SMS (Sender ID) & Email Gateway Integration</h3>
          <p class="text-xs text-slate-500 max-w-xl leading-relaxed">
            Our multi-channel pipeline is structured to seamlessly plug in Direct SMS (Masking / Non-Masking) and Transactional Email in future updates. Your API calls remain identical without refactoring.
          </p>
        </div>
        <div class="shrink-0">
          <span class="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600">
            Roadmap Ready
          </span>
        </div>
      </div>
    </section>

    <!-- Landing Footer -->
    <footer class="mt-auto py-8 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
            <i data-lucide="message-square" class="w-3 h-3"></i>
          </div>
          <span class="font-semibold text-slate-700">Unique-Notify SaaS</span>
          <span>&copy; 2026 IT Star Lab. All rights reserved.</span>
        </div>
        <div class="flex items-center gap-6">
          <a href="#features" class="hover:text-slate-800">Features</a>
          <a href="#pricing" class="hover:text-slate-800">Pricing</a>
          <a href="#gateways" class="hover:text-slate-800">Gateways</a>
          <button onclick="openAuthModal('login')" class="hover:text-slate-800 font-medium">Dashboard Login</button>
        </div>
      </div>
    </footer>
  </div>

  <!-- ========================================================
       SECTION 2: AUTHENTICATION MODAL (LOGIN & REGISTRATION)
       ======================================================== -->
  <div id="modal-auth" class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white border border-slate-200 rounded-xl w-full max-w-sm overflow-hidden shadow-xl animate-slide-up">
      <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 id="auth-modal-title" class="font-semibold text-sm text-slate-900 flex items-center gap-2">
          <i data-lucide="lock" class="w-4 h-4 text-emerald-600"></i>
          <span>Account Login</span>
        </h3>
        <button onclick="closeAuthModal()" class="text-slate-400 hover:text-slate-600 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <div class="p-5 text-xs">
        <!-- Auth Form Switcher Tabs -->
        <div class="flex border-b border-slate-200 mb-4">
          <button id="auth-tab-login" onclick="setAuthMode('login')" class="flex-1 pb-2 font-medium text-emerald-600 border-b-2 border-emerald-600 text-center">
            Sign In
          </button>
          <button id="auth-tab-register" onclick="setAuthMode('register')" class="flex-1 pb-2 font-medium text-slate-500 hover:text-slate-700 text-center">
            Register Free
          </button>
        </div>

        <!-- Login Form -->
        <form id="form-login" onsubmit="handleAuthLogin(event)" class="space-y-3">
          <div>
            <label class="block font-medium text-slate-700 mb-1">Email Address</label>
            <input type="email" id="login-email" required placeholder="name@company.com" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Password</label>
            <input type="password" id="login-password" required placeholder="••••••••" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <button type="submit" id="btn-login-submit" class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs transition-colors">
            Sign In to Dashboard
          </button>

          <!-- Quick Test Credentials Helper -->
          <div class="pt-2 text-[11px] text-slate-500 border-t border-slate-100 flex items-center justify-between">
            <button type="button" onclick="fillTestAccount('user@demo.com', 'user123')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium">
              Demo Client (Auto Fill)
            </button>
            <a href="admin" class="text-[10px] text-emerald-700 hover:underline flex items-center gap-1 font-medium">
              <i data-lucide="shield" class="w-3 h-3"></i> Admin Portal
            </a>
          </div>
        </form>

        <!-- Register Form -->
        <form id="form-register" onsubmit="handleAuthRegister(event)" class="space-y-3 hidden">
          <div>
            <label class="block font-medium text-slate-700 mb-1">Full Name</label>
            <input type="text" id="reg-name" required placeholder="Rahim Ahmed" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Email Address</label>
            <input type="email" id="reg-email" required placeholder="rahim@example.com" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Password</label>
            <input type="password" id="reg-password" required placeholder="At least 6 characters" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Company / Organization (Optional)</label>
            <input type="text" id="reg-company" placeholder="HostStar Ltd" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <button type="submit" id="btn-register-submit" class="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs transition-colors">
            Create Account & Get 200 Credits
          </button>
        </form>
      </div>
    </div>
  </div>

  <!-- ========================================================
       SECTION 3: PAYMENT / CHECKOUT MODAL (bKash, Nagad, Card)
       ======================================================== -->
  <div id="modal-checkout" class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl animate-slide-up">
      <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-sm text-slate-900">Subscribe & Upgrade Plan</h3>
          <p id="checkout-plan-name" class="text-xs text-emerald-700 font-medium">Professional Plan - ৳990 / mo</p>
        </div>
        <button onclick="closeCheckoutModal()" class="text-slate-400 hover:text-slate-600 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <form id="checkout-form" onsubmit="handleCheckoutSubmit(event)" class="p-5 space-y-3.5 text-xs">
        <input type="hidden" id="checkout-plan-id" value="2">

        <!-- Payment Method Selector -->
        <div>
          <label class="block font-medium text-slate-700 mb-1">Select Payment Gateway</label>
          <div class="grid grid-cols-2 gap-2">
            <label class="flex items-center gap-2 border border-slate-200 p-2.5 rounded-lg cursor-pointer hover:bg-slate-50">
              <input type="radio" name="checkout_method" value="bkash" checked onchange="updatePaymentInstructions('bkash')" class="text-emerald-600">
              <span class="font-medium text-slate-800">bKash Personal/Merchant</span>
            </label>
            <label class="flex items-center gap-2 border border-slate-200 p-2.5 rounded-lg cursor-pointer hover:bg-slate-50">
              <input type="radio" name="checkout_method" value="nagad" onchange="updatePaymentInstructions('nagad')" class="text-emerald-600">
              <span class="font-medium text-slate-800">Nagad Payment</span>
            </label>
            <label class="flex items-center gap-2 border border-slate-200 p-2.5 rounded-lg cursor-pointer hover:bg-slate-50">
              <input type="radio" name="checkout_method" value="card" onchange="updatePaymentInstructions('card')" class="text-emerald-600">
              <span class="font-medium text-slate-800">Card / Instant Mock</span>
            </label>
            <label class="flex items-center gap-2 border border-slate-200 p-2.5 rounded-lg cursor-pointer hover:bg-slate-50">
              <input type="radio" name="checkout_method" value="bank" onchange="updatePaymentInstructions('bank')" class="text-emerald-600">
              <span class="font-medium text-slate-800">Bank Transfer</span>
            </label>
          </div>
        </div>

        <!-- Payment Instruction Box -->
        <div id="payment-instructions-box" class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed">
          Send payment to bKash Number: <strong class="font-mono text-slate-900">01700000000</strong>. Enter your Transaction ID (TrxID) below.
        </div>

        <div id="checkout-manual-fields" class="space-y-3">
          <div>
            <label class="block font-medium text-slate-700 mb-1">Sender Mobile Number</label>
            <input type="text" id="checkout-sender-phone" placeholder="017xxxxxxxx" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
          </div>
          <div>
            <label class="block font-medium text-slate-700 mb-1">Transaction ID (TrxID)</label>
            <input type="text" id="checkout-trx-id" placeholder="e.g. 9B8C7A6D5E" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono uppercase focus:border-emerald-600 focus:outline-none">
          </div>
        </div>

        <div class="pt-2 flex justify-end gap-2 border-t border-slate-100">
          <button type="button" onclick="closeCheckoutModal()" class="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
          <button type="submit" id="btn-checkout-submit" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs">Submit Payment</button>
        </div>
      </form>
    </div>
  </div>

  <!-- ========================================================
       SECTION 4: AUTHENTICATED SAAS DASHBOARD (Hidden until login)
       ======================================================== -->
  <div id="app-dashboard-view" class="hidden flex h-screen overflow-hidden">
    
    <!-- Sidebar Navigation -->
    <aside id="app-sidebar" class="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 transform -translate-x-full transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto">
      <div class="flex flex-col h-full">
        <!-- Brand Header -->
        <div class="h-16 flex items-center justify-between px-5 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <i data-lucide="message-square" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                Unique-Notify
                <span id="user-role-badge" class="text-[9px] font-semibold px-1.5 py-0.2 rounded-sm bg-slate-100 text-slate-600 border border-slate-200">USER</span>
              </div>
              <div id="user-plan-label" class="text-[11px] text-emerald-700 font-medium">Professional Plan</div>
            </div>
          </div>
          <button onclick="closeMobileMenu()" class="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-md">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-1 overflow-y-auto p-3 space-y-1 text-xs font-medium">
          <!-- Overview -->
          <button onclick="switchTab('overview')" id="nav-overview" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="layout-dashboard" class="w-4 h-4 text-slate-500"></i>
            <span>Overview</span>
          </button>

          <!-- Group 1: SMS Automation (SIM & Cloud Gateway) -->
          <div class="pt-3 pb-1 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>SMS Automation</span>
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>

          <button onclick="switchTab('sms-send')" id="nav-sms-send" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="send" class="w-4 h-4 text-emerald-600"></i>
            <span>Quick Send SMS</span>
          </button>

          <button onclick="switchTab('sms-campaign')" id="nav-sms-campaign" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="megaphone" class="w-4 h-4 text-emerald-600"></i>
            <span>Bulk SMS Campaign</span>
          </button>

          <button onclick="switchTab('contacts')" id="nav-contacts" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="book-user" class="w-4 h-4 text-emerald-600"></i>
            <span>Phone Book &amp; Contacts</span>
          </button>

          <button onclick="switchTab('sms-wallet')" id="nav-sms-wallet" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="wallet" class="w-4 h-4 text-emerald-600"></i>
            <span>SMS Wallet &amp; Top-up</span>
          </button>

          <button onclick="switchTab('sms-logs')" id="nav-sms-logs" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="list-filter" class="w-4 h-4 text-emerald-600"></i>
            <span>SMS Queue &amp; Logs</span>
          </button>

          <!-- Group 2: WhatsApp Channels -->
          <div class="pt-3 pb-1 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>WhatsApp Channels</span>
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          </div>

          <button onclick="switchTab('devices')" id="nav-devices" class="nav-btn w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <div class="flex items-center gap-2.5">
              <i data-lucide="qr-code" class="w-4 h-4 text-blue-600"></i>
              <span>WhatsApp Gateways</span>
            </div>
            <span id="sidebar-device-badge" class="w-2 h-2 rounded-full bg-amber-400"></span>
          </button>

          <button onclick="switchTab('otp')" id="nav-otp" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="shield-check" class="w-4 h-4 text-blue-600"></i>
            <span>OTP Verification Center</span>
          </button>

          <button onclick="switchTab('messenger')" id="nav-messenger" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="message-square" class="w-4 h-4 text-blue-600"></i>
            <span>Direct Messenger</span>
          </button>

          <button onclick="switchTab('broadcasts')" id="nav-broadcasts" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="radio" class="w-4 h-4 text-blue-600"></i>
            <span>WhatsApp Campaigns</span>
          </button>

          <button onclick="switchTab('logs')" id="nav-logs" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="history" class="w-4 h-4 text-slate-500"></i>
            <span>WhatsApp Logs</span>
          </button>

          <!-- Group 3: Integrations & API -->
          <div class="pt-3 pb-1 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Integrations &amp; Billing</div>

          <button onclick="switchTab('api-keys')" id="nav-api-keys" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="key" class="w-4 h-4 text-slate-500"></i>
            <span>API Keys</span>
          </button>

          <button onclick="switchTab('api-docs')" id="nav-api-docs" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="code" class="w-4 h-4 text-slate-500"></i>
            <span>Docs &amp; WHMCS Hook</span>
          </button>

          <button onclick="switchTab('billing')" id="nav-billing" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="credit-card" class="w-4 h-4 text-slate-500"></i>
            <span>Plans &amp; Subscription</span>
          </button>

          <button onclick="switchTab('settings')" id="nav-settings" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
            <i data-lucide="sliders" class="w-4 h-4 text-slate-500"></i>
            <span>Anti-Ban Settings</span>
          </button>

          <!-- Admin Exclusive Section -->
          <div id="admin-nav-section" class="hidden pt-3 border-t border-slate-100">
            <div class="px-3 pb-1 text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Super Admin</div>
            <button onclick="switchTab('admin-users')" id="nav-admin-users" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
              <i data-lucide="users" class="w-4 h-4 text-blue-600"></i>
              <span>All Clients</span>
            </button>
            <button onclick="switchTab('admin-payments')" id="nav-admin-payments" class="nav-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-left">
              <i data-lucide="check-square" class="w-4 h-4 text-blue-600"></i>
              <span>Approve Payments</span>
            </button>
          </div>
        </nav>

        <!-- Sidebar Footer -->
        <div class="p-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="font-medium text-slate-700" id="user-display-name">User Account</span>
          </div>
          <button onclick="handleLogout()" class="text-slate-400 hover:text-slate-700" title="Sign Out">
            <i data-lucide="log-out" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col h-screen overflow-hidden">
      
      <!-- Top Application Header -->
      <header class="h-16 border-b border-slate-200/80 bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <button onclick="toggleMobileMenu()" class="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Toggle Navigation">
            <i data-lucide="menu" class="w-5 h-5"></i>
          </button>

          <h1 id="page-title" class="text-base font-semibold text-slate-900 tracking-tight">System Overview</h1>
          
          <div class="hidden sm:flex items-center gap-2 pl-3">
            <div id="pill-meta-status" class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700">
              <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              <span>Meta API</span>
            </div>
            <div id="pill-qr-status" class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700">
              <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              <span>QR Device</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Credits Remaining Pill -->
          <div class="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <i data-lucide="zap" class="w-3.5 h-3.5 text-emerald-600"></i>
            <span id="header-credits-count">0</span>
            <span class="text-slate-500">Credits</span>
          </div>

          <button onclick="showLandingView()" class="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium">
            <i data-lucide="globe" class="w-3.5 h-3.5"></i>
            <span>View Landing</span>
          </button>

          <button onclick="refreshCurrentTab()" class="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900" title="Refresh">
            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
          </button>
          
          <button onclick="openQuickSendModal()" class="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs">
            <i data-lucide="send" class="w-3.5 h-3.5"></i>
            <span>Quick Send</span>
          </button>
        </div>
      </header>

      <!-- Scrollable Main Content -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6" id="tab-content">
        <!-- Rendered by app.js -->
      </main>
    </div>
  </div>

  <!-- Quick Send Modal -->
  <div id="modal-quick-send" class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-xl animate-slide-up">
      <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 class="font-semibold text-sm text-slate-900 flex items-center gap-2">
          <i data-lucide="send" class="w-4 h-4 text-emerald-600"></i>
          <span>Send Message</span>
        </h3>
        <button onclick="closeQuickSendModal()" class="text-slate-400 hover:text-slate-600 p-1">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <form id="quick-send-form" onsubmit="handleQuickSend(event)" class="p-5 space-y-3.5 text-xs">
        <div>
          <label class="block font-medium text-slate-700 mb-1">Recipient Phone Number</label>
          <input type="text" id="quick-phone" required placeholder="017xxxxxxxx or 88017xxxxxxxx" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
        </div>

        <div>
          <label class="block font-medium text-slate-700 mb-1">Gateway</label>
          <select id="quick-gateway" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
            <optgroup label="WhatsApp Gateways">
              <option value="auto">Auto WhatsApp (Best Available)</option>
              <option value="meta">Meta Cloud API (Official WhatsApp)</option>
              <option value="qr">QR Device (Baileys WhatsApp)</option>
            </optgroup>
            <optgroup label="SMS Gateways">
              <option value="sms_cloud">Platform Cloud SMS Gateway (৳0.35 / SMS)</option>
              <option value="sms_android_sim1">My Android Phone (SIM 1 - Free)</option>
              <option value="sms_android_sim2">My Android Phone (SIM 2 - Free)</option>
            </optgroup>
          </select>
        </div>

        <div>
          <label class="block font-medium text-slate-700 mb-1">Message Type</label>
          <div class="grid grid-cols-2 gap-2">
            <label class="flex items-center gap-2 border border-slate-200 p-2.5 rounded-lg cursor-pointer hover:bg-slate-50">
              <input type="radio" name="quick_type" value="text" checked onchange="toggleQuickType('text')" class="text-emerald-600">
              <span class="font-medium text-slate-800">Standard Text</span>
            </label>
            <label class="flex items-center gap-2 border border-slate-200 p-2.5 rounded-lg cursor-pointer hover:bg-slate-50">
              <input type="radio" name="quick_type" value="otp" onchange="toggleQuickType('otp')" class="text-emerald-600">
              <span class="font-medium text-slate-800">OTP Code</span>
            </label>
          </div>
        </div>

        <div id="quick-text-group">
          <label class="block font-medium text-slate-700 mb-1">Message Content</label>
          <textarea id="quick-message" rows="3" placeholder="Type message or use {Hi|Hello} Spintax..." class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none"></textarea>
        </div>

        <div id="quick-otp-group" class="hidden">
          <label class="block font-medium text-slate-700 mb-1">Service / Brand Name</label>
          <input type="text" id="quick-service" value="Unique-Notify" class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-emerald-600 focus:outline-none">
        </div>

        <div class="pt-2 flex justify-end gap-2 border-t border-slate-100">
          <button type="button" onclick="closeQuickSendModal()" class="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
          <button type="submit" id="btn-quick-send-submit" class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs">Dispatch</button>
        </div>
      </form>
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
            <input type="number" id="sms-modal-recharge-amount" min="50" step="10" value="100" required class="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2.5 text-slate-900 font-bold text-base focus:border-emerald-600 focus:outline-none">
          </div>
          <p class="text-[11px] text-slate-400 mt-1">Minimum recharge amount is ৳50. Pay-As-You-Go per SMS rate: ৳0.35.</p>
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
          Send Money / Payment to bKash Number: <strong class="font-mono text-slate-900 font-bold" id="sms-modal-pay-number">01700000000</strong>
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
          Send exact package amount to bKash: <strong class="font-mono text-slate-900 font-bold" id="modal-buy-pkg-number">01700000000</strong>
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

  <!-- Scripts -->
  <script src="js/app.js"></script>
</body>
</html>
