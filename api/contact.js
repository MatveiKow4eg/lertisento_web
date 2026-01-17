'use strict';

const nodemailer = require('nodemailer');

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function sanitize(value, maxLen) {
  if (typeof value !== 'string') return '';
  const v = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return v.trim().slice(0, maxLen);
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function getIP(req) {
  const xfwd = req.headers['x-forwarded-for'];
  if (typeof xfwd === 'string' && xfwd.length) return xfwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

function requireField(condition, message) {
  if (!condition) {
    const err = new Error(message);
    err.statusCode = 400;
    throw err;
  }
}

let cachedTransporter;
function createTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
  const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  requireField(SMTP_HOST, 'SMTP_HOST is not configured');
  requireField(SMTP_USER, 'SMTP_USER is not configured');
  requireField(SMTP_PASS, 'SMTP_PASS is not configured');

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return cachedTransporter;
}

module.exports = async function handler(req, res) {
  // CORS (optional, but useful if you ever call from another origin)
  const origin = process.env.CORS_ORIGIN;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const MAIL_TO = process.env.MAIL_TO;
    const MAIL_FROM = process.env.MAIL_FROM || 'no-reply@example.com';

    requireField(MAIL_TO, 'MAIL_TO is not configured');

    // Parse JSON body
    const raw = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
        if (data.length > 64 * 1024) {
          reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
          req.destroy();
        }
      });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    let body;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return json(res, 400, { ok: false, error: 'Invalid JSON' });
    }

    // Honeypot
    const honey = sanitize(body.company, 200);
    if (honey) {
      return json(res, 200, { ok: true });
    }

    const name = sanitize(body.name, 120);
    const email = sanitize(body.email, 180);
    const phone = sanitize(body.phone, 60);
    const message = sanitize(body.message, 4000);
    const gdpr = body.gdpr === true;

    requireField(name.length >= 2, 'Name is required');
    requireField(isEmail(email), 'Valid email is required');
    requireField(message.length >= 10, 'Message is too short');
    requireField(gdpr, 'GDPR consent is required');

    const transporter = createTransporter();

    const subject = `Contact form: ${name}`;
    const text =
      `New message from contact form\n\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      (phone ? `Phone: ${phone}\n` : '') +
      `IP: ${getIP(req)}\n` +
      `\nMessage:\n${message}\n`;

    await transporter.sendMail({
      from: MAIL_FROM,
      to: MAIL_TO,
      subject,
      text,
      replyTo: email,
    });

    return json(res, 200, { ok: true });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    if (statusCode >= 500) console.error('[api/contact] error:', err);
    return json(res, statusCode, {
      ok: false,
      error: statusCode === 500 ? 'Server error' : err.message,
    });
  }
};
