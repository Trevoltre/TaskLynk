import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, jobs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

// Helper to resolve env-specific URLs on demand
const resolveMpesaConfig = (env: 'sandbox' | 'production') => {
  const BASE_URL = env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  return {
    env,
    BASE_URL,
    OAUTH_URL: `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    STK_PUSH_URL: `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
  } as const;
};

// Prefer MPESA_BUSINESS_SHORTCODE if set, otherwise fall back to MPESA_SHORTCODE, then new Paybill default 880100
const BUSINESS_SHORT_CODE = process.env.MPESA_BUSINESS_SHORTCODE || process.env.MPESA_SHORTCODE || '880100';
const PASSKEY = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'https://tasklynk.co.ke'}/api/mpesa/callback`;
// New account reference for CBA account (can be overridden via env)
const ACCOUNT_REFERENCE = process.env.MPESA_ACCOUNT || '9749760017';

// If using sandbox defaults (shortcode 174379 or the known sandbox passkey), force sandbox to avoid prod token/shortcode mismatch
const FORCED_SANDBOX = BUSINESS_SHORT_CODE === '174379' || PASSKEY === 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, amount, jobId, userId } = body;

    // Validate required fields
    if (!phone || !amount || !jobId || !userId) {
      console.error('Missing required fields:', { phone: !!phone, amount: !!amount, jobId: !!jobId, userId: !!userId });
      return NextResponse.json(
        { error: 'Missing required fields: phone, amount, jobId, userId' },
        { status: 400 }
      );
    }

    // Verify job exists and get freelancer ID
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) {
      console.error('Job not found:', jobId);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Format phone number (remove leading 0 or +254, then add 254)
    let formattedPhone = phone.replace(/\s+/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('254')) {
      // Already formatted
    } else {
      formattedPhone = '254' + formattedPhone;
    }

    console.log('Formatted phone:', formattedPhone);

    // Get access token with environment auto-fallback
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET || (process.env as any).MPESA_CONSUMER_SECRETE; // tolerate common misspelling
    if (!consumerKey || !consumerSecret) {
      console.error('Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET');
      return NextResponse.json(
        { error: 'M-Pesa credentials not configured', details: 'Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET' },
        { status: 500 }
      );
    }

    const preferredEnv: 'sandbox' | 'production' = FORCED_SANDBOX
      ? 'sandbox'
      : (process.env.MPESA_ENVIRONMENT === 'production' ? 'production' : 'sandbox');
    const altEnv: 'sandbox' | 'production' = preferredEnv === 'production' ? 'sandbox' : 'production';

    const fetchToken = async (env: 'sandbox' | 'production') => {
      const { OAUTH_URL } = resolveMpesaConfig(env);
      const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const res = await fetch(OAUTH_URL, { method: 'GET', headers: { Authorization: `Basic ${authHeader}`, Accept: 'application/json' } });
      return res;
    };

    let usingEnv: 'sandbox' | 'production' = preferredEnv;
    let tokenResponse = await fetchToken(preferredEnv);

    if (!tokenResponse.ok) {
      // If auth failed (401/403) and not forced sandbox, try alternate environment automatically
      if (!FORCED_SANDBOX && (tokenResponse.status === 401 || tokenResponse.status === 403)) {
        console.warn(`Token fetch failed on ${preferredEnv}. Trying ${altEnv}...`);
        const retry = await fetchToken(altEnv);
        if (retry.ok) {
          tokenResponse = retry;
          usingEnv = altEnv;
        }
      }
    }

    if (!tokenResponse.ok) {
      let errorData: any = null;
      try { errorData = await tokenResponse.json(); } catch {}
      console.error('Failed to get M-PESA access token:', errorData || tokenResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to authenticate with M-Pesa', details: errorData || tokenResponse.statusText },
        { status: 500 }
      );
    }

    const { access_token } = await tokenResponse.json();

    // Generate timestamp (YYYYMMDDHHmmss)
    const timestamp = new Date().toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14);

    // Generate password (Base64 encoded: Shortcode + Passkey + Timestamp)
    const password = Buffer.from(`${BUSINESS_SHORT_CODE}${PASSKEY}${timestamp}`).toString('base64');

    // Updated transaction description for CBA account
    const transactionDesc = 'TaskLynk Payment to CBA Account';

    // STK Push request payload
    const stkPayload = {
      BusinessShortCode: BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount), // M-Pesa requires integer
      PartyA: formattedPhone,
      PartyB: BUSINESS_SHORT_CODE,
      PhoneNumber: formattedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: ACCOUNT_REFERENCE,
      TransactionDesc: transactionDesc
    };

    console.log('Sending STK Push:', {
      ...stkPayload,
      Password: '[HIDDEN]',
      CallBackURL: CALLBACK_URL,
      environmentUsed: usingEnv,
    });

    const sendStk = async (env: 'sandbox' | 'production', token: string) => {
      const { STK_PUSH_URL } = resolveMpesaConfig(env);
      const res = await fetch(STK_PUSH_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(stkPayload)
      });
      let data: any = null;
      try { data = await res.json(); } catch { data = null; }
      return { res, data } as const;
    };

    // Send STK Push request to the resolved environment
    let { res: stkResponse, data: stkData } = await sendStk(usingEnv, access_token);

    // If we got an invalid token response, try alternate environment automatically (full re-auth + resend) when not forced sandbox
    const isInvalidToken = (resp: Response, data: any) => resp.status === 401 || String(data?.errorMessage || data?.ResponseDescription || '').includes('Invalid Access Token');

    if (!FORCED_SANDBOX && (!stkResponse.ok && isInvalidToken(stkResponse, stkData))) {
      console.warn(`STK push on ${usingEnv} returned Invalid Access Token. Retrying on ${altEnv}...`);
      const altTokenRes = await fetchToken(altEnv);
      if (altTokenRes.ok) {
        const { access_token: altToken } = await altTokenRes.json();
        usingEnv = altEnv;
        ({ res: stkResponse, data: stkData } = await sendStk(usingEnv, altToken));
      }
    }

    console.log('STK Push response:', stkData);

    if (!stkResponse.ok || stkData?.ResponseCode !== '0') {
      console.error('STK Push failed:', stkData);
      // Provide a helpful hint for common misconfigurations
      const hint = (stkData?.errorMessage || stkData?.ResponseDescription || '')
        .toString()
        .includes('Invalid Access Token')
        ? `Hint: Your MPESA_ENVIRONMENT might be set to ${process.env.MPESA_ENVIRONMENT || 'sandbox'} while your Consumer Key/Secret belong to ${process.env.MPESA_ENVIRONMENT === 'production' ? 'sandbox' : 'production'}.`
        : (FORCED_SANDBOX ? 'Using sandbox test shortcode/passkey forces sandbox environment.' : undefined);
      return NextResponse.json(
        { 
          error: 'Failed to initiate M-Pesa payment',
          details: stkData?.errorMessage || stkData?.ResponseDescription || 'Unknown error',
          code: stkData?.ResponseCode,
          environmentUsed: usingEnv,
          hint,
        },
        { status: 400 }
      );
    }

    // Create pending payment record with correct field names from schema
    const [payment] = await db.insert(payments).values({
      jobId,
      clientId: userId,
      freelancerId: job.assignedFreelancerId || null,
      amount: parseFloat(amount.toString()),
      paymentMethod: 'mpesa',
      status: 'pending',
      mpesaCheckoutRequestId: stkData.CheckoutRequestID,
      mpesaMerchantRequestId: stkData.MerchantRequestID,
      phoneNumber: formattedPhone,
      confirmedByAdmin: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();

    console.log('Payment record created:', payment);

    return NextResponse.json({
      success: true,
      message: 'STK Push sent successfully',
      checkoutRequestId: stkData.CheckoutRequestID,
      merchantRequestId: stkData.MerchantRequestID,
      paymentId: payment.id,
      responseCode: stkData.ResponseCode,
      responseDescription: stkData.ResponseDescription,
      environmentUsed: usingEnv,
    });

  } catch (error) {
    console.error('STK Push error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process M-Pesa payment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}