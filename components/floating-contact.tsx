"use client";

import { useState } from 'react';
import { Phone, MessageCircle, X, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function FloatingContact() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPhoneOptions, setShowPhoneOptions] = useState(false);

  const handleWhatsAppClick = () => {
    const phone = '254701066845';
    const message = encodeURIComponent('Hello, I need assistance with my order on TaskLynk.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const handleCallClick = (phone: string) => {
    window.open(`tel:+${phone}`, '_self');
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Expanded Contact Card */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Card className="shadow-2xl border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">Contact Us</CardTitle>
                <CardDescription className="text-sm">
                  We're here to help!
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsOpen(false);
                  setShowPhoneOptions(false);
                }}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* WhatsApp Option */}
              <Button
                onClick={handleWhatsAppClick}
                className="w-full justify-start gap-3 h-12"
                variant="outline"
              >
                <MessageCircle className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <div className="font-semibold">Chat on WhatsApp</div>
                  <div className="text-xs text-muted-foreground">+254 701 066 845</div>
                </div>
              </Button>

              {/* Call Option */}
              {!showPhoneOptions ? (
                <Button
                  onClick={() => setShowPhoneOptions(true)}
                  className="w-full justify-start gap-3 h-12"
                  variant="outline"
                >
                  <Phone className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold">Call Us</div>
                    <div className="text-xs text-muted-foreground">Select a number</div>
                  </div>
                  <ChevronUp className="h-4 w-4 ml-auto" />
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={() => setShowPhoneOptions(false)}
                    className="w-full justify-start gap-3 h-12"
                    variant="outline"
                  >
                    <Phone className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <div className="font-semibold">Call Us</div>
                      <div className="text-xs text-muted-foreground">Select a number</div>
                    </div>
                    <ChevronUp className="h-4 w-4 ml-auto rotate-180" />
                  </Button>
                  
                  <div className="pl-4 space-y-2">
                    <Button
                      onClick={() => handleCallClick('254701066845')}
                      className="w-full justify-start gap-3 h-10 text-sm"
                      variant="secondary"
                    >
                      <Phone className="h-4 w-4" />
                      +254 701 066 845
                    </Button>
                    <Button
                      onClick={() => handleCallClick('254702794172')}
                      className="w-full justify-start gap-3 h-10 text-sm"
                      variant="secondary"
                    >
                      <Phone className="h-4 w-4" />
                      +254 702 794 172
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
