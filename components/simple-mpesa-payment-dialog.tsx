"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Loader2, CheckCircle, XCircle, Clock, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

type SimpleMpesaPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  jobId: number;
  jobTitle: string;
  userId: number;
  freelancerId: number;
  onPaymentSuccess?: (reference: string) => void;
};

const PAYMENT_TIMEOUT = 120;
const POLL_INTERVAL = 2000;

export function SimpleMpesaPaymentDialog({
  open,
  onOpenChange,
  amount,
  jobId,
  jobTitle,
  userId,
  freelancerId,
  onPaymentSuccess,
}: SimpleMpesaPaymentDialogProps) {
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

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

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
    setErrorMessage('Payment request timed out after 2 minutes.');
    toast.error('Payment Timeout!', {
      description: 'Payment was not completed within 2 minutes. Please try again.',
      duration: 10000,
    });
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits.slice(0, 10);
  };

  const validatePhoneNumber = (phone: string): boolean => {
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
    const maxAttempts = Math.ceil(PAYMENT_TIMEOUT / (POLL_INTERVAL / 1000));

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

        if (payment.status === 'confirmed' && payment.confirmedByAdmin === 1) {
          clearAllTimers();
          
          const receipt = payment.mpesaReceiptNumber || payment.paystackReference || 'N/A';
          setReceiptNumber(receipt);
          setPaymentStatus('success');
          
          toast.success('🎉 Payment Successful!', {
            description: `Your payment of KES ${amount.toFixed(2)} has been confirmed. Receipt: ${receipt}`,
            duration: 10000,
          });

          if (onPaymentSuccess) {
            onPaymentSuccess(receipt);
          }

          setTimeout(() => {
            onOpenChange(false);
            resetDialog();
          }, 4000);
        } 
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

      if (attemptCountRef.current >= maxAttempts) {
        clearAllTimers();
      }
    }, POLL_INTERVAL);
  };

  const handlePayment = async () => {
    const trimmedPhone = phoneNumber.trim();
    
    if (trimmedPhone.length < 10) {
      setErrorMessage('Please enter your M-PESA phone number (10 digits)');
      toast.error('Phone Number Required', {
        description: 'Please enter a complete 10-digit phone number',
        duration: 5000,
      });
      return;
    }
    
    if (!validatePhoneNumber(trimmedPhone)) {
      setErrorMessage('Invalid phone number format. Must start with 07 or 01');
      toast.error('Invalid Phone Number', {
        description: 'Phone number must start with 07 or 01 and have 10 digits',
        duration: 5000,
      });
      return;
    }

    setProcessing(true);
    setPaymentStatus('pending');
    setCountdown(PAYMENT_TIMEOUT);
    setErrorMessage('');

    try {
      // Initiate M-PESA STK Push directly with correct field names
      const stkPushResponse = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: trimmedPhone,
          amount: parseFloat(amount.toFixed(2)),
          jobId: jobId,
          userId: userId,
        }),
      });

      if (!stkPushResponse.ok) {
        const errorData = await stkPushResponse.json();
        throw new Error(errorData.error || 'Failed to initiate M-PESA payment');
      }

      const stkPushData = await stkPushResponse.json();
      const newPaymentId = stkPushData.paymentId;
      setPaymentId(newPaymentId);
      
      toast.success('📱 M-PESA Prompt Sent!', {
        description: 'Check your phone and enter your M-PESA PIN to complete payment.',
        duration: 8000,
      });

      // Start polling for payment status
      pollPaymentStatus(newPaymentId);

    } catch (error: any) {
      console.error('M-PESA payment error:', error);
      clearAllTimers();
      setPaymentStatus('failed');
      const errorMsg = error.message || 'Failed to initiate M-PESA payment. Please try again.';
      setErrorMessage(errorMsg);
      
      toast.error('❌ Payment Failed', {
        description: errorMsg,
        duration: 10000,
      });
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
        description: 'Payment is still pending. Please wait for confirmation.',
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

  const isFormValid = () => {
    return !processing && phoneNumber.trim().length === 10 && validatePhoneNumber(phoneNumber.trim());
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30">
            {paymentStatus === 'success' ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : paymentStatus === 'failed' ? (
              <XCircle className="w-8 h-8 text-red-600" />
            ) : (
              <Phone className="w-8 h-8 text-green-600" />
            )}
          </div>
          <DialogTitle className="text-center text-2xl">
            {paymentStatus === 'success' ? 'Payment Successful!' :
             paymentStatus === 'failed' ? 'Payment Failed' :
             paymentStatus === 'pending' ? 'Processing Payment' :
             'M-PESA Payment'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {paymentStatus === 'success' ? 'Your payment has been confirmed successfully' :
             paymentStatus === 'failed' ? 'Payment was not completed. Please try again.' :
             paymentStatus === 'pending' ? 'Please complete the payment on your phone' :
             'Enter your M-PESA phone number to pay'}
          </DialogDescription>
        </DialogHeader>

        {/* Payment Form */}
        {paymentStatus === 'idle' && (
          <div className="space-y-6 py-4">
            <div className="text-center p-6 border-2 rounded-lg bg-green-50 dark:bg-green-950/20 border-green-300">
              <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
              <p className="text-4xl font-bold text-green-600">
                KES {amount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-2 truncate">{jobTitle}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-medium">
                M-PESA Phone Number <span className="text-red-600">*</span>
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
                Enter phone number without country code (starts with 07 or 01)
              </p>
              {phoneNumber.trim().length > 0 && phoneNumber.trim().length < 10 && (
                <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                  ⚠️ Phone number must be 10 digits ({phoneNumber.trim().length}/10)
                </p>
              )}
              {phoneNumber.trim().length === 10 && !validatePhoneNumber(phoneNumber.trim()) && (
                <p className="text-xs text-red-600 dark:text-red-500 font-medium">
                  ❌ Invalid format. Must start with 07 or 01
                </p>
              )}
              {phoneNumber.trim().length === 10 && validatePhoneNumber(phoneNumber.trim()) && (
                <p className="text-xs text-green-600 dark:text-green-500 font-medium">
                  ✅ Valid phone number
                </p>
              )}
            </div>

            {errorMessage && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-900 dark:text-green-200">
                You will receive an M-PESA prompt on your phone. Enter your PIN to complete the payment.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={processing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={!isFormValid()}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Pay KES {amount.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Pending Payment Screen */}
        {paymentStatus === 'pending' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-16 h-16 text-green-600 animate-spin" />
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">Processing Payment...</p>
                <p className="text-sm text-muted-foreground">
                  Check your phone for M-PESA prompt
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  Amount: KES {amount.toFixed(2)}
                </p>
              </div>
              
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
            </div>

            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
              <Info className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-900 dark:text-green-200">
                Enter your M-PESA PIN on your phone to complete payment.
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Success Screen */}
        {paymentStatus === 'success' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-bounce">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-bold text-green-600">✅ Payment Successful!</p>
                <p className="text-sm text-muted-foreground">
                  KES {amount.toFixed(2)} received successfully
                </p>
                {receiptNumber && (
                  <p className="text-xs text-muted-foreground font-mono break-all px-4">
                    Receipt: {receiptNumber}
                  </p>
                )}
              </div>
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 w-full">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm text-green-900 dark:text-green-200">
                  <p className="font-semibold">🎉 Success!</p>
                  <p className="text-xs mt-1">Your files are now unlocked and ready for download.</p>
                </AlertDescription>
              </Alert>
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700 font-semibold"
              onClick={() => {
                onOpenChange(false);
                resetDialog();
              }}
            >
              ✓ Close & Download Files
            </Button>
          </div>
        )}

        {/* Failed Screen */}
        {paymentStatus === 'failed' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-bold text-red-600">❌ Payment Failed</p>
                <p className="text-sm text-muted-foreground px-4">
                  {errorMessage || 'Payment was not completed successfully.'}
                </p>
              </div>
              <Alert variant="destructive" className="w-full">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <p className="font-semibold mb-2">Possible reasons:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Payment was cancelled</li>
                    <li>Insufficient funds in account</li>
                    <li>Network connection error</li>
                    <li>Payment request timed out</li>
                    <li>Incorrect phone number</li>
                  </ul>
                  <p className="mt-3 font-semibold text-base">✅ Please try again!</p>
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex gap-3">
              <Button
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
                  setPhoneNumber('');
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}