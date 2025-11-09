# TaskLynk Deployment Guide

## 🚀 Pre-Deployment Checklist

### ✅ 1. Environment Variables Setup

Copy `.env.example` to `.env` and configure all required variables:

```bash
cp .env.example .env
```

#### Required Environment Variables:

1. **Database (Turso)**
   - `TURSO_CONNECTION_URL` - Your Turso database connection URL
   - `TURSO_AUTH_TOKEN` - Turso authentication token

2. **Email Service (Resend)**
   - `RESEND_API_KEY` - Get from https://resend.com/api-keys

3. **M-Pesa Payment (Safaricom Daraja)**
   - `MPESA_CONSUMER_KEY` - Daraja API consumer key
   - `MPESA_CONSUMER_SECRET` - Daraja API consumer secret
   - `MPESA_SHORTCODE` - Your M-Pesa business shortcode
   - `MPESA_PASSKEY` - M-Pesa passkey
   - `MPESA_ENVIRONMENT` - Set to `sandbox` for testing, `production` for live

4. **Paystack Payment Gateway**
   - `PAYSTACK_SECRET_KEY` - Secret key (sk_live_xxx for production)
   - `PAYSTACK_PUBLIC_KEY` - Public key (pk_live_xxx for production)
   - **NOTE:** Use test keys (sk_test_xxx, pk_test_xxx) for development

