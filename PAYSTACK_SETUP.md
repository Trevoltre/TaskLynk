# Paystack Payment Integration Guide

## Overview

TaskLynk now supports **Paystack** as the primary payment gateway, providing multiple payment options including M-PESA, M-PESA Till, Airtel Money, and Card payments for Kenyan customers.

## Features

✅ **Multiple Payment Methods:**
- M-PESA (Safaricom mobile money)
- M-PESA Till (Paybill)
- Airtel Money
- Debit/Credit Cards

✅ **Seamless Integration:**
- Beautiful payment selection UI
- Real-time payment verification
- Automatic payment confirmation
- Instant file unlocking after payment

✅ **Security:**
- PCI-DSS compliant
- Secure Paystack popup
- Backend payment verification
- Encrypted transactions

---

## Setup Instructions

### 1. Create Paystack Account

1. Go to [https://paystack.com](https://paystack.com)
2. Sign up for a Paystack account
3. Complete your business verification

### 2. Get API Keys

1. Log in to your Paystack Dashboard
2. Go to **Settings** → **API Keys & Webhooks**
3. Copy your **Public Key** (`pk_live_...`) and **Secret Key** (`sk_live_...`)
4. For testing, use **Test Keys** (`pk_test_...` and `sk_test_...`)

### 3. Configure Environment Variables

Add the following to your `.env` file:

```env
# Paystack API Credentials
PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_public_key_here
```

**Important:**
- The **Public Key** must have the `NEXT_PUBLIC_` prefix to be accessible on the client side
- Keep the **Secret Key** secure and never expose it in client-side code

### 4. Update Callback URLs

In your Paystack Dashboard:

1. Go to **Settings** → **API Keys & Webhooks**
2. Set **Callback URL** to: `https://yourdomain.com/api/paystack/verify`
3. Enable webhook events for: `charge.success` and `charge.failed`

---

## How It Works

### Payment Flow

1. **Client clicks "Pay Now"** on job detail page
2. **Payment dialog opens** with 4 payment options:
   - M-PESA
   - M-PESA Till
   - Airtel Money
   - Card

3. **Client selects payment method** and enters:
   - Email address (required)
   - Phone number (required for mobile money, optional for cards)

4. **Paystack popup opens** with the selected payment channel:
   - For mobile money: Client enters phone number and PIN
   - For cards: Client enters card details

5. **Payment is processed** and verified:
   - Payment record created in database with status `processing`
   - Paystack processes the payment
   - Callback verifies payment on backend
   - Payment status updated to `confirmed`
   - Job payment confirmed
   - Freelancer balance updated
   - Files unlocked for download

6. **Success feedback:**
   - Success message with receipt number
   - Files immediately available
   - Dialog auto-closes after 4 seconds

---

## Integration Details

### Frontend Component

The payment dialog is located at:
```
src/components/intasend-payment-dialog.tsx
```

**Key Features:**
- Loads Paystack SDK dynamically
- Multiple payment method selection
- Phone number validation (Kenyan format)
- Email validation
- Real-time payment status polling
- 2-minute timeout with countdown timer
- Success/failure screens with retry option

### Backend API Routes

**1. Payment Creation:**
```
POST /api/payments
```
Creates a payment record with status `processing` (for direct/Paystack) or `pending` (for pochi)

**2. Payment Verification:**
```
POST /api/paystack/verify
```
Verifies payment with Paystack API and updates:
- Payment status to `confirmed`
- Job `paymentConfirmed` to `true`
- Freelancer balance increased
- Payment receipt stored

### Database Schema

The `payments` table includes:
```sql
- status: 'pending' | 'processing' | 'confirmed' | 'failed'
- paystackReference: Paystack transaction reference
- mpesaReceiptNumber: M-PESA receipt (if mobile money)
- confirmedByAdmin: 1 (auto-confirmed by Paystack)
- phoneNumber: Client's phone number
- email: Client's email address
```

---

## Payment Methods Explained

### 1. M-PESA (Direct)
- **What it is:** Safaricom M-PESA STK Push
- **How it works:** Client receives instant payment prompt on their phone
- **Best for:** Quick, instant payments
- **Channel:** `mobile_money`

### 2. M-PESA Till (Paybill)
- **What it is:** M-PESA Paybill payment
- **How it works:** Client pays to Paybill number via M-PESA menu
- **Best for:** Manual payments, clients who prefer traditional M-PESA
- **Channel:** `mobile_money`

### 3. Airtel Money
- **What it is:** Airtel mobile money
- **How it works:** Client pays using Airtel Money
- **Best for:** Airtel subscribers
- **Channel:** `mobile_money`

### 4. Card
- **What it is:** Debit/Credit card payment
- **How it works:** Client enters card details in Paystack popup
- **Best for:** International payments, card holders
- **Channel:** `card`

---

## Testing

### Test Mode

1. Use test API keys:
```env
PAYSTACK_SECRET_KEY=sk_test_your_test_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_test_key
```

2. **Test Cards:**
- **Successful payment:** `5060666666666666666` (CVV: 123, Expiry: any future date)
- **Failed payment:** `5060666666666666667` (CVV: 123, Expiry: any future date)

3. **Test Mobile Money:**
- Phone: Use `08012345678` or any valid format
- PIN: Enter any 4-digit PIN

### Live Mode

1. Switch to live API keys:
```env
PAYSTACK_SECRET_KEY=sk_live_your_live_key
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_live_key
```

2. Test with real payments (small amounts first)

---

## Troubleshooting

### Payment Not Verifying

**Problem:** Payment successful but not confirmed in system

**Solutions:**
1. Check Paystack webhook settings
2. Verify callback URL is correct
3. Check server logs for verification errors
4. Ensure PAYSTACK_SECRET_KEY is set correctly

### Paystack Popup Not Opening

**Problem:** "Paystack is not loaded" error

**Solutions:**
1. Check internet connection
2. Verify Paystack script is loading: `https://js.paystack.co/v1/inline.js`
3. Check browser console for errors
4. Try refreshing the page

### Phone Number Validation Error

**Problem:** "Invalid phone number" error

**Solutions:**
1. Ensure format: `0712345678` or `0112345678`
2. Remove country code (+254)
3. No spaces or special characters

### Payment Timeout

**Problem:** Payment times out after 2 minutes

**Solutions:**
1. Complete payment faster (mobile money prompts expire)
2. Check if STK Push was sent
3. Verify phone number is correct
4. Try again with different method

---

## Security Best Practices

1. **Never expose Secret Key:**
   - Keep `PAYSTACK_SECRET_KEY` server-side only
   - Only use `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` for client

2. **Verify all payments on backend:**
   - Always verify with Paystack API before confirming
   - Don't trust client-side verification alone

3. **Use HTTPS in production:**
   - Paystack requires HTTPS for live payments
   - Set up SSL certificate for your domain

4. **Monitor webhook logs:**
   - Check Paystack dashboard for webhook delivery status
   - Set up alerts for failed webhooks

5. **Rotate API keys periodically:**
   - Generate new keys every few months
   - Revoke old keys after transition

---

## Support

### Paystack Support
- **Documentation:** [https://paystack.com/docs](https://paystack.com/docs)
- **Email:** support@paystack.com
- **Dashboard:** [https://dashboard.paystack.com](https://dashboard.paystack.com)

### Common Issues
- Check Paystack status page: [https://status.paystack.com](https://status.paystack.com)
- Review integration checklist in dashboard
- Test with small amounts first

---

## Migration from Old System

If migrating from the old M-PESA/IntaSend system:

1. **Backup database** before making changes
2. **Test thoroughly** in test mode
3. **Update environment variables** with Paystack keys
4. **Notify users** of new payment options
5. **Monitor** first few transactions closely

The system maintains backward compatibility with the old payment flow for existing pending payments.

---

## API Reference

### Create Payment

**Endpoint:** `POST /api/payments`

**Request Body:**
```json
{
  "jobId": 123,
  "clientId": 45,
  "freelancerId": 67,
  "amount": 1500.00,
  "phoneNumber": "0712345678",
  "email": "client@example.com",
  "paymentMethod": "direct"
}
```

**Response:**
```json
{
  "id": 789,
  "status": "processing",
  "amount": 1500.00,
  "createdAt": "2025-10-30T12:00:00Z"
}
```

### Verify Payment

**Endpoint:** `POST /api/paystack/verify`

**Request Body:**
```json
{
  "reference": "TL_123_789_1730289600000",
  "paymentId": 789,
  "jobId": 123
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Payment verified and updated successfully",
  "data": {
    "paymentId": 789,
    "reference": "TL_123_789_1730289600000",
    "amount": 1500.00,
    "channel": "mobile_money",
    "paidAt": "2025-10-30T12:05:00Z"
  }
}
```

---

## Conclusion

Paystack integration provides a robust, secure, and user-friendly payment experience for TaskLynk users. The system supports multiple payment methods, automatic verification, and seamless integration with the existing job workflow.

For any questions or issues, contact TaskLynk support or refer to the Paystack documentation.

**Happy payments! 🎉**