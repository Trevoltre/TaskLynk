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
    QUERY_URL: `${BASE_URL}/mpesa/stkpushquery/v1/query`,
  } as const;
};

// Prefer MPESA_BUSINESS_SHORTCODE if set, otherwise fall back to MPESA_SHORTCODE, then new Paybill default 880100
const BUSINESS_SHORT_CODE = process.env.MPESA_BUSINESS_SHORTCODE || process.env.MPESA_SHORTCODE || '880100';
const PASSKEY = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
// Force sandbox when using known sandbox shortcode/passkey to avoid env mismatch
const FORCED_SANDBOX = BUSINESS_SHORT_CODE === '174379' || PASSKEY === 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkoutRequestId } = body;

    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: 'Checkout request ID is required' },
        { status: 400 }
      );
    }

    console.log('Querying M-Pesa status for:', checkoutRequestId);

    // Get access token with environment auto-fallback (tolerate common misspelling of secret)
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET || (process.env as any).MPESA_CONSUMER_SECRETE;
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

    // Generate timestamp
    const timestamp = new Date().toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14);

    // Generate password
    const password = Buffer.from(`${BUSINESS_SHORT_CODE}${PASSKEY}${timestamp}`).toString('base64');

    // Query STK Push status
    const queryPayload = {
      BusinessShortCode: BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    };

    console.log('Querying STK status:', { CheckoutRequestID: checkoutRequestId, environmentUsed: usingEnv });

    const { QUERY_URL } = resolveMpesaConfig(usingEnv);
    const queryResponse = await fetch(QUERY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queryPayload)
    });

    const queryData = await queryResponse.json();
    console.log('Query response:', queryData);

    // Check for successful payment (ResultCode === '0' or '0' as string)
    const resultCode = String(queryData.ResultCode || '');
    
    if (resultCode === '0') {
      console.log('✅ Payment confirmed by M-Pesa');
      
      // Update payment record to confirmed and mark job as paid
      const [payment] = await db.select()
        .from(payments)
        .where(eq(payments.mpesaCheckoutRequestId, checkoutRequestId))
        .limit(1);

      if (payment) {
        console.log('Updating payment record:', payment.id);
        
        await db.update(payments)
          .set({
            status: 'completed',
            confirmedByAdmin: true,
            mpesaReceiptNumber: (queryData.CallbackMetadata?.Item || []).find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value || null,
            updatedAt: new Date().toISOString()
          })
          .where(eq(payments.id, payment.id));

        // Also mark the related job as payment confirmed (unlocks downloads immediately)
        await db.update(jobs)
          .set({
            paymentConfirmed: true,
            updatedAt: new Date().toISOString()
          })
          .where(eq(jobs.id, payment.jobId));
      }
    }

    // Helpful hint for common misconfigurations
    const hint = (queryData.errorMessage || queryData.ResponseDescription || '').toString().includes('Invalid Access Token')
      ? `Hint: Your MPESA_ENVIRONMENT might be set to ${preferredEnv} while your Consumer Key/Secret belong to ${altEnv}.`
      : (FORCED_SANDBOX ? 'Using sandbox test shortcode/passkey forces sandbox environment.' : undefined);

    return NextResponse.json({
      ...queryData,
      status: resultCode === '0' ? 'completed' : 'pending',
      environmentUsed: usingEnv,
      hint,
    });

  } catch (error: any) {
    console.error('M-Pesa query error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to query payment status',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}