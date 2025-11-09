"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Wallet, Info, Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type MpesaPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  jobId: number;
  jobTitle: string;
  userId: number;
  freelancerId: number;
  onPaymentSuccess?: (reference: string) => void;
};

const PAYMENT_TIMEOUT = 120; // 2 minutes in seconds
const POLL_INTERVAL = 2000; // Poll every 2 seconds (reduced from 1 second for stability)

export function MpesaPaymentDialog({
  open,
  onOpenChange,
  amount,
  jobId,
  jobTitle,
  userId,
  freelancerId,
  onPaymentSuccess,
}: MpesaPaymentDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(PAYMENT_TIMEOUT);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const attemptCountRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  // Countdown timer for pending payments
  useEffect(() => {
    if (paymentStatus === 'pending') {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handlePaymentTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [paymentStatus]);

  const clearAllTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handlePaymentTimeout = () => {
    clearAllTimers();
    setPaymentStatus('failed');
    setErrorMessage('Payment request timed out after 2 minutes. The M-Pesa prompt may have expired.');
    toast.error('Payment Timeout!', {
      description: 'Payment was not completed within 2 minutes. Please try again and enter your PIN quickly.',
      duration: 10000,
    });
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.slice(0, 10);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Kenyan phone numbers: 07XX XXX XXX or 01XX XXX XXX
    const kenyanPhoneRegex = /^(07|01)\d{8}$/;
    return kenyanPhoneRegex.test(phone);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setErrorMessage('');
  };

  const pollPaymentStatus = async (paymentIdToPoll: number) => {
    attemptCountRef.current = 0;
    const maxAttempts = Math.ceil(PAYMENT_TIMEOUT / (POLL_INTERVAL / 1000)); // 60 attempts over 2 minutes

    pollRef.current = setInterval(async () => {
      attemptCountRef.current++;

      try {
        const response = await fetch(`/api/payments?jobId=${jobId}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        
        if (!response.ok) {
          console.error('Failed to fetch payment status:', response.statusText);
          return;
        }

        const payments = await response.json();
        const payment = payments.find((p: any) => p.id === paymentIdToPoll);

        if (!payment) {
          console.warn('Payment not found:', paymentIdToPoll);
          return;
        }

        console.log(`Payment status poll #${attemptCountRef.current}:`, {
          status: payment.status,
          confirmedByAdmin: payment.confirmedByAdmin,
          mpesaReceiptNumber: payment.mpesaReceiptNumber,
        });

        // Check for successful payment
        if (payment.status === 'confirmed' && payment.confirmedByAdmin === 1) {
          clearAllTimers();
          
          const receipt = payment.mpesaReceiptNumber || 'N/A';
          setReceiptNumber(receipt);
          setPaymentStatus('success');
          
          toast.success('🎉 Payment Successful!', {
            description: `Your payment of KES ${amount.toFixed(2)} has been confirmed. Receipt: ${receipt}`,
            duration: 10000,
          });

          if (onPaymentSuccess) {
            onPaymentSuccess(receipt);
          }

          // Auto-close after 4 seconds
          setTimeout(() => {
            onOpenChange(false);
            resetDialog();
          }, 4000);
        } 
        // Check for failed payment
        else if (payment.status === 'failed') {
          clearAllTimers();
          
          const failureReason = payment.mpesaResultDesc || 'Payment was declined or cancelled.';
          setPaymentStatus('failed');
          setErrorMessage(failureReason);
          
          toast.error('❌ Payment Failed!', {
            description: failureReason,
            duration: 10000,
          });
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }

      // Stop polling after max attempts
      if (attemptCountRef.current >= maxAttempts) {
        clearAllTimers();
      }
    }, POLL_INTERVAL);
  };

  const handlePayNow = async () => {
    // Validate phone number
    if (!validatePhoneNumber(phoneNumber)) {
      setErrorMessage('Please enter a valid Kenyan phone number (e.g., 0712345678 or 0112345678)');
      toast.error('Invalid Phone Number', {
        description: 'Please enter a valid Kenyan phone number starting with 07 or 01.',
        duration: 5000,
      });
      return;
    }

    // Validate amount
    if (!amount || amount <= 0) {
      setErrorMessage('Invalid payment amount. Please refresh and try again.');
      toast.error('Invalid Amount', {
        description: 'Payment amount must be greater than zero.',
        duration: 5000,
      });
      return;
    }

    setProcessing(true);
    setPaymentStatus('pending');
    setCountdown(PAYMENT_TIMEOUT);
    setErrorMessage('');
    setReceiptNumber('');

    console.log('Initiating M-Pesa payment:', {
      phoneNumber,
      amount,
      jobId,
      jobTitle,
      userId,
      freelancerId,
    });

    try {
      // Step 1: Create payment record in database
      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          clientId: userId,
          freelancerId,
          amount: parseFloat(amount.toFixed(2)), // Ensure amount is proper float
          status: 'pending',
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || 'Failed to create payment record');
      }

      const paymentData = await paymentResponse.json();
      const newPaymentId = paymentData.id;
      setPaymentId(newPaymentId);

      console.log('Payment record created:', newPaymentId);

      // Step 2: Initiate M-Pesa STK Push
      const mpesaResponse = await fetch('/api/mpesa/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          amount: parseFloat(amount.toFixed(2)),
          paymentId: newPaymentId,
          jobTitle: jobTitle || `Order #${jobId}`,
        }),
      });

      if (!mpesaResponse.ok) {
        const errorData = await mpesaResponse.json();
        throw new Error(errorData.error || 'Failed to initiate M-Pesa payment');
      }

      const mpesaData = await mpesaResponse.json();

      console.log('M-Pesa STK Push initiated:', mpesaData);

      toast.info('📱 Check Your Phone!', {
        description: mpesaData.message || 'Enter your M-Pesa PIN to complete the payment. You have 2 minutes.',
        duration: 15000,
      });

      // Step 3: Start polling for payment confirmation
      pollPaymentStatus(newPaymentId);

    } catch (error: any) {
      console.error('Payment initiation error:', error);
      clearAllTimers();
      setPaymentStatus('failed');
      const errorMsg = error.message || 'Failed to initiate payment. Please check your connection and try again.';
      setErrorMessage(errorMsg);
      
      toast.error('❌ Payment Failed', {
        description: errorMsg,
        duration: 10000,
      });
    } finally {
      setProcessing(false);
    }
  };

  const resetDialog = () => {
    setPhoneNumber('');
    setProcessing(false);
    setPaymentId(null);
    setCountdown(PAYMENT_TIMEOUT);
    setPaymentStatus('idle');
    setErrorMessage('');
    setReceiptNumber('');
    attemptCountRef.current = 0;
    clearAllTimers();
  };

  const handleClose = () => {
    if (paymentStatus === 'pending') {
      toast.warning('⏳ Payment In Progress', {
        description: 'Payment is still pending. Please wait or check your phone for the M-Pesa prompt.',
        duration: 5000,
      });
      return;
    }
    onOpenChange(false);
    resetDialog();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-600/10">
            {paymentStatus === 'success' ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : paymentStatus === 'failed' ? (
              <XCircle className="w-8 h-8 text-red-600" />
            ) : (
              <Wallet className="w-8 h-8 text-green-600" />
            )}
          </div>
          <DialogTitle className="text-center text-2xl">
            {paymentStatus === 'success' ? 'Payment Successful!' :
             paymentStatus === 'failed' ? 'Payment Failed' :
             paymentStatus === 'pending' ? 'Waiting for Payment' :
             'M-Pesa Payment'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {paymentStatus === 'success' ? 'Your payment has been confirmed successfully' :
             paymentStatus === 'failed' ? 'Payment was not completed. Please try again.' :
             paymentStatus === 'pending' ? 'Check your phone and enter your M-Pesa PIN' :
             'Pay securely with Lipa na M-Pesa'}
          </DialogDescription>
        </DialogHeader>

        {paymentStatus === 'idle' && (
          <div className="space-y-6 py-4">
            {/* Order Details */}
            <div className="space-y-2">
              <Label htmlFor="package" className="text-sm font-medium">
                Order Details
              </Label>
              <div className="p-4 border-2 rounded-lg bg-muted/30 border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-muted-foreground">
                  {jobTitle}
                </p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  KES {amount.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-medium">
                Your M-Pesa Phone Number
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                  <span className="text-2xl">🇰🇪</span>
                  <span className="text-sm text-muted-foreground">+254</span>
                </div>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="712345678"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className="pl-24 text-base font-medium"
                  maxLength={10}
                  disabled={processing}
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your M-Pesa registered phone number (e.g., 0712345678 or 0112345678)
              </p>
              {errorMessage && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* M-Pesa Instructions */}
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-900 dark:text-green-200">
                <div className="space-y-1">
                  <p className="font-semibold">📱 How M-Pesa Payment Works:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Click "Send M-Pesa Prompt" below</li>
                    <li>You'll receive an STK Push notification on your phone</li>
                    <li>Enter your M-Pesa PIN within 2 minutes</li>
                    <li>Payment will be confirmed automatically</li>
                    <li>Your files will be unlocked instantly</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>

            {/* Payment Summary */}
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID:</span>
                <span className="font-medium">#{jobId}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Total Amount:</span>
                <span className="font-bold text-xl text-green-600">KES {amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {paymentStatus === 'pending' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-16 h-16 text-green-600 animate-spin" />
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">Check Your Phone</p>
                <p className="text-sm text-muted-foreground">
                  Enter your M-Pesa PIN to complete the payment
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  Amount: KES {amount.toFixed(2)}
                </p>
              </div>
              
              {/* Countdown Timer */}
              <div className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg ${
                countdown <= 30 
                  ? 'bg-red-50 dark:bg-red-950/30 border-red-300' 
                  : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300'
              }`}>
                <Clock className={`w-5 h-5 ${countdown <= 30 ? 'text-red-600' : 'text-yellow-600'}`} />
                <span className={`text-base font-bold ${
                  countdown <= 30 
                    ? 'text-red-900 dark:text-red-200' 
                    : 'text-yellow-900 dark:text-yellow-200'
                }`}>
                  {formatTime(countdown)}
                </span>
              </div>

              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 w-full">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-900 dark:text-blue-200">
                  <p className="font-semibold mb-1">⚠️ Important Tips:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Unlock your phone to see the prompt</li>
                    <li>Check notifications if prompt doesn't appear</li>
                    <li>Ensure sufficient M-Pesa balance (KES {amount.toFixed(2)})</li>
                    <li>Enter your PIN within 2 minutes</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-bounce">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-bold text-green-600">✅ Payment Confirmed!</p>
                <p className="text-sm text-muted-foreground">
                  KES {amount.toFixed(2)} received successfully
                </p>
                {receiptNumber && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Receipt: {receiptNumber}
                  </p>
                )}
              </div>
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 w-full">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm text-green-900 dark:text-green-200">
                  <p className="font-semibold">🎉 Transaction Successful!</p>
                  <p className="text-xs mt-1">Order #{jobId} files are now unlocked and ready for download.</p>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {paymentStatus === 'failed' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-bold text-red-600">Payment Failed</p>
                <p className="text-sm text-muted-foreground">
                  {errorMessage || 'Payment was not completed or timed out.'}
                </p>
              </div>
              <Alert variant="destructive" className="w-full">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <p className="font-semibold mb-1">Possible reasons:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Payment timed out (2 minutes expired)</li>
                    <li>Insufficient M-Pesa balance</li>
                    <li>Wrong PIN entered</li>
                    <li>Payment was cancelled</li>
                    <li>Phone was locked or prompt was missed</li>
                  </ul>
                  <p className="mt-2 font-semibold">✅ Please try again and act quickly!</p>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {paymentStatus === 'idle' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={processing}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handlePayNow}
                disabled={!phoneNumber || phoneNumber.length < 10 || processing}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Prompt...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Send M-Pesa Prompt
                  </>
                )}
              </Button>
            </>
          )}
          
          {paymentStatus === 'pending' && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full"
            >
              Keep Waiting
            </Button>
          )}

          {paymentStatus === 'success' && (
            <Button
              className="w-full bg-green-600 hover:bg-green-700 font-semibold"
              onClick={() => {
                onOpenChange(false);
                resetDialog();
              }}
            >
              ✓ Close
            </Button>
          )}

          {paymentStatus === 'failed' && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 font-semibold"
                onClick={() => {
                  setPaymentStatus('idle');
                  setCountdown(PAYMENT_TIMEOUT);
                  setErrorMessage('');
                  setReceiptNumber('');
                }}
              >
                <Phone className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}