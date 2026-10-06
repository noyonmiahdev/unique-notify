<?php
/**
 * Developer Documentation Portal - PHP Native Wrapper
 * Unique-Notify WhatsApp & Cellular SMS Multi-Gateway SaaS Platform
 */
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
<html lang="en" class="h-full bg-slate-50">
<head>
  <meta charset="UTF-8">
  <base href="<?= htmlspecialchars($projectBase, ENT_QUOTES, 'UTF-8') ?>">
  <script>window.APP_ROOT = "<?= htmlspecialchars($projectBase, ENT_QUOTES, 'UTF-8') ?>";</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation - Unique-Notify Developer Portal</title>
  <!-- Local Static Tailwind CSS (Offline Ready) -->
  <link rel="stylesheet" href="css/tailwind.min.css">
  <!-- Tailwind CSS CDN Fallback -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <!-- Google Fonts: Inter & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
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
  <style>
    pre code {
      font-family: 'JetBrains Mono', monospace;
    }
    .active-nav-link {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 600;
      border-left: 3px solid #059669;
    }
    html {
      scroll-behavior: smooth;
    }
  </style>
</head>
<body class="h-full flex flex-col font-sans text-slate-800 antialiased selection:bg-brand-100 selection:text-brand-700">

  <!-- Top Sticky Navigation -->
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <a href="./" class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm font-bold">
            UN
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-lg font-bold text-slate-900 tracking-tight">Unique-Notify</span>
              <span class="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">API Docs v1.2</span>
            </div>
            <p class="text-xs text-slate-500">Universal WhatsApp &amp; SMS Multi-Gateway SaaS API</p>
          </div>
        </a>
      </div>

      <div class="flex items-center space-x-4">
        <a href="./" class="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1.5">
          <i data-lucide="home" class="w-4 h-4"></i>
          <span>Main Site</span>
        </a>
        <a href="admin/" class="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1.5">
          <i data-lucide="shield" class="w-4 h-4"></i>
          <span>Admin Portal</span>
        </a>
        <a href="./" class="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm transition">
          <i data-lucide="key" class="w-4 h-4"></i>
          <span>Get API Key</span>
        </a>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
    
    <!-- Sidebar Navigation -->
    <aside class="lg:col-span-3">
      <div class="sticky top-24 space-y-6">
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">Getting Started</p>
          <nav class="space-y-1">
            <a href="#overview" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition active-nav-link">
              <i data-lucide="info" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              Platform Overview
            </a>
            <a href="#authentication" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="shield-check" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              Security &amp; Auth
            </a>
            <a href="#quickstart" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="zap" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              Quick Start
            </a>
          </nav>

          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mt-6 mb-3 px-3">SaaS Core APIs</p>
          <nav class="space-y-1">
            <a href="#sms-api" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="smartphone" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              SMS Dispatch (Auto Route)
            </a>
            <a href="#messages-api" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="message-square" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              WhatsApp Messaging
            </a>
            <a href="#otp-api" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="lock" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              OTP Dispatch &amp; Verify
            </a>
            <a href="#broadcast-api" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="radio" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              Bulk Campaigns
            </a>
          </nav>

          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mt-6 mb-3 px-3">Integrations &amp; Safety</p>
          <nav class="space-y-1">
            <a href="#antiban" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="shield-alert" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              Anti-Ban &amp; Spintax
            </a>
            <a href="#whmcs" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="layers" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              WHMCS Integration
            </a>
            <a href="#php-sdk" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="code" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              PHP / Node / Python SDK
            </a>
            <a href="#sandbox" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="terminal" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              Interactive Sandbox
            </a>
          </nav>
        </div>

        <div class="bg-gradient-to-br from-brand-50 to-emerald-100/60 rounded-xl border border-brand-200 p-4">
          <div class="flex items-center space-x-2 text-brand-700 font-semibold text-sm mb-1">
            <i data-lucide="help-circle" class="w-4 h-4"></i>
            <span>Need Custom Setup?</span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed mb-3">
            Integrate Unique-Notify into your billing systems, CRMs, e-commerce, or mobile apps.
          </p>
          <a href="/login" class="inline-flex items-center text-xs font-semibold text-brand-700 hover:text-brand-800">
            <span>Contact Support</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5 ml-1"></i>
          </a>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="lg:col-span-9 space-y-12">

      <!-- Section: Platform Overview -->
      <section id="overview" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="cpu" class="w-4 h-4"></i>
          <span>Architecture &amp; Capabilities</span>
        </div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight mb-4">Unique-Notify API Reference</h1>
        <p class="text-slate-600 leading-relaxed mb-6">
          Unique-Notify is a complete SaaS notification platform. Clients simply recharge their SMS wallet or purchase message packages and send notifications with a single API request. All underlying telecom routes, cellular modem hardware, SIM allocations, and carrier gateways are centrally configured and optimized by the platform administration.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div class="flex items-center space-x-2.5 mb-2 font-semibold text-slate-900">
              <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                SMS
              </div>
              <span>Automated SMS Dispatch</span>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Transparent Pay-as-you-go billing (৳0.35/SMS). Auto-routed through optimal carrier channels without requiring sender IDs.
            </p>
          </div>

          <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div class="flex items-center space-x-2.5 mb-2 font-semibold text-slate-900">
              <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                WA
              </div>
              <span>Personal WhatsApp (QR)</span>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Auto-routes to your connected WhatsApp session with human typing simulation, Spintax variation, and polite queue throttling.
            </p>
          </div>

          <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div class="flex items-center space-x-2.5 mb-2 font-semibold text-slate-900">
              <div class="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                API
              </div>
              <span>Meta WhatsApp Cloud API</span>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Zero ban risk via Meta Graph API v21.0 for official verified business notifications and high-throughput OTP templates.
            </p>
          </div>
        </div>
      </section>

      <!-- Section: Authentication & Security -->
      <section id="authentication" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="shield-check" class="w-4 h-4"></i>
          <span>Security &amp; Authorization</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">Authentication &amp; API Security</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">
          All API endpoints under <code class="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800">/api/v1/</code> are secured using flexible authentication. Pass your API key via the HTTP header <code class="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800">x-api-key</code> or standard <code class="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800">Authorization: Bearer</code> header.
        </p>

        <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto text-xs text-slate-200 font-mono mb-4">
          <p class="text-slate-400 mb-2">// Supported Authorization Headers</p>
          <p><span class="text-brand-500">x-api-key</span>: un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c</p>
          <p><span class="text-brand-500">Authorization</span>: Bearer un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
            <p class="font-bold text-slate-900 mb-1">Rate Limiting &amp; Flood Protection</p>
            <p class="text-slate-600">Standard rate limit is 120 requests/min per API key. Rate limit headers are returned with every response:</p>
            <p class="font-mono text-slate-500 mt-1">X-RateLimit-Limit: 120<br>X-RateLimit-Remaining: 119</p>
          </div>

          <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
            <p class="font-bold text-slate-900 mb-1">IP Whitelisting</p>
            <p class="text-slate-600">You can restrict each API key to specific server IP addresses from the Client Dashboard &gt; API Keys tab.</p>
          </div>
        </div>
      </section>

      <!-- Section: Quick Start -->
      <section id="quickstart" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="zap" class="w-4 h-4"></i>
          <span>Fast Integration</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">Quick Start (cURL)</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">
          Send SMS or WhatsApp notifications with clean, straightforward payload requirements:
        </p>

        <div class="space-y-4">
          <div>
            <p class="text-xs font-semibold text-slate-700 mb-1">1. Send Cellular SMS (Automatic Centralized Routing):</p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto text-xs text-slate-200 font-mono">
              <pre><code>curl -X POST "https://uniquenotify.itstarlab.com/api/v1/sms/send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: un_live_YOUR_KEY" \
  -d '{
    "phone": "01700000000",
    "message": "Your verification code is 849201."
  }'</code></pre>
            </div>
          </div>

          <div>
            <p class="text-xs font-semibold text-slate-700 mb-1">2. Send WhatsApp Message (Auto-Routes to Connected Session):</p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto text-xs text-slate-200 font-mono">
              <pre><code>curl -X POST "https://uniquenotify.itstarlab.com/api/v1/messages/send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: un_live_YOUR_KEY" \
  -d '{
    "phone": "8801700000000",
    "message": "Hello! Your invoice #1042 has been paid."
  }'</code></pre>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: SMS Gateway API -->
      <section id="sms-api" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="smartphone" class="w-4 h-4"></i>
          <span>Cellular SMS Service</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">SMS Dispatch API</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">
          Dispatches standard SMS messages to any recipient number. The platform automatically handles delivery through the default carrier route or assigned dedicated node configured in your account.
        </p>

        <!-- Send SMS -->
        <div class="border border-slate-200 rounded-xl p-5 bg-slate-50/30 mb-6">
          <div class="flex items-center space-x-2.5 mb-3">
            <span class="px-2.5 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-800 font-mono">POST</span>
            <span class="text-sm font-mono font-semibold text-slate-900">/api/v1/sms/send</span>
          </div>
          <p class="text-xs text-slate-600 mb-3">Dispatches an SMS to a single recipient phone number.</p>

          <div class="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-200 mb-3">
            <pre><code>{
  "phone": "01700688647",
  "message": "Welcome to Unique-Notify! Your account is active."
}</code></pre>
          </div>

          <div class="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-200">
            <pre><code>// Response (200 OK)
{
  "success": true,
  "message": "SMS queued for delivery",
  "jobId": 12,
  "recipient": "01700688647",
  "sms_parts": 1,
  "cost": 0.35,
  "remainingBalance": 149.65
}</code></pre>
          </div>
        </div>

        <!-- SaaS Model Info -->
        <div class="border border-emerald-200 bg-emerald-50/30 rounded-xl p-5 mb-6">
          <h3 class="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
            <i data-lucide="check-circle" class="w-4 h-4 text-emerald-700"></i>
            <span>SaaS Pricing &amp; Transparent Delivery:</span>
          </h3>
          <ul class="text-xs text-slate-700 space-y-2 list-disc list-inside leading-relaxed">
            <li><strong>Pay-as-you-go Rate:</strong> Standard rate is ৳0.35 per SMS part (160 characters English, 70 characters Unicode/Bangla).</li>
            <li><strong>Automated Deductions:</strong> SMS charges are automatically debited from your preloaded SMS balance or package credits.</li>
            <li><strong>Automatic Failure Refund:</strong> If an SMS fails to dispatch or deliver, the exact cost is instantly credited back to your wallet.</li>
          </ul>
        </div>
      </section>

      <!-- Section: Messages API -->
      <section id="messages-api" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="message-square" class="w-4 h-4"></i>
          <span>WhatsApp Messaging</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">WhatsApp Message Dispatch API</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">
          Send text notifications, receipts, invoices, and documents via your connected personal WhatsApp number.
        </p>

        <!-- Send Unified Message -->
        <div class="border border-slate-200 rounded-xl p-5 bg-slate-50/30 mb-6">
          <div class="flex items-center space-x-2.5 mb-3">
            <span class="px-2.5 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-800 font-mono">POST</span>
            <span class="text-sm font-mono font-semibold text-slate-900">/api/v1/messages/send</span>
          </div>
          <p class="text-xs text-slate-600 mb-3">Sends a text or media message through your active WhatsApp session with auto human-like typing simulation.</p>

          <div class="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-200 mb-3">
            <pre><code>{
  "phone": "8801700000000",
  "message": "{Hello|Hi|Dear} customer, your hosting account is active.",
  "media_url": "https://example.com/invoice.pdf", // Optional
  "caption": "Your payment receipt",               // Optional
  "media_type": "document"                        // 'image', 'document', 'audio', 'video'
}</code></pre>
          </div>

          <div class="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-200">
            <pre><code>// Response (200 OK)
{
  "success": true,
  "message": "WhatsApp message sent successfully",
  "gateway_used": "qr",
  "data": {
    "status": "SENT",
    "recipient": "8801700000000"
  }
}</code></pre>
          </div>
        </div>
      </section>

      <!-- Section: OTP API -->
      <section id="otp-api" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="lock" class="w-4 h-4"></i>
          <span>Verification Engine</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">One-Time Password (OTP) API</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">
          Automated OTP generator with lifecycle tracking, custom expiration windows, and instant verification endpoints.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Dispatch OTP -->
          <div class="border border-slate-200 rounded-xl p-5 bg-slate-50/30">
            <div class="flex items-center space-x-2.5 mb-2">
              <span class="px-2.5 py-0.5 text-xs font-bold rounded bg-emerald-100 text-emerald-800 font-mono">POST</span>
              <span class="text-xs font-mono font-semibold text-slate-900">/api/v1/otp/send</span>
            </div>
            <p class="text-xs text-slate-600 mb-3">Generates and sends an OTP code.</p>
            <div class="bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-200">
              <pre><code>{
  "phone": "8801700000000",
  "serviceName": "Login Verification",
  "otpLength": 6,
  "expiryMinutes": 5
}</code></pre>
            </div>
          </div>

          <!-- Verify OTP -->
          <div class="border border-slate-200 rounded-xl p-5 bg-slate-50/30">
            <div class="flex items-center space-x-2.5 mb-2">
              <span class="px-2.5 py-0.5 text-xs font-bold rounded bg-blue-100 text-blue-800 font-mono">POST</span>
              <span class="text-xs font-mono font-semibold text-slate-900">/api/v1/otp/verify</span>
            </div>
            <p class="text-xs text-slate-600 mb-3">Validates the code entered by user.</p>
            <div class="bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-200">
              <pre><code>{
  "phone": "8801700000000",
  "otpCode": "591024"
}</code></pre>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Anti-Ban & Spintax -->
      <section id="antiban" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="shield-alert" class="w-4 h-4"></i>
          <span>Safety &amp; Compliance</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">Anti-Ban Engine &amp; Spintax Randomization</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">
          When sending bulk notifications through WhatsApp, Unique-Notify automatically implements defensive heuristics:
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div class="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <p class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Dynamic Spintax</p>
            <p class="text-xs text-slate-600">Replaces words with variations like <code class="font-mono">{Hi|Hello|Dear}</code> so every dispatch has unique phrasing.</p>
          </div>
          <div class="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <p class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Human Typing Simulation</p>
            <p class="text-xs text-slate-600">Triggers typing presence before message release to replicate real human engagement.</p>
          </div>
          <div class="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <p class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Jitter Delay Engine</p>
            <p class="text-xs text-slate-600">Applies automatic delays between bulk messages to avoid telecom carrier throttling.</p>
          </div>
        </div>
      </section>

      <!-- Section: WHMCS Integration -->
      <section id="whmcs" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="layers" class="w-4 h-4"></i>
          <span>Billing Automation</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">WHMCS Hook Integration Guide</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">
          Unique-Notify includes a ready-to-use WHMCS hook in <code class="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800">integrations/whmcs/hooks/unique_notify.php</code>.
        </p>

        <div class="space-y-4 text-sm text-slate-700">
          <div class="flex items-start space-x-3">
            <div class="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 flex-shrink-0">1</div>
            <div>
              <p class="font-semibold text-slate-900">Copy Hook File</p>
              <p class="text-xs text-slate-500">Copy <code class="font-mono">unique_notify.php</code> to <code class="font-mono">/whmcs/includes/hooks/unique_notify.php</code>.</p>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <div class="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 flex-shrink-0">2</div>
            <div>
              <p class="font-semibold text-slate-900">Set API URL &amp; API Key</p>
              <div class="bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-200 mt-2">
                <pre><code>define('UNIQUE_NOTIFY_API_URL', 'https://uniquenotify.itstarlab.com/api/v1');
