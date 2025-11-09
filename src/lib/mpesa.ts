/**
 * M-Pesa Daraja API Integration
 * Handles STK Push requests and callbacks with robust error handling
 */

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  businessShortCode: string;
  passkey: string;
  callbackUrl: string;
  environment: 'sandbox' | 'production';
}

export interface STKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MpesaCallbackData {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: {
    Item: Array<{
      Name: string;
      Value: string | number;
    }>;
  };
}

/**
 * Get M-Pesa access token with retry logic
 */
export async function getMpesaToken(config: MpesaConfig): Promise<string> {
  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
  
  const url = config.environment === 'production'
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  console.log('Requesting M-Pesa token from:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('M-Pesa token error:', response.status, errorText);
      throw new Error(`Failed to get M-Pesa token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.access_token) {
      console.error('No access token in response:', data);
      throw new Error('M-Pesa did not return an access token');
    }

    console.log('M-Pesa token obtained successfully');
    return data.access_token;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('M-Pesa token request timed out. Please try again.');
    }
    throw error;
  }
}

/**
 * Format phone number to M-Pesa format (254XXXXXXXXX)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove spaces, dashes, and other characters
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Remove leading +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Convert 07XX to 2547XX or 01XX to 2541XX
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  
  // Ensure it starts with 254
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  console.log('Formatted phone number:', { input: phone, output: cleaned });
  return cleaned;
}

/**
 * Generate M-Pesa password
 */
export function generatePassword(shortCode: string, passkey: string, timestamp: string): string {
  const data = shortCode + passkey + timestamp;
  return Buffer.from(data).toString('base64');
}

/**
 * Get timestamp in M-Pesa format (YYYYMMDDHHmmss)
 */
export function getTimestamp(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Initiate STK Push with comprehensive error handling
 */
export async function initiateSTKPush(
  config: MpesaConfig,
  request: STKPushRequest
): Promise<STKPushResponse> {
  console.log('Starting STK Push initiation...');
  
  try {
    // Get access token
    const token = await getMpesaToken(config);
    const timestamp = getTimestamp();
    const password = generatePassword(config.businessShortCode, config.passkey, timestamp);
    const formattedPhone = formatPhoneNumber(request.phoneNumber);

    // Validate phone number after formatting
    if (!formattedPhone.match(/^254[17]\d{8}$/)) {
      throw new Error(`Invalid phone number format after formatting: ${formattedPhone}`);
    }

    const url = config.environment === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    const payload = {
      BusinessShortCode: config.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.floor(request.amount), // M-Pesa requires integer
      PartyA: formattedPhone,
      PartyB: config.businessShortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: config.callbackUrl,
      AccountReference: request.accountReference,
      TransactionDesc: request.transactionDesc,
    };

    console.log('STK Push payload:', {
      ...payload,
      Password: '***HIDDEN***',
      Amount: payload.Amount,
      PhoneNumber: payload.PhoneNumber,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseData = await response.json();
    console.log('STK Push response:', responseData);

    if (!response.ok) {
      const errorMessage = responseData.errorMessage || responseData.errorCode || response.statusText;
      console.error('STK Push failed:', response.status, errorMessage);
      throw new Error(`STK Push failed: ${errorMessage}`);
    }

    // Check for error response even with 200 status
    if (responseData.errorCode || responseData.errorMessage) {
      console.error('STK Push returned error:', responseData);
      throw new Error(responseData.errorMessage || `Error code: ${responseData.errorCode}`);
    }

    // Validate required fields in response
    if (!responseData.CheckoutRequestID || !responseData.MerchantRequestID) {
      console.error('Invalid STK Push response:', responseData);
      throw new Error('M-Pesa did not return required transaction IDs');
    }

    console.log('STK Push initiated successfully:', {
      CheckoutRequestID: responseData.CheckoutRequestID,
      MerchantRequestID: responseData.MerchantRequestID,
    });

    return responseData;
  } catch (error: any) {
    console.error('STK Push error:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('STK Push request timed out. Please try again.');
    }
    
    if (error.message?.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    
    throw error;
  }
}

/**
 * Query STK Push status
 */
export async function querySTKPushStatus(
  config: MpesaConfig,
  checkoutRequestId: string
): Promise<any> {
  const token = await getMpesaToken(config);
  const timestamp = getTimestamp();
  const password = generatePassword(config.businessShortCode, config.passkey, timestamp);

  const url = config.environment === 'production'
    ? 'https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query'
    : 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query';

  const payload = {
    BusinessShortCode: config.businessShortCode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Parse M-Pesa callback data
 */
export function parseCallbackData(callbackData: MpesaCallbackData) {
  if (!callbackData.CallbackMetadata) {
    return null;
  }

  const metadata = callbackData.CallbackMetadata.Item.reduce((acc, item) => {
    acc[item.Name] = item.Value;
    return acc;
  }, {} as Record<string, string | number>);

  return {
    amount: metadata.Amount as number,
    mpesaReceiptNumber: metadata.MpesaReceiptNumber as string,
    transactionDate: metadata.TransactionDate as string,
    phoneNumber: metadata.PhoneNumber as string,
  };
}