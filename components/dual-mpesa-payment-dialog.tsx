"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Wallet, Info, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type DualMpesaPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  jobId: number;
  jobTitle: string;
  paymentId: number | null;
  clientId: number;
  freelancerId: number;
  onPaymentInitiated?: (phoneOrCode: string) => void;
};

const RECIPIENT_PHONE = "0701066845";
const RECIPIENT_NAME = "TaskLynk";

export function DualMpesaPaymentDialog({
  open,
  onOpenChange,
  amount,
  jobId,
  jobTitle,
  paymentId,
  clientId,
  freelancerId,
  onPaymentInitiated,
}: DualMpesaPaymentDialogProps) {
  const [activeTab, setActiveTab] = useState<'pochi' | 'direct'>('pochi');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mpesaCode, setMpesaCode] = useState('');
  const [processing, setProcessing] = useState(false);

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
  };

  // Lipa Pochi La Biashara - Manual code entry
  const handlePochiPayment = async () => {
    if (!mpesaCode.trim()) {
      toast.error('Please enter your M-Pesa transaction code');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: jobId,
          clientId: clientId,
          freelancerId: freelancerId,
          amount: amount,
          mpesaCode: mpesaCode.trim().toUpperCase(),
          paymentMethod: 'pochi',
        }),
      });

      if (response.ok) {
        toast.success('Payment submitted successfully!', {
          description: 'Waiting for admin to verify and approve your payment.',
          duration: 6000,
        });
        
        if (onPaymentInitiated) {
          onPaymentInitiated(mpesaCode);
        }
        
        onOpenChange(false);
        setMpesaCode('');
      } else {
        const data = await response.json();
        toast.error('Payment submission failed', {
          description: data.error || 'Please try again or contact support.',
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to submit payment', {
        description: 'Please try again or contact support.',
      });
    } finally {
      setProcessing(false);
    }
  };

  // M-Pesa Direct Pay - STK Push
  const handleDirectPayment = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      toast.error('Please enter a valid Kenyan phone number (e.g., 0712345678)');
      return;
    }

    setProcessing(true);
    try {
      toast.info('Sending M-Pesa STK Push to your phone...');
      
      const response = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          amount: amount,
          jobId: jobId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to send STK Push');
      }

      toast.success('M-Pesa prompt sent to your phone!', {
        description: 'Please enter your M-Pesa PIN to complete the payment. Payment will be confirmed automatically.',
        duration: 8000,
      });

      if (onPaymentInitiated) {
        onPaymentInitiated(phoneNumber);
      }

      onOpenChange(false);
      setPhoneNumber('');
      
    } catch (error) {
      console.error('STK Push error:', error);
      toast.error('Failed to send M-Pesa prompt', {
        description: error instanceof Error ? error.message : 'Please try again or use Lipa Pochi option.',
        duration: 6000,
      });
    } finally {
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
          <DialogTitle className="text-center text-2xl">M-Pesa Payment</DialogTitle>
          <DialogDescription className="text-center">
            Choose your preferred payment method
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Details */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Order</p>
                <p className="font-medium">{jobTitle}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold text-green-600">KES {amount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Payment Methods Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pochi' | 'direct')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pochi">Lipa Pochi La Biashara</TabsTrigger>
              <TabsTrigger value="direct">M-Pesa Direct Pay</TabsTrigger>
            </TabsList>

            {/* Lipa Pochi La Biashara Tab */}
            <TabsContent value="pochi" className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900 dark:text-blue-200">
                  <div className="space-y-2">
                    <p className="font-semibold">How to pay via Lipa Pochi:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Go to M-Pesa on your phone</li>
                      <li>Select "Lipa na M-Pesa"</li>
                      <li>Select "Pochi La Biashara"</li>
                      <li>Enter Pochi Number: <strong className="font-mono">{RECIPIENT_PHONE}</strong></li>
                      <li>Enter Amount: <strong>KES {amount.toFixed(2)}</strong></li>
                      <li>Enter your M-Pesa PIN</li>
                      <li>You will receive a confirmation SMS with M-Pesa code</li>
                      <li>Enter the code below and submit</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="mpesaCode">M-Pesa Transaction Code *</Label>
                <Input
                  id="mpesaCode"
                  placeholder="e.g., SH12AB3CD4"
                  value={mpesaCode}
                  onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                  className="font-mono text-lg"
                  maxLength={15}
                  disabled={processing}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the M-Pesa confirmation code from your SMS (e.g., SH12AB3CD4)
                </p>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pay to:</span>
                  <span className="font-medium">{RECIPIENT_NAME}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pochi Number:</span>
                  <span className="font-medium font-mono">{RECIPIENT_PHONE}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-medium">JOB-{jobId}</span>
                </div>
              </div>

              <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
                <AlertDescription className="text-xs text-yellow-900 dark:text-yellow-200">
                  <strong>Note:</strong> Admin will verify your payment before unlocking your order files. This usually takes a few minutes.
                </AlertDescription>
              </Alert>

              <Button
                className="w-full"
                size="lg"
                onClick={handlePochiPayment}
                disabled={!mpesaCode.trim() || processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Payment
                  </>
                )}
              </Button>
            </TabsContent>

            {/* M-Pesa Direct Pay Tab */}
            <TabsContent value="direct" className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
                <Info className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm text-green-900 dark:text-green-200">
                  <div className="space-y-2">
                    <p className="font-semibold">How M-Pesa Direct Pay works:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Enter your M-Pesa registered phone number</li>
                      <li>Click "Send M-Pesa Prompt"</li>
                      <li>You'll receive an STK Push on your phone</li>
                      <li>Enter your M-Pesa PIN to complete payment</li>
                      <li>Payment will be confirmed automatically</li>
                      <li>Your order files will be unlocked instantly</li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Your M-Pesa Phone Number *</Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <img
                      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 600'%3E%3Cpath fill='%23000' d='M0 0h900v600H0z'/%3E%3Cpath fill='%23060' d='M0 0h900v200H0z'/%3E%3Cpath fill='%23fff' d='M0 200h900v200H0z'/%3E%3Cpath fill='%23b00' d='M0 400h900v200H0z'/%3E%3Cg fill='%23fff' stroke='%23000' stroke-width='3'%3E%3Cellipse cx='450' cy='300' rx='180' ry='180'/%3E%3Cpath d='M270 380c20-60 120-80 180-80s160 20 180 80c-20 20-60 40-180 40s-160-20-180-40z'/%3E%3C/g%3E%3C/svg%3E"
                      alt="Kenya flag"
                      className="w-6 h-4 rounded"
                    />
                    <span className="text-sm text-muted-foreground">+254</span>
                  </div>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="7XX XXX XXX"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    className="pl-24 text-base"
                    maxLength={10}
                    disabled={processing}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the phone number registered with M-Pesa (e.g., 0712345678)
                </p>
              </div>

              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="font-medium">{RECIPIENT_NAME}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{RECIPIENT_PHONE}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-medium">JOB-{jobId}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="font-bold text-green-600">KES {amount.toFixed(2)}</span>
                </div>
              </div>

              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30">
                <AlertDescription className="text-xs text-green-900 dark:text-green-200">
                  <strong>Auto-Approval:</strong> Successful payments are automatically validated and approved. Your files will be unlocked instantly!
                </AlertDescription>
              </Alert>

              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
                onClick={handleDirectPayment}
                disabled={!phoneNumber || processing}
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
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setPhoneNumber('');
              setMpesaCode('');
            }}
            disabled={processing}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}