"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, Wallet, Info, Loader2, CheckCircle, XCircle, Clock, AlertTriangle, ArrowLeft, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

type PaymentMethod = 'mpesa' | 'card';

type IntaSendPaymentDialogProps = {
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

const paymentMethods = [
  {
    id: 'mpesa' as PaymentMethod,
    name: 'M-PESA',
    description: 'Lipa na M-Pesa',
    icon: Phone,
    color: 'bg-green-600',
    hoverColor: 'hover:bg-green-700',
  },
  {
    id: 'card' as PaymentMethod,
    name: 'Card',
    description: 'Debit/Credit Card',
    icon: CreditCard,
    color: 'bg-blue-600',
    hoverColor: 'hover:bg-blue-700',
  },
];

export function IntaSendPaymentDialog({
  open,
  onOpenChange,
  amount,
  jobId,
  jobTitle,
  userId,
  freelancerId,
  onPaymentSuccess,
}: IntaSendPaymentDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
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

  // Load Paystack script dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => {
        console.log('Paystack script loaded successfully');
      };
      script.onerror = () => {
        console.error('Failed to load Paystack script');
        toast.error('Payment system loading failed. Please refresh the page.');
      };
      document.body.appendChild(script);
      
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, []);

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

  // Direct M-PESA STK Push handler
  const handleDirectMpesaPayment = async () => {
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
      // Create payment record with "direct" payment method
      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          clientId: userId,
          freelancerId,
          amount: parseFloat(amount.toFixed(2)),
          phoneNumber: trimmedPhone,
          paymentMethod: 'direct', // Changed from 'mpesa' to 'direct'
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || 'Failed to create payment record');
      }

      const paymentData = await paymentResponse.json();
      const newPaymentId = paymentData.id;
      setPaymentId(newPaymentId);

      // Initiate M-PESA STK Push directly (no Paystack popup)
      const stkPushResponse = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: trimmedPhone,
          amount: parseFloat(amount.toFixed(2)),
          accountReference: `TL_${jobId}`,
          transactionDesc: `Payment for ${jobTitle}`,
          paymentId: newPaymentId,
        }),
      });

      if (!stkPushResponse.ok) {
        const errorData = await stkPushResponse.json();
        throw new Error(errorData.error || 'Failed to initiate M-PESA payment');
      }

      const stkPushData = await stkPushResponse.json();
      
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

  // Paystack Card Payment handler
  const handlePaystackPayment = async () => {
    setProcessing(true);
    setPaymentStatus('pending');
    setCountdown(PAYMENT_TIMEOUT);
    setErrorMessage('');

    try {
      // Create payment record with "direct" payment method
      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          clientId: userId,
          freelancerId,
          amount: parseFloat(amount.toFixed(2)),
          phoneNumber: null,
          paymentMethod: 'direct', // Changed from 'card' to 'direct'
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || 'Failed to create payment record');
      }

      const paymentData = await paymentResponse.json();
      const newPaymentId = paymentData.id;
      setPaymentId(newPaymentId);

      // Initialize Paystack popup
      if (typeof window === 'undefined' || !(window as any).PaystackPop) {
        throw new Error('Paystack is not loaded. Please refresh the page and try again.');
      }

      const reference = `TL_${jobId}_${newPaymentId}_${Date.now()}`;
      const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_live_2e53310b5d020b7b997f84fa1cc8df54d31d910d';
      const payerEmail = `client${userId}@tasklynk.app`;

      const handler = (window as any).PaystackPop.setup({
        key: paystackPublicKey,
        email: payerEmail,
        amount: Math.round(amount * 100),
        currency: 'KES',
        ref: reference,
        label: jobTitle || `TaskLynk Order #${jobId}`,
        channels: ['card'],
        metadata: {
          jobId,
          paymentId: newPaymentId,
          userId,
          freelancerId,
          jobTitle,
        },
        callback: function (response: any) {
          clearAllTimers();
          
          toast.info('Verifying Payment...', {
            description: 'Please wait while we confirm your payment.',
            duration: 5000,
          });

          fetch('/api/paystack/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reference: response.reference,
              paymentId: newPaymentId,
              jobId,
            }),
          })
            .then(res => res.json())
            .then(verifyData => {
              if (verifyData.status === 'success') {
                setReceiptNumber(response.reference);
                setPaymentStatus('success');
                
                toast.success('🎉 Payment Successful!', {
                  description: `Payment verified successfully! Receipt: ${response.reference}`,
                  duration: 10000,
                });

                if (onPaymentSuccess) {
                  onPaymentSuccess(response.reference);
                }

                setTimeout(() => {
                  onOpenChange(false);
                  resetDialog();
                }, 4000);
              } else {
                throw new Error(verifyData.message || 'Payment verification failed');
              }
            })
            .catch(verifyError => {
              console.error('Verification error:', verifyError);
              
              setPaymentStatus('failed');
              setErrorMessage(verifyError.message || 'Payment verification failed');
              
              toast.error('Verification Failed', {
                description: verifyError.message || 'Payment completed but verification failed. Please contact support with reference: ' + response.reference,
                duration: 15000,
              });
              
              pollPaymentStatus(newPaymentId);
            })
            .finally(() => {
              setProcessing(false);
            });
        },
        onClose: function () {
          clearAllTimers();
          setPaymentStatus('failed');
          setErrorMessage('Payment was cancelled');
          toast.warning('Payment Cancelled', {
            description: 'You closed the payment window. Please try again if you want to complete payment.',
            duration: 8000,
          });
          setProcessing(false);
        },
      });

      handler.openIframe();

    } catch (error: any) {
      console.error('Payment initiation error:', error);
      clearAllTimers();
      setPaymentStatus('failed');
      const errorMsg = error.message || 'Failed to initiate payment. Please try again.';
      setErrorMessage(errorMsg);
      
      toast.error('❌ Payment Failed', {
        description: errorMsg,
        duration: 10000,
      });
      setProcessing(false);
    }
  };

  const resetDialog = () => {
    setSelectedMethod(null);
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

  const selectedMethodData = paymentMethods.find(m => m.id === selectedMethod);

  // Simplified form validation - button active when basic requirements met
  const isFormValid = () => {
    if (processing) return false;
    if (selectedMethod === 'mpesa') {
      return phoneNumber.trim().length === 10;
    }
    if (selectedMethod === 'card') {
      return true;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10">
            {paymentStatus === 'success' ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : paymentStatus === 'failed' ? (
              <XCircle className="w-8 h-8 text-red-600" />
            ) : (
              <Wallet className="w-8 h-8 text-primary" />
            )}
          </div>
          <DialogTitle className="text-center text-2xl">
            {paymentStatus === 'success' ? 'Payment Successful!' :
             paymentStatus === 'failed' ? 'Payment Failed' :
             paymentStatus === 'pending' ? 'Processing Payment' :
             selectedMethod ? `${selectedMethodData?.name} Payment` : 'Pay for Your Order'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {paymentStatus === 'success' ? 'Your payment has been confirmed successfully' :
             paymentStatus === 'failed' ? 'Payment was not completed. Please try again.' :
             paymentStatus === 'pending' ? 'Please complete the payment' :
             selectedMethod ? 'Enter your details to complete payment' : 
             'Securely pay for your order using Card or M-Pesa'}
          </DialogDescription>
        </DialogHeader>

        {/* Method Selection Screen */}
        {paymentStatus === 'idle' && !selectedMethod && (
          <div className="space-y-6 py-4">
            <div className="text-center p-6 border-2 rounded-lg bg-muted/30 border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
              <p className="text-4xl font-bold text-primary">
                KES {amount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-2 truncate">{jobTitle}</p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Payment Method</Label>
              <div className="grid grid-cols-1 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`
                        flex items-center gap-4 p-4 rounded-lg border-2 
                        transition-all duration-200 hover:scale-[1.02]
                        ${method.color} ${method.hoverColor} text-white
                      `}
                    >
                      <Icon className="w-10 h-10" />
                      <div className="text-left flex-1">
                        <p className="font-bold text-lg">{method.name}</p>
                        <p className="text-sm text-white/90">{method.description}</p>
                      </div>
                      <ArrowLeft className="w-5 h-5 rotate-180" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground border-t pt-4">
              🔒 Secure payment powered by Paystack
            </div>
          </div>
        )}

        {/* Payment Details Screen */}
        {paymentStatus === 'idle' && selectedMethod && (
          <div className="space-y-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMethod(null)}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Choose Different Method
            </Button>

            <div className={`p-4 border-2 rounded-lg ${selectedMethodData?.color.replace('bg-', 'bg-').replace('-600', '-50')} dark:${selectedMethodData?.color.replace('bg-', 'bg-').replace('-600', '-950/20')} border-${selectedMethodData?.color.replace('bg-', '').replace('-600', '-300')}`}>
              <div className="flex items-center gap-3 mb-2">
                {selectedMethodData && <selectedMethodData.icon className={`w-6 h-6 ${selectedMethodData.color.replace('bg-', 'text-')}`} />}
                <span className="font-semibold text-lg">{selectedMethodData?.name}</span>
              </div>
              <p className={`text-3xl font-bold ${selectedMethodData?.color.replace('bg-', 'text-')}`}>
                KES {amount.toFixed(2)}
              </p>
            </div>

            {selectedMethod === 'mpesa' && (
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
            )}

            {selectedMethod === 'card' && (
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900 dark:text-blue-200">
                  You will be redirected to a secure Paystack page to enter your card details.
                </AlertDescription>
              </Alert>
            )}

            {errorMessage && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedMethod(null)}
                disabled={processing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={selectedMethod === 'mpesa' ? handleDirectMpesaPayment : handlePaystackPayment}
                disabled={!isFormValid()}
                className={`flex-1 ${selectedMethodData?.color} ${selectedMethodData?.hoverColor} text-white font-semibold`}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {selectedMethod === 'card' ? <CreditCard className="w-4 h-4 mr-2" /> : <Phone className="w-4 h-4 mr-2" />}
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
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">Processing Payment...</p>
                <p className="text-sm text-muted-foreground">
                  {selectedMethod === 'card' 
                    ? 'Complete payment in the popup window' 
                    : 'Check your phone for M-PESA prompt'}
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

            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900 dark:text-blue-200">
                {selectedMethod === 'card' 
                  ? 'Enter your card details in the secure Paystack popup window.'
                  : 'Enter your M-PESA PIN on your phone to complete payment.'}
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
                    <li>Incorrect payment details</li>
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
                className="flex-1 bg-primary hover:bg-primary/90 font-semibold"
                onClick={() => {
                  setPaymentStatus('idle');
                  setSelectedMethod(null);
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

declare global {
  interface Window {
    PaystackPop: any;
  }
}