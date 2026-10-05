# Unique-Notify
### WhatsApp & Android Cellular Dual-SIM SMS Notification SaaS Platform

**Unique-Notify** is a production-grade, multi-tenant SaaS notification infrastructure built specifically for **WhatsApp OTP delivery**, **Android Dual-SIM Cellular SMS Dispatch**, **3rd-Party SMS Aggregators (Greenweb / BulkSMSBD)**, **transactional alerts**, **promotional marketing broadcasts**, and **third-party integrations** (WHMCS, PHP scripts, WooCommerce, CRMs).

---

## SaaS Platform Architecture

1. **Public SaaS Landing Page**:
   - Clean, light-theme Tailwind UI landing page.
   - Hero showcase, dual-gateway comparison, interactive pricing table, and feature roadmap.
2. **Multi-Tenant User & Admin System**:
   - **User Self-Registration**: Clients can register and instantly receive **200 Free Trial message credits** on the Free Starter plan.
   - **User Dashboard**: Clients connect their own WhatsApp devices (QR code or Meta Cloud API), pair Android Dual-SIM phones, create API keys, view delivery logs, and manage subscription.
   - **Super Admin Control Center**: Super Admin can monitor all registered clients, review submitted payment proofs (bKash/Nagad/Bank), and activate subscriptions with 1 click.
3. **Multi-Gateway Routing**:
   - **Android Mobile SMS Gateway**: Pair any Android smartphone using a 6-character code to dispatch cellular SMS via SIM 1 or SIM 2.
   - **Third-Party SMS Aggregators**: Connect Greenweb BD, BulkSMSBD, or custom HTTP Webhook APIs.
   - **Meta WhatsApp Cloud API (Official)**: 100% Anti-Ban, high throughput, approved authentication templates.
   - **Multi-Device QR Code Scanner (Baileys)**: Multi-device socket connection with Anti-Ban heuristics (Spintax, human typing simulation, 5s-15s random jitter delay, and daily quota limits).
4. **Subscription Pricing & Payment Gateway**:
   - **Free Starter**: 200 msgs/month, 1 QR session or Meta API, basic API access (Free).
   - **Professional**: 5,000 msgs/month, Dual-Gateway, Anti-ban Jitter & Spintax, WHMCS Hook, priority support (৳990 / mo).
   - **Enterprise**: 25,000 msgs/month, dedicated throughput, 5 devices, priority OTP tier (৳2,490 / mo).
   - **Local & Online Payment Methods**: bKash, Nagad, Rocket, Bank Transfer (with TrxID proof submission), and instant Card Mock simulation.

---

## Quick Start Guide

### 1. Start Server
Run in terminal:
```bash
cd d:\xampp\htdocs\itstarlab\Unique-Notify
node server.js
```

### 2. Access the Application
Open browser at:
**[http://localhost:3000](http://localhost:3000)**

### 3. Pre-Seeded Accounts for Testing:
- **Super Admin Account**:
  - Email: `admin@uniquenotify.com`
  - Password: `admin123`
  - Privilege: Access to all clients directory, payment approvals, and global anti-ban settings.
- **Demo Client Account**:
  - Email: `user@demo.com`
  - Password: `user123`
  - Plan: Professional (5,000 message credits).

---

## API & Integration Endpoints

- **`POST /api/auth/register`**: Client account creation.
- **`POST /api/auth/login`**: User & Admin authentication.
- **`GET /api/billing/plans`**: Active subscription plans list.
- **`POST /api/billing/checkout`**: Submit subscription payment with TrxID.
- **`POST /api/v1/sms/device/pair-request`**: Generate 6-char code for Android phone pairing.
- **`POST /api/v1/sms/device/pair`**: Android phone node pairing.
- **`POST /api/v1/sms/send`**: Send cellular SMS via Android SIM 1, SIM 2, or 3rd party.
- **`POST /api/v1/sms/broadcast`**: Bulk SMS campaign.
- **`POST /api/v1/otp/send`**: High-speed OTP delivery (authenticated via `X-API-Key`).
- **`POST /api/v1/otp/verify`**: Code verification.
- **`POST /api/v1/messages/send-text`**: WhatsApp text notification.
- **`POST /api/v1/messages/send-media`**: Send PDF invoices, images, or documents.
- **`POST /api/v1/broadcasts/create`**: Launch bulk marketing campaign with Spintax `{Hello|Hi}`.

---

## WHMCS Module Installation

1. Copy `integrations/whmcs/UniqueNotifyClient.php` into your WHMCS root `/whmcs/includes/`.
2. Copy `integrations/whmcs/hooks/unique_notify.php` into `/whmcs/includes/hooks/`.
3. Enter your Unique-Notify API Key in `unique_notify.php`.
