<?php
/**
 * Developer Documentation Portal - PHP Native Wrapper
 * Unique-Notify WhatsApp Multi-Gateway SaaS Platform
 */
?>
<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-50">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation - Unique-Notify Developer Portal</title>
  <!-- Local Static Tailwind CSS (Offline Ready) -->
  <link rel="stylesheet" href="/css/tailwind.min.css">
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <!-- Google Fonts: Inter -->
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
  </style>
</head>
<body class="h-full flex flex-col font-sans text-slate-800 antialiased selection:bg-brand-100 selection:text-brand-700">

  <!-- Top Sticky Navigation -->
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <a href="/" class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm">
            <i data-lucide="send" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-lg font-bold text-slate-900 tracking-tight">Unique-Notify</span>
              <span class="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full border border-slate-200">Docs v1.0</span>
            </div>
            <p class="text-xs text-slate-500">Developer Documentation & API Reference</p>
          </div>
        </a>
      </div>

      <div class="flex items-center space-x-4">
        <a href="/" class="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1.5">
          <i data-lucide="home" class="w-4 h-4"></i>
          <span>Main Site</span>
        </a>
        <a href="/login" class="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1.5">
          <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
          <span>Client Portal</span>
        </a>
        <a href="/register" class="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium shadow-sm transition">
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
              Authentication
            </a>
            <a href="#quickstart" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="zap" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              Quick Start
            </a>
          </nav>

          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mt-6 mb-3 px-3">API Endpoints</p>
          <nav class="space-y-1">
            <a href="#otp-api" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="lock" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              OTP Dispatch & Verify
            </a>
            <a href="#messages-api" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="message-square" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              Send Text & Media
            </a>
            <a href="#templates-api" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="file-code" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              Meta Cloud Templates
            </a>
            <a href="#broadcast-api" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="radio" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              Broadcast Campaigns
            </a>
            <a href="#sms-api" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="smartphone" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              SMS Gateway (Dual-SIM &amp; 3rd-Party)
            </a>
          </nav>

          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mt-6 mb-3 px-3">Integrations</p>
          <nav class="space-y-1">
            <a href="#whmcs" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="layers" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              WHMCS Integration
            </a>
            <a href="#php-sdk" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="code" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              Standalone PHP SDK
            </a>
            <a href="#antiban" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="shield-alert" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              Anti-Ban & Spintax
            </a>
            <a href="#sandbox" class="flex items-center px-3 py-2 text-sm text-slate-600 rounded-lg hover:bg-slate-50 transition">
              <i data-lucide="terminal" class="w-4 h-4 mr-2.5 text-slate-400"></i>
              Interactive Sandbox
            </a>
          </nav>
        </div>

        <div class="bg-gradient-to-br from-brand-50 to-emerald-100/60 rounded-xl border border-brand-200 p-4">
          <div class="flex items-center space-x-2 text-brand-700 font-semibold text-sm mb-1">
            <i data-lucide="phone-call" class="w-4 h-4"></i>
            <span>Need Custom Setup?</span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed mb-3">
            Our engineers can integrate Unique-Notify into your custom billing system, CRM, or ERP.
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
          <span>Architecture & Capabilities</span>
        </div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight mb-4">Unique-Notify Developer Documentation</h1>
        <p class="text-slate-600 leading-relaxed mb-6">
          Unique-Notify is an enterprise-grade multi-gateway communication engine providing automated OTP delivery, transactional notifications, and marketing broadcasts via WhatsApp. The platform offers a unified REST API across both official Meta Cloud API and Baileys Multi-Device QR Socket gateways.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div class="flex items-center space-x-2.5 mb-2 font-semibold text-slate-900">
              <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
              </div>
              <span>Meta WhatsApp Cloud API (Official)</span>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Zero account ban risk. Powered by Meta Graph API v21.0. Ideal for high-volume verified OTPs, template messages, and official business transactions.
            </p>
          </div>

          <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div class="flex items-center space-x-2.5 mb-2 font-semibold text-slate-900">
              <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <i data-lucide="qr-code" class="w-4 h-4"></i>
              </div>
              <span>Baileys Multi-Device QR Gateway</span>
            </div>
            <p class="text-xs text-slate-600 leading-relaxed">
              Multi-Device persistent socket engine. Allows instant connectivity with existing phone numbers without Meta verification fees. Protected by our smart Anti-Ban engine.
            </p>
          </div>
        </div>
      </section>

      <!-- Section: Authentication -->
      <section id="authentication" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="key" class="w-4 h-4"></i>
          <span>Security & Authorization</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">Authentication</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">
          All API requests to Unique-Notify must include an active API Key. You can pass your key via either the <code class="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800">x-api-key</code> HTTP header or the standard <code class="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800">Authorization: Bearer</code> header.
        </p>

        <div class="bg-slate-900 rounded-xl p-4 overflow-x-auto text-xs text-slate-200 font-mono mb-4">
          <p class="text-slate-400 mb-2">// Recommended Header Formats</p>
          <p><span class="text-brand-500">x-api-key</span>: un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c</p>
          <p><span class="text-brand-500">Authorization</span>: Bearer un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c</p>
        </div>

        <div class="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3 text-xs text-amber-800">
          <i data-lucide="shield-alert" class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"></i>
          <div>
            <span class="font-semibold">Security Note:</span> Never commit your API keys to public repositories or client-side code. Store keys in server-side environment variables.
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
          Send your first automated message in seconds with this minimal cURL request:
        </p>

        <div class="bg-slate-900 rounded-xl p-5 overflow-x-auto text-xs text-slate-200 font-mono mb-4">
          <pre><code>curl -X POST "http://localhost:3000/api/v1/messages/send-text" \
  -H "Content-Type: application/json" \
  -H "x-api-key: un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c" \
  -d '{
    "phone": "8801700000000",
    "message": "Hello! Your hosting invoice #10492 has been generated.",
    "gateway": "meta"
  }'</code></pre>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono">
          <p class="text-slate-500 font-semibold mb-2">Response (200 OK):</p>
          <pre class="text-emerald-700"><code>{
  "success": true,
  "message": "Message sent successfully",
  "gateway": "meta",
  "logId": 482,
  "metaMessageId": "wamid.HBgM..."
}</code></pre>
        </div>
      </section>

      <!-- Section: OTP API -->
      <section id="otp-api" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="lock" class="w-4 h-4"></i>
          <span>High-Speed Authentication</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">One-Time Password (OTP) API</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">
          Unique-Notify features an automated OTP generator with lifecycle tracking, custom expiration windows, and instant verification endpoints.
        </p>

        <!-- Dispatch OTP -->
        <div class="border border-slate-200 rounded-xl p-5 mb-6 bg-slate-50/30">
          <div class="flex items-center space-x-2.5 mb-3">
            <span class="px-2.5 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-800 font-mono">POST</span>
            <span class="text-sm font-mono font-semibold text-slate-900">/api/v1/otp/send</span>
          </div>
          <p class="text-xs text-slate-600 mb-3">Generates a secure numeric OTP, sends it via WhatsApp, and stores the state.</p>
          
          <div class="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-200 mb-3">
            <pre><code>{
  "phone": "8801700000000",
  "serviceName": "Star Hosting Login",
  "length": 6,
  "expiryMinutes": 5,
  "gateway": "meta"
}</code></pre>
          </div>
        </div>

        <!-- Verify OTP -->
        <div class="border border-slate-200 rounded-xl p-5 bg-slate-50/30">
          <div class="flex items-center space-x-2.5 mb-3">
            <span class="px-2.5 py-1 text-xs font-bold rounded bg-blue-100 text-blue-800 font-mono">POST</span>
            <span class="text-sm font-mono font-semibold text-slate-900">/api/v1/otp/verify</span>
          </div>
          <p class="text-xs text-slate-600 mb-3">Validates the code entered by the user against database records.</p>
          
          <div class="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-200 mb-3">
            <pre><code>{
  "phone": "8801700000000",
  "otp": "492015"
}</code></pre>
          </div>

          <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-xs text-emerald-700">
            <code>{ "success": true, "message": "OTP verified successfully", "phone": "8801700000000" }</code>
          </div>
        </div>
      </section>

      <!-- Section: Messages API -->
      <section id="messages-api" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="message-square" class="w-4 h-4"></i>
          <span>Direct Messaging</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">Send Text & Media Messages</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">
          Send rich text notifications, invoices, PDF receipts, or promotional images with captions.
        </p>

        <!-- Send Media -->
        <div class="border border-slate-200 rounded-xl p-5 bg-slate-50/30">
          <div class="flex items-center space-x-2.5 mb-3">
            <span class="px-2.5 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-800 font-mono">POST</span>
            <span class="text-sm font-mono font-semibold text-slate-900">/api/v1/messages/send-media</span>
          </div>
          <p class="text-xs text-slate-600 mb-3">Sends an image or PDF document with an optional text caption.</p>

          <div class="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-200">
            <pre><code>{
  "phone": "8801700000000",
  "mediaUrl": "https://example.com/invoices/inv-1042.pdf",
  "caption": "Your monthly web hosting invoice is attached.",
  "mediaType": "document",
  "fileName": "invoice-1042.pdf",
  "gateway": "meta"
}</code></pre>
          </div>
        </div>
      </section>

      <!-- Section: SMS Gateway API -->
      <section id="sms-api" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="smartphone" class="w-4 h-4"></i>
          <span>Cellular SMS &amp; Aggregators</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">SMS Gateway &amp; Android Dual-SIM Routing</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">
          Send SMS using your own physical Android smartphone (with Dual-SIM SIM 1 / SIM 2 selection) or via 3rd-party aggregators (Greenweb BD, BulkSMSBD, Custom HTTP Webhook).
        </p>

        <!-- Send SMS Endpoint -->
        <div class="border border-slate-200 rounded-xl p-5 bg-slate-50/30 mb-6">
          <div class="flex items-center space-x-2.5 mb-3">
            <span class="px-2.5 py-1 text-xs font-bold rounded bg-emerald-100 text-emerald-800 font-mono">POST</span>
            <span class="text-sm font-mono font-semibold text-slate-900">/api/v1/sms/send</span>
          </div>
          <p class="text-xs text-slate-600 mb-3">Dispatches an SMS to a single recipient through the specified channel or SIM slot.</p>

          <div class="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-200 mb-3">
            <pre><code>{
  "recipient": "8801700000000",
  "message": "Your verification code is 591024. Do not share this OTP with anyone.",
  "gateway_type": "android_sim", // 'android_sim', 'greenweb', 'bulksmsbd', 'custom_http'
  "sim_slot": 1 // 1 for SIM Slot 1, 2 for SIM Slot 2
}</code></pre>
          </div>

          <div class="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-200">
            <pre><code>// Response
{
  "success": true,
  "message": "SMS queued for Android SIM gateway dispatch",
  "data": {
    "job_id": "4",
    "status": "queued",
    "recipient": "8801700000000",
    "gateway": "android_sim",
    "sim_slot": 1
  }
}</code></pre>
          </div>
        </div>

        <!-- Android Gateway Setup Guide -->
        <div class="border border-emerald-200 bg-emerald-50/30 rounded-xl p-5">
          <h3 class="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
            <i data-lucide="info" class="w-4 h-4 text-emerald-700"></i>
            <span>How to Connect Your Android Phone:</span>
          </h3>
          <ol class="text-xs text-slate-700 space-y-2 list-decimal list-inside leading-relaxed">
            <li>Build and install the APK located in <code class="font-mono font-semibold">/android-gateway</code> onto your Android device.</li>
            <li>In Unique-Notify Web Dashboard, click <strong>SMS Gateway &gt; Pair Android Device</strong> to get your 6-character code.</li>
            <li>In the phone app, enter your Server URL and 6-character code, then tap <strong>Pair &amp; Connect Device</strong>.</li>
            <li>Enable the <strong>SMS Dispatch Worker</strong> switch. Your phone is now an online cellular SMS server.</li>
          </ol>
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
          Unique-Notify includes a ready-to-use, zero-dependency WHMCS hook file located in <code class="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800">integrations/whmcs/hooks/unique_notify.php</code>.
        </p>

        <div class="space-y-4 text-sm text-slate-700">
          <div class="flex items-start space-x-3">
            <div class="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 flex-shrink-0">1</div>
            <div>
              <p class="font-semibold text-slate-900">Copy the Hook File</p>
              <p class="text-xs text-slate-500">Copy <code class="font-mono">integrations/whmcs/hooks/unique_notify.php</code> to your WHMCS directory: <code class="font-mono">/includes/hooks/unique_notify.php</code>.</p>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <div class="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 flex-shrink-0">2</div>
            <div>
              <p class="font-semibold text-slate-900">Configure Credentials</p>
              <p class="text-xs text-slate-500">Open <code class="font-mono">unique_notify.php</code> and set your Unique-Notify endpoint URL and API Key:</p>
              <div class="bg-slate-900 rounded-lg p-3 font-mono text-xs text-slate-200 mt-2">
                <pre><code>define('UNIQUE_NOTIFY_API_URL', 'http://your-server:3000/api/v1');
