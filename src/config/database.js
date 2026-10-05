/**
 * Unique-Notify Database Layer
 * Supports Multi-Tenant SaaS, Pricing Plans, Payment Records, MySQL & SQLite
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let dbType = process.env.DB_TYPE || 'mysql';
let pool = null;
let sqliteDb = null;

// Ensure storage directories exist
const storageDir = path.join(__dirname, '../../storage');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
const sessionsDir = path.join(storageDir, 'sessions');
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });
const uploadsDir = path.join(storageDir, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

/**
 * Initialize Database Connection
 */
async function initDatabase() {
  if (dbType === 'mysql') {
    try {
      const mysql = require('mysql2/promise');
      
      const initConnection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
      });

      const dbName = process.env.DB_NAME || 'unique_notify';
      await initConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await initConnection.end();

      pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
        charset: 'utf8mb4'
      });

      console.log(`[Database] Connected successfully to MySQL (${dbName})`);
      await createTables();
      await seedDefaults();
      return;
    } catch (err) {
      console.warn(`[Database] MySQL connection failed (${err.message}). Falling back to SQLite...`);
      dbType = 'sqlite';
    }
  }

  // SQLite fallback
  const sqlite3 = require('sqlite3').verbose();
  const sqlitePath = path.resolve(process.env.SQLITE_PATH || './storage/database.sqlite');
  
  sqliteDb = new sqlite3.Database(sqlitePath, (err) => {
    if (err) {
      console.error('[Database] Failed to open SQLite database:', err);
    } else {
      console.log(`[Database] Connected successfully to SQLite (${sqlitePath})`);
    }
  });

  await createTables();
  await seedDefaults();
}

/**
 * Unified Query Runner
 */
async function query(sql, params = []) {
  if (dbType === 'mysql') {
    const [results] = await pool.execute(sql, params);
    return results;
  } else {
    return new Promise((resolve, reject) => {
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA');
      if (isSelect) {
        sqliteDb.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        sqliteDb.run(sql, params, function (err) {
          if (err) reject(err);
          else resolve({ insertId: this.lastID, affectedRows: this.changes });
        });
      }
    });
  }
}

async function getOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Helper to safely add column if it doesn't already exist
 */
async function addColumnIfNotExists(table, column, colDef) {
  try {
    if (dbType === 'mysql') {
      const check = await getOne(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );
      if (!check) {
        await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${colDef};`);
      }
    } else {
      // SQLite
      try {
        await query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${colDef};`);
      } catch (e) {
        // Ignored if column already exists in SQLite
      }
    }
  } catch (err) {
    // Column might already exist
  }
}

/**
 * Create Database Schema Tables
 */