5. **Application URL**
   - `NEXT_PUBLIC_APP_URL` - Your production domain (e.g., https://tasklynk.co.ke)

---

## 📋 Database Setup

### 1. Push Database Schema

```bash
npm run db:push
```

### 2. Seed Admin Accounts

The following admin accounts are pre-configured:
- topwriteessays@gmail.com
- m.d.techpoint25@gmail.com
- maguna956@gmail.com
- tasklynk01@gmail.com
- maxwellotieno11@gmail.com
- ashleydothy3162@gmail.com

**Default Password:** kemoda2025

```bash
npm run db:seed
```

---

## 🔐 Payment Gateway Configuration

### Paystack Setup

1. **Create Paystack Account:** https://dashboard.paystack.com/signup
2. **Get API Keys:** Navigate to Settings → API Keys & Webhooks
3. **Configure Webhook URL:** 
   - URL: `https://yourdomain.com/api/paystack/verify`
   - Events: `charge.success`, `charge.failed`
4. **Update .env:**
   ```
   PAYSTACK_SECRET_KEY=sk_live_your_actual_secret_key
   PAYSTACK_PUBLIC_KEY=pk_live_your_actual_public_key
   ```

### M-Pesa Daraja API Setup

1. **Create Safaricom Developer Account:** https://developer.safaricom.co.ke
2. **Create App:** Get Consumer Key and Consumer Secret
3. **Register URLs:**
   - Callback URL: `https://yourdomain.com/api/mpesa/callback`
   - Confirmation URL: `https://yourdomain.com/api/mpesa/callback`
4. **Update .env:**
   ```
   MPESA_CONSUMER_KEY=your_consumer_key
   MPESA_CONSUMER_SECRET=your_consumer_secret
   MPESA_SHORTCODE=your_shortcode
   MPESA_PASSKEY=your_passkey
   MPESA_ENVIRONMENT=production
   ```

---

## 🌐 Deployment Platforms

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Configure Environment Variables:**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add all variables from `.env`

4. **Set Production URL:**
   ```bash
   vercel --prod
   ```

### Option 2: Netlify

1. **Install Netlify CLI:**
   ```bash
   npm i -g netlify-cli
   ```

2. **Deploy:**
   ```bash
   netlify deploy
   ```

3. **Configure Environment Variables:**
   - Go to Netlify Dashboard → Site Settings → Environment Variables
   - Add all variables from `.env`

4. **Production Deployment:**
   ```bash
   netlify deploy --prod
   ```

### Option 3: Custom Server (VPS/Cloud)

1. **Build Application:**
   ```bash
   npm run build
   ```

2. **Start Production Server:**
   ```bash
   npm start
   ```

3. **Use Process Manager (PM2):**
   ```bash
   npm i -g pm2
   pm2 start npm --name "tasklynk" -- start
   pm2 save
   pm2 startup
   ```

---

## 🧪 Testing Before Production

### Test Payment Integration

1. **Paystack Test Mode:**
   - Use test keys: `sk_test_xxx` and `pk_test_xxx`
   - Test cards: https://paystack.com/docs/payments/test-payments

2. **M-Pesa Sandbox:**
   - Set `MPESA_ENVIRONMENT=sandbox`
   - Use sandbox credentials from Daraja

### Test All User Roles

1. **Admin Login:** `/admin-login`
   - Email: topwriteessays@gmail.com
   - Password: kemoda2025

2. **Client Registration:** `/register` → Select "Client"
3. **Freelancer Registration:** `/register` → Select "Freelancer"

### Test Key Features

- ✅ User registration and approval
- ✅ Job posting and management
- ✅ Bid placement
- ✅ Job assignment
- ✅ File upload/download
- ✅ Messaging system
- ✅ Payment processing (Paystack + M-Pesa)
- ✅ Notifications
- ✅ Rating system

---

## 🔧 Post-Deployment Configuration

### 1. Domain Setup

Update all callback URLs in:
- Paystack Dashboard
- M-Pesa Daraja Portal
- `.env` → `NEXT_PUBLIC_APP_URL`

### 2. SSL Certificate

Ensure HTTPS is enabled (automatic on Vercel/Netlify)

### 3. Email Configuration

Configure Resend:
- Add verified sender domain
- Configure DKIM/SPF records
- Test email delivery

### 4. Monitor Logs

- Check Vercel/Netlify deployment logs
- Monitor API errors
- Track payment webhook responses

---

## 🐛 Common Issues & Solutions

### Issue 1: Paystack Payment Not Working

**Solution:**
- Verify `PAYSTACK_PUBLIC_KEY` is set correctly in `.env`
- Check browser console for Paystack script loading errors
- Ensure callback URL is whitelisted in Paystack dashboard

### Issue 2: M-Pesa Payment Failing

**Solution:**
- Verify `MPESA_ENVIRONMENT` matches your credentials (sandbox vs production)
- Check callback URL is accessible publicly
- Ensure Safaricom credentials are active

### Issue 3: Database Connection Error

**Solution:**
- Verify `TURSO_CONNECTION_URL` and `TURSO_AUTH_TOKEN`
- Check Turso dashboard for database status
- Run `npm run db:push` to sync schema

### Issue 4: Email Not Sending

**Solution:**
- Verify `RESEND_API_KEY` is correct
- Check email sender is verified in Resend
- Review Resend logs for delivery status

### Issue 5: User Cannot Upload Files

**Solution:**
- Check file size limits (default: 10MB)
- Verify Supabase storage bucket permissions
- Test with smaller files first

---

## 📊 Monitoring & Maintenance

### Performance Monitoring

- Set up Vercel Analytics (automatic on Vercel)
- Monitor API response times
- Track payment success rates

### Database Backups

- Turso provides automatic backups
- Export data regularly via Turso CLI
- Test restore procedures

### Security Updates

- Keep dependencies updated: `npm update`
- Review security advisories: `npm audit`
- Rotate API keys periodically

---

## 🎯 Production Checklist

Before going live, verify:

- [ ] All environment variables configured
- [ ] Database schema migrated
- [ ] Admin accounts seeded
- [ ] Payment gateways tested (sandbox mode)
- [ ] SSL certificate active
- [ ] Domain DNS configured
- [ ] Email delivery working
- [ ] File upload/download functional
- [ ] All user roles tested
- [ ] Webhook URLs configured
- [ ] Error logging enabled
- [ ] Backup strategy in place

---

## 📞 Support

For deployment assistance:
- **Email:** tasklynk01@gmail.com
- **Phone:** +254701066845, +254702794172

---

## 🔄 Updates & Maintenance

### Updating Application

```bash
git pull origin main
npm install
npm run build
```

### Database Migrations

```bash
npm run db:push
```

### Rollback Strategy

1. Keep previous deployment tagged
2. Use Vercel instant rollback feature
3. Restore database from backup if needed

---

**Last Updated:** October 30, 2025
**Version:** 1.0.0
