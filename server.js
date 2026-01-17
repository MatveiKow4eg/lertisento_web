'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();

// ----- config -----
const PORT = Number(process.env.PORT || 3000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || `http://localhost:${PORT}`;

const MAIL_TO = process.env.MAIL_TO;
const MAIL_FROM = process.env.MAIL_FROM || 'no-reply@example.com';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

if (!MAIL_TO) {
  console.warn('[contact] MAIL_TO is not set. Emails will fail until configured.');
}

// ----- middleware -----
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '64kb' }));

app.use(
  '/contact',
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_LIMIT_MAX || 10),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// serve static site
app.use(express.static(path.join(__dirname), { extensions: ['html'] }));

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function sanitize(value, maxLen) {
  if (typeof value !== 'string') return '';
  const v = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return v.trim().slice(0, maxLen);
}

function requireField(condition, message) {
  if (!condition) {
    const err = new Error(message);
    err.statusCode = 400;
    throw err;
  }
}

function createTransporter() {
  requireField(SMTP_HOST, 'SMTP_HOST is not configured');
  requireField(SMTP_USER, 'SMTP_USER is not configured');
  requireField(SMTP_PASS, 'SMTP_PASS is not configured');

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

// ----- API -----
app.post('/contact', async (req, res) => {
  try {
    // Honeypot: front-end will include this field, bots often fill it
    const honey = sanitize(req.body.company, 200);
    if (honey) {
      // Pretend success to not teach bots
      return res.status(200).json({ ok: true });
    }

    const name = sanitize(req.body.name, 120);
    const email = sanitize(req.body.email, 180);
    const phone = sanitize(req.body.phone, 60);
    const message = sanitize(req.body.message, 4000);
    const gdpr = req.body.gdpr === true;

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
      `\nMessage:\n${message}\n`;

    // Use replyTo so the receiver can reply to the user's email
    await transporter.sendMail({
      from: MAIL_FROM,
      to: MAIL_TO,
      subject,
      text,
      replyTo: email,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    if (statusCode >= 500) {
      console.error('[contact] error:', err);
    }
    return res.status(statusCode).json({
      ok: false,
      error: statusCode === 500 ? 'Server error' : err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
});
