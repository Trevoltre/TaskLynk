"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, CreditCard, Info } from 'lucide-react';
import { toast } from 'sonner';

type SimplePaystackPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  jobId: number;
  jobTitle: string;
  userId: number;
  freelancerId: number;
  userEmail?: string;
  onPaymentSuccess?: (reference: string) => void;
};

// Paystack TypeScript declaration
declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: PaystackConfig) => PaystackHandler;
    };
  }
}

type PaystackConfig = {
  key: string;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  label: string;
  callback: (response: { reference: string }) => void;
  onClose: () => void;
};

type PaystackHandler = {
  openIframe: () => void;
};

export function SimplePaystackPaymentDialog({
  open,
  onOpenChange,
  amount,
  jobId,
  jobTitle,
  userId,
  freelancerId,
  userEmail = 'customer@example.com',
  onPaymentSuccess,
}: SimplePaystackPaymentDialogProps) {
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'verifying' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const processingRef = useRef(false);

  // Don't wait for Paystack to load - it's already loaded on page mount
  // Remove all loading state checks for instant button activation

  const resetDialog = () => {
    setProcessing(false);
    setPaymentStatus('idle');
    setErrorMessage('');
    processingRef.current = false;
  };

  const verifyPayment = async (reference: string) => {
    console.log('🔍 Verifying payment:', reference);
    setPaymentStatus('verifying');

    try {
      const response = await fetch('/api/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          jobId,
          clientId: userId,
          freelancerId,
          totalAmount: amount,
        }),
      });

      const data = await response.json();
      console.log('✅ Verification response:', data);

      if (data.status === 'success') {
        setPaymentStatus('success');
        setProcessing(false);
        
        toast.success('🎉 Payment Successful!', {
          description: `KES ${amount.toFixed(2)} received and confirmed.`,
          duration: 8000,
        });

        if (onPaymentSuccess) {
          onPaymentSuccess(reference);
        }

        setTimeout(() => {
          onOpenChange(false);
          resetDialog();
        }, 3000);
      } else {
        throw new Error(data.message || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('❌ Verification error:', error);
      setPaymentStatus('failed');
      setProcessing(false);
      setErrorMessage(error.message || 'Failed to verify payment');
      toast.error('Payment Verification Failed', { 
        description: error.message,
        duration: 8000 
      });
    }
  };

  const handlePayment = () => {
    // Prevent duplicate submissions
    if (processingRef.current) {
      console.log('Payment already in progress');
      return;
    }

    // Instant feedback - set processing immediately
    processingRef.current = true;
    setProcessing(true);
    setPaymentStatus('processing');
    setErrorMessage('');

    // Check Paystack availability
    if (!window.PaystackPop) {
      toast.error('Loading Payment Provider...', {
        description: 'Please wait a moment and try again.',
        duration: 3000,
      });
      setProcessing(false);
      setPaymentStatus('idle');
      processingRef.current = false;
      return;
    }

    const reference = `JOB${jobId}_${Date.now()}`;
    console.log('🚀 Initiating Paystack payment:', { 
      reference, 
      amount, 
      jobId, 
      userId,
      email: userEmail 
    });

    try {
      // Immediate toast to show action is happening
      toast.info('🚀 Opening Payment Window...', {
        description: 'Please wait...',
        duration: 2000,
      });

      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_live_2e53310b5d020b7b997f84fa1cc8df54d31d910d',
        email: userEmail,
        amount: Math.round(amount * 100),
        currency: 'KES',
        ref: reference,
        label: jobTitle || 'TaskLynk Order Payment',
        callback: function (response) {
          console.log('💰 Payment callback:', response);
          toast.success('Payment Completed!', {
            description: 'Verifying your payment...',
          });
          verifyPayment(response.reference);
        },
        onClose: function () {
          console.log('Payment window closed');
          if (paymentStatus === 'processing') {
            setProcessing(false);
            setPaymentStatus('idle');
            processingRef.current = false;
            toast.warning('Payment Cancelled', {
              description: 'You closed the payment window. Try again when ready.',
            });
          }
        },
      });

      // Open iframe immediately
      handler.openIframe();
      
      toast.success('💳 Payment Window Ready!', {
        description: 'Enter your M-Pesa number or choose another payment method',
        duration: 4000,
      });

    } catch (error: any) {
      console.error('❌ Payment error:', error);
      setPaymentStatus('failed');
      processingRef.current = false;
      setProcessing(false);
      
      const errorMsg = error.message || 'Failed to open payment window';
      setErrorMessage(errorMsg);
      toast.error('Payment Failed', { 
        description: errorMsg,
        duration: 8000 
      });
    }
  };

  const handleClose = () => {
    if (paymentStatus === 'processing' || paymentStatus === 'verifying') {
      toast.warning('⏳ Payment In Progress', {
        description: 'Please complete or cancel the payment first.',
      });
      return;
    }
    onOpenChange(false);
    resetDialog();
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
              <CreditCard className="w-8 h-8 text-green-600" />
            )}
          </div>
          <DialogTitle className="text-center text-2xl">
            {paymentStatus === 'success' ? 'Payment Successful!' :
             paymentStatus === 'failed' ? 'Payment Failed' :
             paymentStatus === 'verifying' ? 'Verifying Payment...' :
             paymentStatus === 'processing' ? 'Complete Payment' :
             'Secure Payment'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {paymentStatus === 'success' ? 'Your payment has been confirmed' :
             paymentStatus === 'failed' ? 'Please try again' :
             paymentStatus === 'verifying' ? 'Please wait while we verify your payment' :
             paymentStatus === 'processing' ? 'Complete payment in the popup window' :
             'Pay securely via M-Pesa, Card, or Bank'}
          </DialogDescription>
        </DialogHeader>

        {/* Idle - Payment Form */}
        {paymentStatus === 'idle' && (
          <div className="space-y-6 py-4">
            <div className="text-center p-6 border-2 rounded-lg bg-green-50 dark:bg-green-950/20 border-green-300">
              <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
              <p className="text-4xl font-bold text-green-600">
                KES {amount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-2 truncate">{jobTitle}</p>
            </div>

            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900 dark:text-blue-200">
                <p className="font-semibold mb-1">💳 Multiple Payment Options:</p>
                <ul className="text-xs space-y-1 ml-4 list-disc">
                  <li>M-Pesa (Safaricom)</li>
                  <li>Debit/Credit Card (Visa, Mastercard)</li>
                  <li>Bank Transfer</li>
                  <li>Mobile Money</li>
                </ul>
              </AlertDescription>
            </Alert>

            {errorMessage && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

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
                disabled={false}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold transition-all hover:scale-105 active:scale-95"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Pay KES {amount.toFixed(2)}
              </Button>
            </div>
          </div>
        )}

        {/* Processing Screen */}
        {paymentStatus === 'processing' && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-green-600 animate-spin" />
                <CreditCard className="w-8 h-8 text-green-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">💳 Complete Your Payment</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  A payment window has opened. Enter your M-Pesa number or choose another method.
                </p>
              </div>
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 max-w-sm">
                <Info className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs text-green-900 dark:text-green-200">
                  ℹ️ If you don't see the payment window, check if it was blocked by your browser's popup blocker
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        {/* Verifying Screen */}
        {paymentStatus === 'verifying' && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-green-600 animate-spin" />
                <CheckCircle className="w-8 h-8 text-green-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">🔍 Verifying Payment...</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Please wait while we confirm your payment
                </p>
              </div>
            </div>
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
                  KES {amount.toFixed(2)} received and confirmed
                </p>
              </div>
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 w-full">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm text-green-900 dark:text-green-200">
                  <p className="font-semibold">🎉 Payment Complete!</p>
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
                  setErrorMessage('');
                  processingRef.current = false;
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