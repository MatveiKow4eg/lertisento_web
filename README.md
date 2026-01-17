# Lertisento site (Vercel)

Static site + contact form email via **Vercel Serverless Function** (`/api/contact`) using **Nodemailer**.

## How it works
- Frontend submits JSON to: `POST /api/contact`
- Serverless function sends an email via SMTP.
- Anti-spam: honeypot field `company`.

## Vercel environment variables (required)
Add these in **Vercel → Project → Settings → Environment Variables**:

### Gmail SMTP
> Gmail requires an **App Password** (recommended) with 2FA enabled.

- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `587`
- `SMTP_SECURE` = `false`
- `SMTP_USER` = your Gmail address (e.g. `youraddress@gmail.com`)
- `SMTP_PASS` = Gmail **App Password** (16-char)

### Email routing
- `MAIL_TO` = where to receive contact messages (e.g. `info@lertisento.fi`)
- `MAIL_FROM` = from header, recommended to match `SMTP_USER` for deliverability

Optional:
- `CORS_ORIGIN` = your allowed origin if you ever call from another domain

## Local development
```bash
npm install
npm i -g vercel
copy .env.example .env
vercel dev
```
Open http://localhost:3000

## Notes (Gmail)
- Turn on 2-Step Verification
- Generate App Password: Google Account → Security → App passwords
- Do **not** use your normal Gmail password
