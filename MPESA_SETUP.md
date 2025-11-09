# M-Pesa STK Push Integration Setup Guide

## Overview
This guide will walk you through setting up the M-Pesa STK Push integration for TaskLynk. The integration enables automatic payment collection from customers via M-Pesa without manual Paybill entry.

## What You've Already Received
Your M-Pesa Consumer Key: `egxCXVqJyAE103ul6kbJq49eJqHN6K4EDLwAG01zDIy8FUrs`

## What You Need from Safaricom

### 1. Get Your M-Pesa Credentials
Visit the Safaricom Daraja Portal: https://developer.safaricom.co.ke

**You Need:**
- ✅ Consumer Key (You already have this)
- ⏳ Consumer Secret
- ⏳ Business Shortcode (Your Paybill/Pochi number)
- ⏳ Passkey (Lipa Na M-Pesa Online Passkey)

### 2. How to Get Consumer Secret
1. Log in to https://developer.safaricom.co.ke
2. Go to your App dashboard
3. Find your Consumer Secret (it's paired with your Consumer Key)

### 3. How to Get Business Shortcode
This is your M-Pesa business number:
- **Paybill**: 6-7 digit number
- **Till Number**: 6-7 digit number  
- **Pochi La Biashara**: Your phone number (e.g., 0701066845)

For Pochi, use: `0701066845` (remove the leading 0 for shortcode: `701066845`)

### 4. How to Get Passkey
1. Log in to Daraja portal
2. Go to "Lipa Na M-Pesa Online" section
3. Navigate to "Sandbox" or "Production" 
4. Copy the Passkey (long alphanumeric string)

## Environment Variables Setup

Add these to your `.env` file:

```bash
# M-Pesa Configuration
MPESA_CONSUMER_KEY=egxCXVqJyAE103ul6kbJq49eJqHN6K4EDLwAG01zDIy8FUrs
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_SHORTCODE=701066845
MPESA_PASSKEY=your_passkey_here
MPESA_ENVIRONMENT=sandbox

# Your application URL (for callbacks)
NEXT_PUBLIC_APP_URL=https://tasklynk.co.ke
```

### For Testing (Sandbox)
```bash
MPESA_ENVIRONMENT=sandbox
# Use sandbox shortcode: 174379
MPESA_SHORTCODE=174379
# Use sandbox passkey from Daraja portal
```

### For Production (Go Live)
```bash
MPESA_ENVIRONMENT=production
# Use your actual business shortcode
MPESA_SHORTCODE=701066845
# Use production passkey from Daraja portal
```

## Database Migration

The payments table has been updated with M-Pesa fields. Run this migration:

```bash
npm run db:push
```

New fields added to `payments` table:
- `mpesaCheckoutRequestId` - Tracks STK Push request
- `mpesaMerchantRequestId` - M-Pesa transaction reference
- `mpesaReceiptNumber` - M-Pesa confirmation code
- `mpesaTransactionDate` - When payment was completed
- `mpesaResultDesc` - Payment result description
- `phoneNumber` - Customer's phone number
- `confirmedAt` - When payment was confirmed

## How It Works

### 1. Customer Payment Flow
1. Customer clicks "Pay Now" on delivered order
2. M-Pesa Payment Dialog opens
3. Customer enters their M-Pesa phone number (e.g., 0712345678)
4. Customer clicks "Send M-Pesa Prompt"
5. **STK Push sent to customer's phone**
6. Customer enters M-Pesa PIN on their phone
7. Payment is processed automatically

### 2. Backend Process
```
Client → Frontend → /api/mpesa/initiate → Daraja API → STK Push to Phone
                                                              ↓
Customer Enters PIN ← Phone Prompt ← Safaricom ← STK Request
                ↓
        Payment Confirmed
                ↓
Safaricom → /api/mpesa/callback → Update Database → Unlock Files
```

### 3. Callback URL Configuration
Your callback URL must be registered with Safaricom:

**Callback URL:** `https://tasklynk.co.ke/api/mpesa/callback`

**Requirements:**
- Must be HTTPS (SSL certificate required)
- Must be publicly accessible
- Must respond within 30 seconds

**For Local Testing:**
Use ngrok or similar tool:
```bash
ngrok http 3000
# Use the ngrok URL: https://xxxxx.ngrok.io/api/mpesa/callback
```

## API Endpoints Created

### 1. Initiate STK Push
**POST** `/api/mpesa/initiate`

Request:
```json
{
  "phoneNumber": "0712345678",
  "amount": 5000,
  "paymentId": 123,
  "jobTitle": "Research Paper"
}
```

Response:
```json
{
  "success": true,
  "message": "Success. Request accepted for processing",
  "checkoutRequestId": "ws_CO_191220191020363925",
  "merchantRequestId": "92893-83119138-1"
}
```

### 2. M-Pesa Callback
**POST** `/api/mpesa/callback`

Safaricom sends payment results here. Automatically:
- Updates payment status
- Marks payment as confirmed
- Unlocks files for download
- Credits freelancer balance

### 3. Query Transaction Status
**POST** `/api/mpesa/query`

Request:
```json
{
  "checkoutRequestId": "ws_CO_191220191020363925"
}
```

## Testing in Sandbox

### Test Credentials
Safaricom provides test phone numbers for sandbox:

**Test Phone Number:** `254708374149`
**Test Amount:** Any amount
**Test PIN:** `1234` (for sandbox)

### Testing Steps
1. Set `MPESA_ENVIRONMENT=sandbox` in `.env`
2. Use shortcode `174379`
3. Use sandbox passkey from Daraja
4. Test with Safaricom test numbers
5. Verify callback is received

## Going Live (Production)

### Pre-Launch Checklist
- [ ] Apply for production access on Daraja portal
- [ ] Verify your business with Safaricom
- [ ] Get production Consumer Key & Secret
- [ ] Get production Passkey
- [ ] Ensure your website has valid SSL certificate
- [ ] Configure production callback URL
- [ ] Update `.env` with production credentials
- [ ] Test with small real transaction

### Production URLs
- **OAuth:** `https://api.safaricom.co.ke/oauth/v1/generate`
- **STK Push:** `https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest`
- **Query:** `https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query`

## Security Best Practices

1. **Never expose credentials in frontend code**
   - All M-Pesa operations happen server-side
   - Environment variables are server-only

2. **Validate callback requests**
   - Verify IP whitelist from Safaricom
   - Check transaction IDs match

3. **Handle failures gracefully**
   - User cancels payment
   - Insufficient funds
   - Network timeouts

4. **Log all transactions**
   - Keep audit trail
   - Monitor for suspicious activity

## Troubleshooting

### Common Issues

**Issue:** "Invalid Access Token"
- **Solution:** Check Consumer Key/Secret are correct
- **Solution:** Ensure you're using correct environment (sandbox/prod)

**Issue:** "Invalid Shortcode"
- **Solution:** Verify Business Shortcode matches your M-Pesa account
- **Solution:** For Pochi, use phone number without leading 0

**Issue:** "Callback not received"
- **Solution:** Ensure callback URL is HTTPS
- **Solution:** Check URL is publicly accessible
- **Solution:** Verify URL is registered with Safaricom

**Issue:** "Request timeout"
- **Solution:** User must enter PIN within 30 seconds
- **Solution:** Check network connectivity

### Support Contacts
- **Safaricom Support:** developers@safaricom.co.ke
- **Daraja Portal:** https://developer.safaricom.co.ke
- **Documentation:** https://developer.safaricom.co.ke/Documentation

## Next Steps

1. **Get Missing Credentials**
   - Log in to Daraja portal
   - Retrieve Consumer Secret and Passkey
   
2. **Update Environment Variables**
   - Add all credentials to `.env`
   - Restart your application

3. **Test in Sandbox**
   - Use test phone numbers
   - Verify full payment flow

4. **Apply for Production**
   - Complete business verification
   - Switch to production credentials

5. **Go Live**
   - Update environment to production
   - Monitor transactions closely

## Additional Resources

- [Safaricom Daraja Documentation](https://developer.safaricom.co.ke/Documentation)
- [M-Pesa API Reference](https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate)
- [Postman Collection](https://developer.safaricom.co.ke/documentation)

---

**Need Help?**

Contact Safaricom Developer Support or refer to the Daraja portal documentation for detailed API specifications.
