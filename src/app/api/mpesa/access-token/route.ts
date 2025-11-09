import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Helper to resolve env-specific URLs
const resolveMpesaConfig = (env: 'sandbox' | 'production') => {
  const BASE_URL = env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  return {
    env,
    OAUTH_URL: `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
  } as const;
};

export async function GET() {
  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET || (process.env as any).MPESA_CONSUMER_SECRETE; // tolerate common misspelling

    if (!consumerKey || !consumerSecret) {
      return NextResponse.json(
        { error: 'M-Pesa credentials not configured', details: 'Set MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET' },
        { status: 500 }
      );
    }

    const preferredEnv: 'sandbox' | 'production' = process.env.MPESA_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
    const altEnv: 'sandbox' | 'production' = preferredEnv === 'production' ? 'sandbox' : 'production';

    const fetchToken = async (env: 'sandbox' | 'production') => {
      const { OAUTH_URL } = resolveMpesaConfig(env);
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const response = await fetch(OAUTH_URL, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });
      return { response, env } as const;
    };

    // Try preferred environment first
    let { response, env } = await fetchToken(preferredEnv);

    // If unauthorized, try the alternate environment automatically
    if (!response.ok && (response.status === 401 || response.status === 403)) {
      const retry = await fetchToken(altEnv);
      if (retry.response.ok) {
        response = retry.response;
        env = retry.env;
      }
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error('M-Pesa auth error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get access token', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      environmentUsed: env,
    });
  } catch (error: any) {
    console.error('M-Pesa access token error:', error);
    return NextResponse.json(
      { error: 'Failed to authenticate with M-Pesa', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}