define('UNIQUE_NOTIFY_API_KEY', 'un_live_YOUR_API_KEY');</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Multi-Language SDKs -->
      <section id="php-sdk" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="code" class="w-4 h-4"></i>
          <span>Code Snippets</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">SDK &amp; Integration Examples</h2>

        <div class="space-y-4">
          <!-- PHP Native -->
          <div>
            <p class="text-xs font-bold text-slate-700 mb-1">PHP (cURL):</p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto text-xs text-slate-200 font-mono">
              <pre><code>$ch = curl_init('https://uniquenotify.itstarlab.com/api/v1/sms/send');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: un_live_YOUR_API_KEY'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'phone' => '01700000000',
    'message' => 'Your order #1042 has been shipped.'
]));
$response = curl_exec($ch);
curl_close($ch);
echo $response;</code></pre>
            </div>
          </div>

          <!-- Python -->
          <div>
            <p class="text-xs font-bold text-slate-700 mb-1">Python (requests):</p>
            <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto text-xs text-slate-200 font-mono">
              <pre><code>import requests

url = "https://uniquenotify.itstarlab.com/api/v1/sms/send"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "un_live_YOUR_API_KEY"
}
payload = {
    "phone": "01700000000",
    "message": "Hello from Python application!"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())</code></pre>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Interactive Sandbox -->
      <section id="sandbox" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="terminal" class="w-4 h-4"></i>
          <span>Live Testing</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-2">Interactive API Console</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-6">
          Test live SMS and WhatsApp dispatches directly from this browser console.
        </p>

        <div class="space-y-4 max-w-2xl">
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">API Key</label>
            <input type="text" id="sandboxApiKey" value="un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c" class="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Channel</label>
              <select id="sandboxChannel" class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
                <option value="sms">SMS (Auto Delivery)</option>
                <option value="whatsapp">WhatsApp (Auto Delivery)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Recipient Phone</label>
              <input type="text" id="sandboxPhone" placeholder="01700000000 or 8801700000000" class="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Message Content</label>
            <textarea id="sandboxMessage" rows="3" class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">Hello from Unique-Notify Live API Console!</textarea>
          </div>

          <button type="button" id="sandboxSubmitBtn" onclick="runSandboxTest()" class="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition">
            <i data-lucide="play" class="w-3.5 h-3.5"></i>
            <span>Execute API Request</span>
          </button>

          <div id="sandboxResponseArea" class="hidden mt-4 p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto">
            <p class="text-slate-400 mb-1">// API Response:</p>
            <pre id="sandboxOutput"></pre>
          </div>
        </div>
      </section>

    </main>
  </div>

  <!-- Footer -->
  <footer class="bg-white border-t border-slate-200 mt-16 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
      <div class="flex items-center space-x-2">
        <span class="font-bold text-slate-700">Unique-Notify</span>
        <span>&copy; 2026 IT Star Lab. All rights reserved.</span>
      </div>
      <div class="flex items-center space-x-6">
        <a href="./" class="hover:text-slate-800 transition">Landing Page</a>
        <a href="./" class="hover:text-slate-800 transition">Client Portal</a>
        <a href="admin/" class="hover:text-slate-800 transition">Admin Portal</a>
      </div>
    </div>
  </footer>

  <script>
    lucide.createIcons();

    const API_BASE = (window.location.port === '3000' || window.location.port === '3001')
      ? ''
      : (window.location.protocol + '//' + window.location.hostname + ':3000');

    async function runSandboxTest() {
      const apiKey = document.getElementById('sandboxApiKey').value.trim();
      const channel = document.getElementById('sandboxChannel').value;
      const phone = document.getElementById('sandboxPhone').value.trim();
      const message = document.getElementById('sandboxMessage').value.trim();
      const resArea = document.getElementById('sandboxResponseArea');
      const output = document.getElementById('sandboxOutput');
      const btn = document.getElementById('sandboxSubmitBtn');

      if (!phone) {
        alert('Please enter a recipient phone number (e.g., 01700000000 or 8801700000000)');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="inline-block animate-spin mr-2">&#9696;</span> Sending Request...';

      try {
        const endpoint = API_BASE + (channel === 'sms' ? '/api/v1/sms/send' : '/api/v1/messages/send');
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify({ phone, message })
        });

        const data = await response.json();
        resArea.classList.remove('hidden');
        output.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        resArea.classList.remove('hidden');
        output.textContent = JSON.stringify({ success: false, error: err.message }, null, 2);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="play" class="w-3.5 h-3.5 mr-2"></i><span>Execute API Request</span>';
        lucide.createIcons();
      }
    }
  </script>
</body>
</html>