async function createTables() {
  const isMysql = dbType === 'mysql';
  const autoInc = isMysql ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const textType = isMysql ? 'LONGTEXT' : 'TEXT';
  const timestampDefault = isMysql ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP';

  // 1. Subscription Plans (SaaS Pricing)
  await query(`
    CREATE TABLE IF NOT EXISTS plans (
      id ${autoInc},
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(50) NOT NULL UNIQUE,
      price_bdt DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      price_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      billing_cycle VARCHAR(20) DEFAULT 'monthly',
      message_limit INT DEFAULT 1000,
      device_limit INT DEFAULT 1,
      features ${textType} DEFAULT NULL,
      is_popular TINYINT(1) DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT ${timestampDefault}
    );
  `);

  // 2. Users table (Admin & SaaS Clients)
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id ${autoInc},
      email VARCHAR(191) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) DEFAULT 'User',
      phone VARCHAR(50) DEFAULT NULL,
      company VARCHAR(100) DEFAULT NULL,
      role VARCHAR(50) DEFAULT 'USER', -- 'SUPER_ADMIN' or 'USER'
      plan_id INT DEFAULT 1,
      plan_status VARCHAR(30) DEFAULT 'ACTIVE', -- 'ACTIVE', 'PENDING', 'EXPIRED'
      credits_remaining INT DEFAULT 200,
      credits_used INT DEFAULT 0,
      created_at DATETIME DEFAULT ${timestampDefault},
      updated_at DATETIME DEFAULT ${timestampDefault}
    );
  `);

  // Ensure SaaS columns exist on users
  await addColumnIfNotExists('users', 'phone', 'VARCHAR(50) DEFAULT NULL');
  await addColumnIfNotExists('users', 'company', 'VARCHAR(100) DEFAULT NULL');
  await addColumnIfNotExists('users', 'plan_id', 'INT DEFAULT 1');
  await addColumnIfNotExists('users', 'plan_status', "VARCHAR(30) DEFAULT 'ACTIVE'");
  await addColumnIfNotExists('users', 'credits_remaining', 'INT DEFAULT 200');
  await addColumnIfNotExists('users', 'credits_used', 'INT DEFAULT 0');
  await addColumnIfNotExists('users', 'sms_balance', 'DECIMAL(10,4) DEFAULT 0.0000');
  await addColumnIfNotExists('users', 'sms_credits', 'INT DEFAULT 0');
  await addColumnIfNotExists('users', 'custom_sms_rate', 'DECIMAL(10,4) DEFAULT NULL');

  // 3. Payment Transactions table (bKash, Nagad, Card, Manual)
  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id ${autoInc},
      user_id INT NOT NULL,
      plan_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'BDT',
      payment_method VARCHAR(50) NOT NULL, -- 'bkash', 'nagad', 'rocket', 'bank', 'card'
      sender_number VARCHAR(50) DEFAULT NULL,
      transaction_id VARCHAR(100) NOT NULL,
      notes ${textType} DEFAULT NULL,
      status VARCHAR(30) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
      created_at DATETIME DEFAULT ${timestampDefault},
      approved_at DATETIME DEFAULT NULL
    );
  `);

  // 4. API Keys table
  await query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id ${autoInc},
      user_id INT DEFAULT 1,
      name VARCHAR(100) NOT NULL,
      api_key VARCHAR(100) NOT NULL UNIQUE,
      secret VARCHAR(100) DEFAULT NULL,
      is_active TINYINT(1) DEFAULT 1,
      rate_limit_per_min INT DEFAULT 120,
      allowed_ips VARCHAR(255) DEFAULT NULL,
      created_at DATETIME DEFAULT ${timestampDefault},
      last_used_at DATETIME DEFAULT NULL
    );
  `);
  await addColumnIfNotExists('api_keys', 'user_id', 'INT DEFAULT 1');

  // 5. Gateways table (Meta Cloud API & QR Sessions)
  await query(`
    CREATE TABLE IF NOT EXISTS gateways (
      id ${autoInc},
      user_id INT DEFAULT 1,
      type VARCHAR(20) NOT NULL, -- 'meta' or 'qr'
      name VARCHAR(100) NOT NULL,
      status VARCHAR(50) DEFAULT 'DISCONNECTED',
      config ${textType} DEFAULT NULL,
      is_default TINYINT(1) DEFAULT 0,
      daily_limit INT DEFAULT 1000,
      today_count INT DEFAULT 0,
      last_reset_date VARCHAR(20) DEFAULT NULL,
      phone_number VARCHAR(50) DEFAULT NULL,
      created_at DATETIME DEFAULT ${timestampDefault},
      updated_at DATETIME DEFAULT ${timestampDefault}
    );
  `);
  await addColumnIfNotExists('gateways', 'user_id', 'INT DEFAULT 1');

  // 6. OTP Logs table
  await query(`
    CREATE TABLE IF NOT EXISTS otp_logs (
      id ${autoInc},
      user_id INT DEFAULT 1,
      phone VARCHAR(50) NOT NULL,
      otp_code VARCHAR(20) NOT NULL,
      gateway_used VARCHAR(20) DEFAULT 'meta',
      service_name VARCHAR(100) DEFAULT 'General',
      status VARCHAR(30) DEFAULT 'PENDING',
      attempts INT DEFAULT 0,
      expires_at DATETIME NOT NULL,
      verified_at DATETIME DEFAULT NULL,
      response_data ${textType} DEFAULT NULL,
      created_at DATETIME DEFAULT ${timestampDefault}
    );
  `);
  await addColumnIfNotExists('otp_logs', 'user_id', 'INT DEFAULT 1');

  // 7. Universal Message Logs
  await query(`
    CREATE TABLE IF NOT EXISTS message_logs (
      id ${autoInc},
      user_id INT DEFAULT 1,
      gateway_type VARCHAR(20) NOT NULL,
      direction VARCHAR(10) DEFAULT 'OUTBOUND',
      recipient_phone VARCHAR(50) NOT NULL,
      message_type VARCHAR(30) DEFAULT 'TEXT',
      content ${textType} DEFAULT NULL,
      media_url VARCHAR(500) DEFAULT NULL,
      template_name VARCHAR(100) DEFAULT NULL,
      template_params ${textType} DEFAULT NULL,
      meta_message_id VARCHAR(255) DEFAULT NULL,
      status VARCHAR(30) DEFAULT 'QUEUED',
      error_reason ${textType} DEFAULT NULL,
      created_at DATETIME DEFAULT ${timestampDefault},
      updated_at DATETIME DEFAULT ${timestampDefault}
    );
  `);
  await addColumnIfNotExists('message_logs', 'user_id', 'INT DEFAULT 1');

  // 8. Broadcast Campaigns
  await query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id ${autoInc},
      user_id INT DEFAULT 1,
      name VARCHAR(150) NOT NULL,
      gateway_type VARCHAR(20) DEFAULT 'qr',
      gateway_id INT DEFAULT NULL,
      message_template ${textType} NOT NULL,
      media_url VARCHAR(500) DEFAULT NULL,
      media_type VARCHAR(50) DEFAULT NULL,
      total_contacts INT DEFAULT 0,
      sent_count INT DEFAULT 0,
      delivered_count INT DEFAULT 0,
      failed_count INT DEFAULT 0,
      status VARCHAR(30) DEFAULT 'DRAFT',
      min_delay_sec INT DEFAULT 5,
      max_delay_sec INT DEFAULT 15,
      scheduled_at DATETIME DEFAULT NULL,
      started_at DATETIME DEFAULT NULL,
      completed_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT ${timestampDefault}
    );
  `);
  await addColumnIfNotExists('campaigns', 'user_id', 'INT DEFAULT 1');

  // 9. Campaign Items
  await query(`
    CREATE TABLE IF NOT EXISTS campaign_items (
      id ${autoInc},
      campaign_id INT NOT NULL,
      phone VARCHAR(50) NOT NULL,
      name VARCHAR(100) DEFAULT NULL,
      custom_variables ${textType} DEFAULT NULL,
      rendered_message ${textType} DEFAULT NULL,
      status VARCHAR(30) DEFAULT 'PENDING',
      sent_at DATETIME DEFAULT NULL,
      error_message VARCHAR(500) DEFAULT NULL
    );
  `);

  // 10. Meta Templates Cache
  await query(`
    CREATE TABLE IF NOT EXISTS meta_templates (
      id ${autoInc},
      template_id VARCHAR(100) DEFAULT NULL,
      name VARCHAR(100) NOT NULL,
      language VARCHAR(20) DEFAULT 'en_US',
      category VARCHAR(50) DEFAULT 'UTILITY',
      status VARCHAR(50) DEFAULT 'APPROVED',
      components ${textType} DEFAULT NULL,
      last_synced_at DATETIME DEFAULT ${timestampDefault}
    );
  `);

  // 11. System Settings Key-Value store
  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value ${textType} DEFAULT NULL,
      description VARCHAR(255) DEFAULT NULL,
      updated_at DATETIME DEFAULT ${timestampDefault}
    );
  `);

  // 12. Security Audit Logs table
  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id ${autoInc},
      user_id INT DEFAULT NULL,
      action VARCHAR(100) NOT NULL,
      ip_address VARCHAR(100) DEFAULT NULL,
      user_agent VARCHAR(255) DEFAULT NULL,
      details ${textType} DEFAULT NULL,
      created_at DATETIME DEFAULT ${timestampDefault}
    );
  `);

  // 13. Dedicated Admins Table (COMPLETELY SEPARATE from users - different credentials, different table)
  await query(`
    CREATE TABLE IF NOT EXISTS admins (
      id ${autoInc},
      name VARCHAR(100) NOT NULL DEFAULT 'Super Admin',
      email VARCHAR(191) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50) DEFAULT NULL,
      avatar VARCHAR(255) DEFAULT NULL,
      is_active TINYINT(1) DEFAULT 1,
      last_login_at DATETIME DEFAULT NULL,
      last_login_ip VARCHAR(100) DEFAULT NULL,
      created_at DATETIME DEFAULT ${timestampDefault},
      updated_at DATETIME DEFAULT ${timestampDefault}
    );
  `);

  // 14. User Contact Book (Saved contacts for bulk messaging)
  await query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id ${autoInc},
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(191) DEFAULT NULL,
      group_name VARCHAR(100) DEFAULT 'Default',
      notes VARCHAR(255) DEFAULT NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT ${timestampDefault},
      updated_at DATETIME DEFAULT ${timestampDefault}
    );
  `);

  // 15. User-level Anti-Ban settings (override global settings per user)
  await query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id ${autoInc},
      user_id INT NOT NULL UNIQUE,
      anti_ban_min_delay INT DEFAULT 5,
      anti_ban_max_delay INT DEFAULT 15,
      anti_ban_typing_sim TINYINT(1) DEFAULT 1,
      anti_ban_daily_limit INT DEFAULT 1000,
      anti_ban_quiet_hours TINYINT(1) DEFAULT 0,
      anti_ban_quiet_start VARCHAR(10) DEFAULT '23:00',
      anti_ban_quiet_end VARCHAR(10) DEFAULT '07:00',
      default_gateway VARCHAR(20) DEFAULT 'meta',
      notify_on_delivery TINYINT(1) DEFAULT 1,
      updated_at DATETIME DEFAULT ${timestampDefault}
    );
  `);

  // 16. Android SMS Gateway Devices (Personal Phone SIM 1 / SIM 2)
  await query(`
    CREATE TABLE IF NOT EXISTS sms_devices (
      id ${autoInc},
      user_id INT NOT NULL,
      device_name VARCHAR(100) NOT NULL,
      device_token VARCHAR(64) NOT NULL UNIQUE,
      pairing_code VARCHAR(10) DEFAULT NULL,
      phone_number VARCHAR(30) DEFAULT NULL,
      sim1_operator VARCHAR(50) DEFAULT 'SIM 1',
      sim2_operator VARCHAR(50) DEFAULT 'SIM 2',
      sim1_sender_id VARCHAR(50) DEFAULT NULL,
      sim2_sender_id VARCHAR(50) DEFAULT NULL,
      is_shared TINYINT(1) DEFAULT 0,
      assigned_user_id INT DEFAULT NULL,
      default_sim_slot INT DEFAULT 1,
      battery_level INT DEFAULT 100,
      is_charging TINYINT(1) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'OFFLINE',
      last_seen_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT ${timestampDefault},
      updated_at DATETIME DEFAULT ${timestampDefault}
    );
  `);

  // 17. Third-Party SMS Gateways (Admin-Managed: Greenweb, BulkSMSBD, Custom HTTP)
  await query(`
    CREATE TABLE IF NOT EXISTS sms_gateways (
      id ${autoInc},
      user_id INT DEFAULT NULL,
      provider_name VARCHAR(50) NOT NULL,
      api_url VARCHAR(255) NOT NULL,
      api_key VARCHAR(255) DEFAULT NULL,
      sender_id VARCHAR(50) DEFAULT NULL,
      is_default TINYINT(1) DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      notes VARCHAR(255) DEFAULT NULL,
      created_at DATETIME DEFAULT ${timestampDefault},
      updated_at DATETIME DEFAULT ${timestampDefault}
    );
  `);
  await addColumnIfNotExists('sms_gateways', 'is_default', 'TINYINT(1) DEFAULT 0');
  await addColumnIfNotExists('sms_gateways', 'notes', 'VARCHAR(255) DEFAULT NULL');

  // 18. SMS Packages (Pay-as-you-go Bundles)
  await query(`
    CREATE TABLE IF NOT EXISTS sms_packages (
      id ${autoInc},
      name VARCHAR(100) NOT NULL,
      sms_count INT NOT NULL,
      price_bdt DECIMAL(10,2) NOT NULL,
      price_per_sms DECIMAL(10,4) NOT NULL DEFAULT 0.3500,
      validity_days INT DEFAULT 365,
      features ${textType} DEFAULT NULL,
      is_popular TINYINT(1) DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT ${timestampDefault}
    );
  `);

  // 19. SMS Wallet Transactions (Top-ups, Package Buys, Pay-as-you-go debits)
  await query(`
    CREATE TABLE IF NOT EXISTS sms_transactions (
      id ${autoInc},
      user_id INT NOT NULL,
      type VARCHAR(30) NOT NULL, -- 'TOPUP_RECHARGE', 'PACKAGE_PURCHASE', 'SMS_DEBIT', 'REFUND', 'ADMIN_ADJUST'
      amount_bdt DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
      sms_count INT NOT NULL DEFAULT 0,
      rate_per_sms DECIMAL(10,4) DEFAULT 0.3500,
      balance_after DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
      description VARCHAR(255) NOT NULL,
      payment_method VARCHAR(50) DEFAULT NULL,
      sender_number VARCHAR(50) DEFAULT NULL,
      transaction_id VARCHAR(100) DEFAULT NULL,
      status VARCHAR(20) DEFAULT 'COMPLETED', -- 'PENDING', 'COMPLETED', 'REJECTED'
      created_at DATETIME DEFAULT ${timestampDefault}
    );
  `);

  // 20. SMS Queue & Logs (Android SIM + 3rd Party)
  await query(`
    CREATE TABLE IF NOT EXISTS sms_queue (
      id ${autoInc},
      user_id INT NOT NULL,
      device_id INT DEFAULT NULL,
      gateway_type VARCHAR(50) DEFAULT 'android_sim',
      sim_slot INT DEFAULT 1,
      recipient VARCHAR(30) NOT NULL,
      message ${textType} NOT NULL,
      status VARCHAR(20) DEFAULT 'PENDING',
      cost_bdt DECIMAL(10,4) DEFAULT 0.0000,
      sms_parts INT DEFAULT 1,
      charged TINYINT(1) DEFAULT 0,
      attempts INT DEFAULT 0,
      error_reason VARCHAR(255) DEFAULT NULL,
      sent_at DATETIME DEFAULT NULL,
      delivered_at DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT ${timestampDefault},
      updated_at DATETIME DEFAULT ${timestampDefault}
    );
  `);
  await addColumnIfNotExists('sms_queue', 'cost_bdt', 'DECIMAL(10,4) DEFAULT 0.0000');
  await addColumnIfNotExists('sms_queue', 'sms_parts', 'INT DEFAULT 1');
  await addColumnIfNotExists('sms_queue', 'charged', 'TINYINT(1) DEFAULT 0');
  await addColumnIfNotExists('sms_devices', 'sim1_sender_id', 'VARCHAR(50) DEFAULT NULL');
  await addColumnIfNotExists('sms_devices', 'sim2_sender_id', 'VARCHAR(50) DEFAULT NULL');
  await addColumnIfNotExists('sms_devices', 'is_shared', 'TINYINT(1) DEFAULT 0');
  await addColumnIfNotExists('sms_devices', 'assigned_user_id', 'INT DEFAULT NULL');
}