define('UNIQUE_NOTIFY_API_KEY', 'un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c');
define('UNIQUE_NOTIFY_GATEWAY', 'meta'); // or 'qr'</code></pre>
              </div>
            </div>
          </div>

          <div class="flex items-start space-x-3">
            <div class="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-xs text-slate-700 flex-shrink-0">3</div>
            <div>
              <p class="font-semibold text-slate-900">Supported WHMCS Automatic Events</p>
              <ul class="text-xs text-slate-600 list-disc list-inside space-y-1 mt-1">
                <li><strong class="text-slate-800">InvoiceCreated:</strong> Instant WhatsApp message with invoice number, due date, and payment URL.</li>
                <li><strong class="text-slate-800">InvoicePaymentReminder:</strong> First, second, and overdue reminder dispatches.</li>
                <li><strong class="text-slate-800">InvoicePaid:</strong> Payment confirmation receipt acknowledging invoice clearance.</li>
                <li><strong class="text-slate-800">TicketOpen & TicketAdminReply:</strong> Instant notification when support staff responds.</li>
                <li><strong class="text-slate-800">AfterModuleCreate:</strong> Service activation notice (cPanel/VPS ready notification).</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Section: PHP SDK -->
      <section id="php-sdk" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="code" class="w-4 h-4"></i>
          <span>Library Reference</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">Standalone PHP SDK</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">
          For custom PHP web applications, Laravel, or CodeIgniter, use our lightweight SDK from <code class="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-slate-800">integrations/php-sdk/UniqueNotify.php</code>:
        </p>

        <div class="bg-slate-900 rounded-xl p-5 overflow-x-auto text-xs text-slate-200 font-mono">
          <pre><code>require_once __DIR__ . '/integrations/php-sdk/UniqueNotify.php';

