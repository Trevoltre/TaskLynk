"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface PaystackPaymentProps {
  amount: number; // Amount in KSh
  email: string;
  jobId: string;
  onSuccess?: (reference: string) => void;
  onClose?: () => void;
}

// Declare PaystackPop on window for TypeScript
declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

export function PaystackPayment({
  amount,
  email,
  jobId,
  onSuccess,
  onClose,
}: PaystackPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handlePayment = () => {
    // Check if Paystack script is loaded
    if (!window.PaystackPop) {
      toast.error('Payment system is loading. Please try again in a moment.');
      return;
    }

    setIsLoading(true);

    try {
      const handler = window.PaystackPop.setup({
        key: 'pk_live_2e53310b5d020b7b997f84fa1cc8df54d31d910d',
        email: email,
        amount: amount * 100, // Convert to kobo (Paystack uses smallest currency unit)
        currency: 'KES',
        ref: `TASKLYNK_${jobId}_${Date.now()}`,
        callback: async function (response) {
          setIsLoading(false);
          setIsVerifying(true);
          
          try {
            // Verify payment on backend
            const verifyRes = await fetch('/api/paystack/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                reference: response.reference,
                jobId: jobId,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              toast.success('Payment successful! Your order is now being processed.');
              onSuccess?.(response.reference);
            } else {
              toast.error(verifyData.error || 'Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Failed to verify payment. Please contact support with reference: ' + response.reference);
          } finally {
            setIsVerifying(false);
          }
        },
        onClose: function () {
          setIsLoading(false);
          toast.info('Payment cancelled.');
          onClose?.();
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error('Failed to initialize payment. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">Amount to Pay:</span>
          <span className="text-2xl font-bold text-primary">KSh {amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Payment Email:</span>
          <span className="text-sm font-medium">{email}</span>
        </div>
      </div>

      <Button
        onClick={handlePayment}
        disabled={isLoading || isVerifying}
        className="w-full"
        size="lg"
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isVerifying ? 'Verifying Payment...' : isLoading ? 'Processing...' : 'Pay with Paystack'}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Secure payment powered by Paystack. Supports M-Pesa, Cards, and Bank transfers.
      </p>
    </div>
  );
}