/**
 * Seed Initial Default Records
 */
async function seedDefaults() {
  try {
    // 1. Seed Pricing Plans
    const plansCount = await getOne('SELECT COUNT(*) as c FROM plans');
    if (!plansCount || plansCount.c === 0) {
      const defaultPlans = [
        {
          name: 'Free Starter',
          slug: 'free-starter',
          price_bdt: 0,
          price_usd: 0,
          message_limit: 200,
          device_limit: 1,
          is_popular: 0,
          features: JSON.stringify([
            '200 Messages / Month',
            '1 WhatsApp Session (QR Scan)',
            'Official Meta Cloud API Support',
            'High-Speed OTP Dispatch',
            'Full REST API & Webhooks',
            'Community Support'
          ])
        },
        {
          name: 'Professional',
          slug: 'pro-business',
          price_bdt: 990,
          price_usd: 10,
          message_limit: 5000,
          device_limit: 2,
          is_popular: 1,
          features: JSON.stringify([
            '5,000 Messages / Month',
            'Dual-Gateway (Meta + QR)',
            'Anti-Ban Smart Engine (Spintax & Jitter)',
            'WHMCS Official Hook & Plugin',
            'Standalone PHP & Node SDKs',
            'Priority Email & Chat Support'
          ])
        },
        {
          name: 'Enterprise',
          slug: 'enterprise',
          price_bdt: 2490,
          price_usd: 25,
          message_limit: 25000,
          device_limit: 5,
          is_popular: 0,
          features: JSON.stringify([
            '25,000 Messages / Month',
            '5 WhatsApp Connected Devices',
            'Dedicated Queue Workers',
            'Priority OTP Delivery Tier',
            'Custom Sender ID Roadmap Ready',
            'Dedicated Account Manager'
          ])
        }
      ];

      for (const p of defaultPlans) {
        await query(
          'INSERT INTO plans (name, slug, price_bdt, price_usd, message_limit, device_limit, is_popular, features) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [p.name, p.slug, p.price_bdt, p.price_usd, p.message_limit, p.device_limit, p.is_popular, p.features]
        );
      }
      console.log('[Seed] Created default SaaS subscription plans');
    }

    // 2. Seed Super Admin into DEDICATED ADMINS TABLE (separate from users)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@uniquenotify.com';
    const existingAdmin = await getOne('SELECT id FROM admins WHERE email = ?', [adminEmail]);
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      await query(
        'INSERT INTO admins (name, email, password, is_active) VALUES (?, ?, ?, 1)',
        ['System Administrator', adminEmail, passwordHash]
      );
      console.log(`[Seed] Created Super Admin in admins table: ${adminEmail}`);
    }

    // Migrate any old SUPER_ADMIN from users table to admins table, then demote them
    const oldAdminInUsers = await getOne('SELECT * FROM users WHERE role = "SUPER_ADMIN" AND email = ?', [adminEmail]);
    if (oldAdminInUsers) {
      // Migrate to admins table if not already there
      const alreadyMigrated = await getOne('SELECT id FROM admins WHERE email = ?', [adminEmail]);
      if (!alreadyMigrated) {
        await query(
          'INSERT INTO admins (name, email, password, is_active) VALUES (?, ?, ?, 1)',
          [oldAdminInUsers.name || 'System Administrator', adminEmail, oldAdminInUsers.password]
        );
      }
      // Remove SUPER_ADMIN role from users table (they should login via /admin portal only)
      await query('DELETE FROM users WHERE role = "SUPER_ADMIN"', []);
      console.log('[Seed] Migrated Super Admin out of users table into dedicated admins table');
    }

    // 3. Check & Seed Demo Client User
    const demoEmail = 'user@demo.com';
    const existingDemo = await getOne('SELECT id FROM users WHERE email = ?', [demoEmail]);
    if (!existingDemo) {
      const passwordHash = await bcrypt.hash('user123', 10);
      await query(
        'INSERT INTO users (email, password, name, company, role, plan_id, plan_status, credits_remaining) VALUES (?, ?, ?, ?, "USER", 2, "ACTIVE", 5000)',
        [demoEmail, passwordHash, 'Demo Business Client', 'Star Hosting Ltd']
      );
      console.log(`[Seed] Created Demo User: ${demoEmail} / user123`);
    }

    // 4. Check & Seed Default API Key
    const defaultApiKey = process.env.DEFAULT_API_KEY || 'un_live_8f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c';
    const existingKey = await getOne('SELECT id FROM api_keys WHERE api_key = ?', [defaultApiKey]);
    if (!existingKey) {
      await query(
        'INSERT INTO api_keys (user_id, name, api_key, is_active, rate_limit_per_min) VALUES (1, ?, ?, 1, 120)',
        ['Default Master Key', defaultApiKey]
      );
    }

    // 5. Check & Seed Meta Cloud Gateway
    const existingMeta = await getOne("SELECT id FROM gateways WHERE type = 'meta' AND user_id = 1");
    if (!existingMeta) {
      const metaConfig = JSON.stringify({
        api_version: process.env.META_API_VERSION || 'v21.0',
        phone_number_id: process.env.META_PHONE_NUMBER_ID || '',
        waba_id: process.env.META_WABA_ID || '',
        access_token: process.env.META_ACCESS_TOKEN || '',
        verify_token: process.env.META_WEBHOOK_VERIFY_TOKEN || 'unique_notify_verify_token_123'
      });
      await query(
        'INSERT INTO gateways (user_id, type, name, status, config, is_default, daily_limit) VALUES (1, ?, ?, ?, ?, 1, 10000)',
        ['meta', 'Meta WhatsApp Cloud API (Official)', 'CONFIG_REQUIRED', metaConfig]
      );
    }

    // 6. Check & Seed QR Session Gateway
    const existingQr = await getOne("SELECT id FROM gateways WHERE type = 'qr' AND user_id = 1");
    if (!existingQr) {
      const qrConfig = JSON.stringify({
        sessionId: 'primary_qr_session',
        sessionFolder: 'primary_qr_session',
        autoReconnect: true
      });
      await query(
        'INSERT INTO gateways (user_id, type, name, status, config, is_default, daily_limit) VALUES (1, ?, ?, ?, ?, 0, 1000)',
        ['qr', 'Multi-Device QR Scanner (Device 1)', 'DISCONNECTED', qrConfig]
      );
    }

    // 7. Seed System Settings & Payment Instructions
    const defaultSettings = [
      { key: 'anti_ban_min_delay', val: process.env.ANTI_BAN_MIN_DELAY || '5', desc: 'Minimum delay in seconds between campaign messages' },
      { key: 'anti_ban_max_delay', val: process.env.ANTI_BAN_MAX_DELAY || '15', desc: 'Maximum delay in seconds between campaign messages' },
      { key: 'anti_ban_typing_sim', val: process.env.ANTI_BAN_TYPING_SIMULATION || 'true', desc: 'Simulate human typing indicator before sending' },
      { key: 'anti_ban_daily_limit', val: process.env.ANTI_BAN_DAILY_LIMIT || '1000', desc: 'Default daily limit per QR device' },
      { key: 'anti_ban_quiet_hours', val: 'false', desc: 'Pause broadcasts during nighttime' },
      { key: 'anti_ban_quiet_start', val: '23:00', desc: 'Quiet hours start time' },
      { key: 'anti_ban_quiet_end', val: '07:00', desc: 'Quiet hours end time' },
      { key: 'default_gateway', val: 'meta', desc: 'Default gateway for API if not specified (meta or qr)' },
      { key: 'payment_bkash_number', val: '01700000000 (Merchant / Personal)', desc: 'bKash Account Number' },
      { key: 'payment_nagad_number', val: '01800000000 (Merchant / Personal)', desc: 'Nagad Account Number' },
      { key: 'payment_rocket_number', val: '01900000000 (Personal)', desc: 'Rocket Account Number' },
      { key: 'payment_bank_details', val: 'Bank: City Bank | A/C: 1102938471 | Name: Unique Notify Ltd', desc: 'Bank Transfer Details' },
      { key: 'default_sms_rate', val: '0.35', desc: 'Default price in BDT per SMS part for Pay-as-you-go' },
      { key: 'min_sms_recharge', val: '50.00', desc: 'Minimum SMS Wallet Recharge Amount in BDT' },
      { key: 'active_sms_gateway', val: 'greenweb', desc: 'Default active third-party SMS gateway for system' }
    ];

    for (const s of defaultSettings) {
      const existing = await getOne('SELECT setting_key FROM system_settings WHERE setting_key = ?', [s.key]);
      if (!existing) {
        await query(
          'INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
          [s.key, s.val, s.desc]
        );
      }
    }

    // 8. Seed Default SMS Packages (Pay-as-you-go Bundles)
    const smsPkgCount = await getOne('SELECT COUNT(*) as c FROM sms_packages');
    if (!smsPkgCount || smsPkgCount.c === 0) {
      const defaultSmsPackages = [
        {
          name: 'Starter SMS Pack',
          sms_count: 200,
          price_bdt: 70.00,
          price_per_sms: 0.35,
          validity_days: 180,
          is_popular: 0,
          features: JSON.stringify(['200 SMS Credits', 'Rate: ৳0.35 / SMS', 'High Speed Delivery', 'Delivery Reports', '180 Days Validity'])
        },
        {
          name: 'Business 1K Pack',
          sms_count: 1000,
          price_bdt: 350.00,
          price_per_sms: 0.35,
          validity_days: 365,
          is_popular: 1,
          features: JSON.stringify(['1,000 SMS Credits', 'Rate: ৳0.35 / SMS', 'Priority Queue Tier', 'Real-time DLR & Webhook', '365 Days Validity', 'Bangla & English Support'])
        },
        {
          name: 'Corporate 5K Pack',
          sms_count: 5000,
          price_bdt: 1600.00,
          price_per_sms: 0.32,
          validity_days: 365,
          is_popular: 0,
          features: JSON.stringify(['5,000 SMS Credits', 'Discounted Rate: ৳0.32 / SMS', 'High-Volume Dedicated Route', 'API & Excel Bulk Upload', '365 Days Validity', 'Priority Support'])
        },
        {
          name: 'Enterprise 20K Pack',
          sms_count: 20000,
          price_bdt: 5800.00,
          price_per_sms: 0.29,
          validity_days: 365,
          is_popular: 0,
          features: JSON.stringify(['20,000 SMS Credits', 'VIP Rate: ৳0.29 / SMS', 'Dedicated Server Pipeline', 'Masking / Sender ID Ready', 'Lifetime Validity', '24/7 Account Manager'])
        }
      ];

      for (const pkg of defaultSmsPackages) {
        await query(
          'INSERT INTO sms_packages (name, sms_count, price_bdt, price_per_sms, validity_days, is_popular, features) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [pkg.name, pkg.sms_count, pkg.price_bdt, pkg.price_per_sms, pkg.validity_days, pkg.is_popular, pkg.features]
        );
      }
      console.log('[Seed] Created default SMS packages');
    }

    // 9. Seed Default Admin SMS Gateways (Greenweb, BulkSMSBD, Custom HTTP)
    const gwCount = await getOne('SELECT COUNT(*) as c FROM sms_gateways WHERE user_id IS NULL');
    if (!gwCount || gwCount.c === 0) {
      await query(
        `INSERT INTO sms_gateways (user_id, provider_name, api_url, api_key, sender_id, is_default, is_active, notes)
         VALUES 
         (NULL, 'greenweb', 'http://api.greenweb.com.bd/api.php', 'YOUR_GREENWEB_API_TOKEN', 'UNIQUE', 1, 1, 'Greenweb Bangladesh Direct SMS Gateway'),
         (NULL, 'bulksmsbd', 'http://bulksmsbd.net/api/smsapi', 'YOUR_BULKSMSBD_KEY', 'UNIQUE', 0, 1, 'BulkSMSBD Gateway Driver'),
         (NULL, 'custom_http', 'http://your-provider.com/api/send?to={to}&msg={message}&key={api_key}', '', '', 0, 0, 'Generic HTTP GET/POST API Gateway')`
      );
      console.log('[Seed] Created default Admin SMS Gateways');
    }

    // 10. Give demo user initial SMS balance for instant testing if 0
    await query('UPDATE users SET sms_balance = 50.0000, sms_credits = 100 WHERE id = 1 AND sms_balance = 0', []);
  } catch (err) {
    console.error('[Seed] Error seeding defaults:', err.message);
  }
}

module.exports = {
  initDatabase,
  query,
  getOne,
  get dbType() { return dbType; }
};
