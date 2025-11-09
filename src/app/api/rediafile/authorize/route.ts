import { NextResponse } from 'next/server';

const REDIAFILE_API_URL = "https://apps.rediafile.com/api/v2/";
const KEY1 = process.env.REDIAFILE_KEY1 || "CCHpAitHtboY3wI1Fa40eqaEM1ktUmQq7R7Yk0hrGbSEZpQYA2XLhqQJOXQ67iei";
const KEY2 = process.env.REDIAFILE_KEY2 || "LwfbwlIGSxv3b1ddCcfTuvRI7gmVaOVcZzMWqbhEjhH2VcY8ncB7otoYN6DFhfMJ";

export async function POST() {
  try {
    const response = await fetch(`${REDIAFILE_API_URL}authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        key1: KEY1,
        key2: KEY2,
      }),
    });

    const data = await response.json();

    if (data._status !== "success") {
      return NextResponse.json(
        { error: 'Authorization failed', details: data._response },
        { status: 401 }
      );
    }

    return NextResponse.json({
      accessToken: data.data.access_token,
      accountId: data.data.account_id,
    });
  } catch (error) {
    console.error('Rediafile authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to authorize with Rediafile' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