use UniqueNotify\UniqueNotify;

$client = new UniqueNotify([
    'api_url' => 'http://localhost:3000/api/v1',
    'api_key' => 'un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c',
    'gateway' => 'meta'
]);

// 1. Send OTP
$otpResponse = $client->sendOtp('8801700000000', 'Star Hosting Portal');

// 2. Verify OTP
$verifyResponse = $client->verifyOtp('8801700000000', '123456');

// 3. Send Text Notification
$client->sendText('8801700000000', 'Your order #5523 has been dispatched.');

// 4. Send Document / Invoice
$client->sendMedia('8801700000000', 'https://example.com/inv.pdf', 'Monthly Invoice', 'document');</code></pre>
        </div>
      </section>

      <!-- Section: Anti-Ban & Spintax -->
      <section id="antiban" class="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div class="flex items-center space-x-2 text-brand-600 text-xs font-bold uppercase tracking-wider mb-2">
          <i data-lucide="shield-alert" class="w-4 h-4"></i>
          <span>WhatsApp Safety</span>
        </div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight mb-3">Anti-Ban Engine & Spintax Guide</h2>
        <p class="text-slate-600 text-sm leading-relaxed mb-4">
          When sending through the QR gateway, Unique-Notify automatically implements multiple defensive behaviors to prevent WhatsApp spam flags.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <p class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Spintax Engine</p>
            <p class="text-xs text-slate-600">Every message variation is dynamically computed so recipients receive distinct text phrasing.</p>
          </div>
          <div class="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <p class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Random Jitter Delay</p>
            <p class="text-xs text-slate-600">Configurable 5 to 15 second intervals between messages to replicate natural human typing habits.</p>
          </div>
          <div class="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <p class="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Typing Simulation</p>
            <p class="text-xs text-slate-600">Dispatches WhatsApp presence "composing..." events before committing outbound payloads.</p>
          </div>
        </div>

        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono">
          <p class="text-slate-500 font-semibold mb-2">Spintax Example:</p>
          <p class="text-slate-800">{Hello|Dear|Greetings} {name}, your bill of {amount} is {due|ready}.</p>
          <div class="mt-3 pt-3 border-t border-slate-200 text-slate-600">
            <p><strong>Outcome 1:</strong> "Hello Alice, your bill of $50 is due."</p>
            <p><strong>Outcome 2:</strong> "Dear Bob, your bill of $75 is ready."</p>
            <p><strong>Outcome 3:</strong> "Greetings Charlie, your bill of $30 is due."</p>
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
          Test live API dispatches directly in your browser without leaving this documentation portal.
        </p>

        <div class="space-y-4 max-w-2xl">
          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">API Key</label>
            <input type="text" id="sandboxApiKey" value="un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c" class="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Recipient Phone</label>
              <input type="text" id="sandboxPhone" placeholder="8801700000000" class="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Target Gateway</label>
              <select id="sandboxGateway" class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">
                <option value="meta">Meta WhatsApp Cloud API</option>
                <option value="qr">Baileys QR Gateway</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 uppercase mb-1">Message Content</label>
            <textarea id="sandboxMessage" rows="3" class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none">Hello from Unique-Notify Interactive API Console!</textarea>
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
        <a href="/" class="hover:text-slate-800 transition">Landing Page</a>
        <a href="/login" class="hover:text-slate-800 transition">Client Login</a>
        <a href="/admin/login" class="hover:text-slate-800 transition">Admin Portal</a>
      </div>
    </div>
  </footer>

  <script>
    lucide.createIcons();

    async function runSandboxTest() {
      const apiKey = document.getElementById('sandboxApiKey').value.trim();
      const phone = document.getElementById('sandboxPhone').value.trim();
      const gateway = document.getElementById('sandboxGateway').value;
      const message = document.getElementById('sandboxMessage').value.trim();
      const resArea = document.getElementById('sandboxResponseArea');
      const output = document.getElementById('sandboxOutput');
      const btn = document.getElementById('sandboxSubmitBtn');

      if (!phone) {
        alert('Please enter a recipient phone number with country code (e.g., 8801700000000)');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="inline-block animate-spin mr-2">&#9696;</span> Sending Request...';

      try {
        const response = await fetch('/api/v1/messages/send-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify({ phone, message, gateway })
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
