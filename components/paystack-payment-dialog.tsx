"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Info, Loader2, Plus, Minus, Phone } from 'lucide-react';
import { toast } from 'sonner';

type PaystackPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseAmount: number;
  jobId: number;
  jobTitle: string;
  clientId: number;
  freelancerId: number;
  onPaymentSuccess?: (reference: string) => void;
};

// Load Paystack script once at module level
if (typeof window !== 'undefined' && !window.PaystackPop) {
  const script = document.createElement('script');
  script.src = 'https://js.paystack.co/v1/inline.js';
  script.async = true;
  document.head.appendChild(script);
}

// Declare Paystack types for TypeScript
declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: any) => {
        openIframe: () => void;
      };
    };
  }
}

const PREDEFINED_BONUSES = [50, 100, 200, 500, 1000];

export function PaystackPaymentDialog({
  open,
  onOpenChange,
  baseAmount,
  jobId,
  jobTitle,
  clientId,
  freelancerId,
  onPaymentSuccess,
}: PaystackPaymentDialogProps) {
  const [bonusAmount, setBonusAmount] = useState(0);
  const [customBonus, setCustomBonus] = useState('');
  const [processing, setProcessing] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  // Auto-compute total amount whenever base or bonus changes
  const totalAmount = baseAmount + bonusAmount;

  const handleSelectBonus = (amount: number) => {
    setBonusAmount(amount);
    setCustomBonus('');
  };

  const handleCustomBonusChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setCustomBonus(value);
    setBonusAmount(numValue);
  };

  const handleRemoveBonus = () => {
    setBonusAmount(0);
    setCustomBonus('');
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with 254
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    }
    
    // If doesn't start with 254, add it
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  };

  const validatePhoneNumber = (phone: string) => {
    const formatted = formatPhoneNumber(phone);
    // Kenyan numbers should be 254XXXXXXXXX (12 digits)
    return /^254\d{9}$/.test(formatted);
  };

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch('/api/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reference,
          jobId,
          clientId,
          freelancerId,
          baseAmount,
          bonusAmount,
          totalAmount,
          phoneNumber: formatPhoneNumber(phoneNumber),
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        toast.success('Payment verified successfully!', {
          description: 'Your order files will be unlocked shortly.',
          duration: 6000,
        });
        
        if (onPaymentSuccess) {
          onPaymentSuccess(reference);
        }
        
        onOpenChange(false);
        return true;
      } else {
        toast.error('Payment verification failed', {
          description: 'Please contact support with reference: ' + reference,
        });
        return false;
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to verify payment', {
        description: 'Please contact support.',
      });
      return false;
    }
  };

  const handlePayment = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast.error('Please enter a valid Kenyan phone number (e.g., 0712345678)');
      return;
    }

    // Wait for script to load if not ready
    if (!window.PaystackPop) {
      toast.info('Loading payment system...');
      
      // Wait up to 5 seconds for script to load
      let attempts = 0;
      const maxAttempts = 50;
      
      while (!window.PaystackPop && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (!window.PaystackPop) {
        toast.error('Payment system failed to load. Please refresh the page and try again.');
        return;
      }
    }

    setProcessing(true);

    try {
      const reference = 'TL_' + Date.now() + '_' + jobId;
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      // Generate email from phone number for Paystack requirement
      const generatedEmail = `${formattedPhone}@tasklynk.app`;

      const handler = window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_live_2e53310b5d020b7b997f84fa1cc8df54d31d910d',
        email: generatedEmail, // Use generated email
        amount: Math.round(totalAmount * 100), // Convert to kobo
        currency: 'KES',
        ref: reference,
        label: jobTitle,
        metadata: {
          phone: formattedPhone,
          jobId: jobId,
          clientId: clientId,
          bonusAmount: bonusAmount,
        },
        callback: async function(response: any) {
          toast.info('Processing payment verification...');
          await verifyPayment(response.reference);
          setProcessing(false);
        },
        onClose: function() {
          toast.warning('Payment was not completed');
          setProcessing(false);
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment', {
        description: 'Please try again or contact support.',
      });
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-green-600/10">
            <Wallet className="w-8 h-8 text-green-600" />
          </div>
          <DialogTitle className="text-center text-2xl">Complete Payment</DialogTitle>
          <DialogDescription className="text-center">
            Pay with M-Pesa, Card, or Bank Transfer via Paystack
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Details with Auto-computed Total */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Order</span>
                <span className="font-medium truncate ml-2">{jobTitle}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Base Amount</span>
                <span className="font-semibold">KES {baseAmount.toFixed(2)}</span>
              </div>
              {bonusAmount > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span className="text-sm">Bonus Amount</span>
                  <span className="font-semibold">+ KES {bonusAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="font-semibold">Total Amount</span>
                <span className="text-2xl font-bold text-green-600">KES {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Phone Number Input - ONLY REQUIRED FIELD */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number *
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="0712345678 or 254712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              Enter your Kenyan M-Pesa number for payment
            </p>
          </div>

          {/* Add Bonus Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Add Bonus (Optional)</Label>
              {bonusAmount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveBonus}
                  className="text-red-600 hover:text-red-700"
                >
                  <Minus className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>

            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-900 dark:text-blue-200">
                Add a tip or bonus amount to show appreciation for excellent work
              </AlertDescription>
            </Alert>

            {/* Predefined Bonus Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {PREDEFINED_BONUSES.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant={bonusAmount === amount && !customBonus ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSelectBonus(amount)}
                  className="text-xs"
                >
                  +{amount}
                </Button>
              ))}
            </div>

            {/* Custom Bonus Input */}
            <div className="space-y-2">
              <Label htmlFor="customBonus" className="text-sm">Custom Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  KES
                </span>
                <Input
                  id="customBonus"
                  type="number"
                  placeholder="0"
                  value={customBonus}
                  onChange={(e) => handleCustomBonusChange(e.target.value)}
                  className="pl-14"
                  min="0"
                  step="10"
                />
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-xs text-green-900 dark:text-green-200">
              <p className="font-semibold mb-2">Accepted Payment Methods:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>M-Pesa (Lipa na M-Pesa)</li>
                <li>Debit/Credit Cards (Visa, Mastercard)</li>
                <li>Bank Transfers</li>
              </ul>
              <p className="mt-2">✓ Secure payment powered by Paystack</p>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setBonusAmount(0);
              setCustomBonus('');
              setPhoneNumber('');
            }}
            disabled={processing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="lg"
            onClick={handlePayment}
            disabled={processing || !phoneNumber.trim()}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Pay KES {totalAmount.toFixed(2)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}