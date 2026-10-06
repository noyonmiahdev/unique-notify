# Unique-Notify
### Universal WhatsApp & Android Cellular Dual-SIM SMS Multi-Gateway SaaS Hub

**Unique-Notify** is an enterprise-grade, multi-tenant notification infrastructure built for **Cellular Dual-SIM SMS Dispatch**, **WhatsApp Personal & Meta Cloud Messaging**, **OTP verification**, **promotional marketing broadcasts**, and **third-party integrations** (WHMCS, PHP scripts, WooCommerce, CRMs).

---

## Key Capabilities & Updates

1. **SMS Gateway (No Sender ID Required)**:
   - **Automated Routing**: Dispatches SMS via paired Android Gateway nodes or assigned dedicated SIM slots without requiring sender IDs.
   - **Strict SIM Slot Targeting**: Supports `sim_slot: 1` or `sim_slot: 2` (never switches to wrong SIM).
   - **Cloud Aggregator Fallback**: Seamless Pay-as-you-go billing with Greenweb BD, BulkSMSBD, and Admin Shared Android nodes.
   - **Detailed Modem Diagnostics**: Tracks `PERMISSION_DENIED`, `NO_SERVICE`, `RADIO_OFF`, and carrier balance status in real-time.

2. **Personal WhatsApp Dispatch**:
   - **Auto Personal Session Routing**: Dispatches messages automatically via connected personal WhatsApp QR socket with human typing simulation (`simulateTyping: true`).
   - **Unified Message Dispatch**: Send text and rich media (PDF, images, documents) via `POST /api/v1/messages/send`.
   - **Meta WhatsApp Cloud API (Official)**: Graph API v21.0 integration for verified business templates.

3. **High-Speed OTP Engine**:
   - `POST /api/v1/otp/send` and `POST /api/v1/otp/verify`.
   - Auto-generated 6-digit numeric OTPs with configurable expiration and attempt rate limiting.

4. **API Security & Anti-Abuse (Anti-Ban Engine)**:
   - **Flexible Authentication**: Supports `x-api-key` header, `Authorization: Bearer` header, and JWT tokens.
   - **Anti-Ban Heuristics**: Dynamic Spintax randomizer `{Hello|Hi|Greetings}`, typing simulation, and polite inter-message jitter delays.
   - **IP Whitelisting & Rate Limiting**: 120 requests/minute per API key with standard `X-RateLimit-*` headers.

---

## Quick Start Guide

### 1. Start Server
Run in terminal:
```bash
cd d:\xampp\htdocs\itstarlab\Unique-Notify
node server.js
```

### 2. Access the Application
- **Main Client Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Admin Control Center**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **API Documentation**: [http://localhost:3000/docs](http://localhost:3000/docs)

### 3. Pre-Seeded Accounts for Testing:
- **Super Admin**: `admin@uniquenotify.com` / `admin123`
- **Demo Client**: `user@demo.com` / `user123`

---

## Core API Endpoints

- **`POST /api/v1/sms/send`**: Send cellular SMS (No sender ID required, optional `sim_slot: 1` or `2`).
- **`POST /api/v1/sms/device/pair-request`**: Generate 6-char code to pair an Android Gateway phone.
- **`GET /api/v1/sms/devices`**: List connected Android phone nodes and active SIM operators.
- **`POST /api/v1/messages/send`**: Send WhatsApp text or media (Auto-routes to connected personal WhatsApp).
- **`POST /api/v1/otp/send`**: Dispatch an OTP verification code.
- **`POST /api/v1/otp/verify`**: Verify received OTP code.
- **`POST /api/v1/broadcasts/create`**: Launch bulk marketing campaign with Spintax `{Hello|Hi}`.

---

## Android Gateway Node

The Android Gateway source code is located in `D:\CODING\Mobile_Apps\Android\Source_Code\android-gateway`.
Pre-built debug APK: `app/build/outputs/apk/debug/app-debug.apk`.
