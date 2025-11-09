"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type InvoiceData = {
  invoiceNumber: string;
  invoiceDate: string;
  payment: {
    id: number;
    amount: number;
    mpesaCode: string | null;
    status: string;
    createdAt: string;
  };
  job: {
    title: string;
    workType: string;
    pages: number | null;
    slides: number | null;
  };
  client: {
    name: string;
    email: string;
    phone: string;
  };
  freelancer: {
    name: string;
    email: string;
    phone: string;
  };
  subtotal: number;
  tax: number;
  total: number;
};

export function InvoiceGenerator({ paymentId, onClose }: { paymentId: number; onClose: () => void }) {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  const generateInvoice = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId })
      });

      if (response.ok) {
        const data = await response.json();
        setInvoice(data);
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err?.error || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      toast.error('Network error while generating invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-generate on open so totals are always computed
    generateInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!invoice) return;
    
    const printContent = document.getElementById('invoice-content');
    if (!printContent) return;

    const newWindow = window.open('', '_blank');
    if (!newWindow) return;

    newWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 40px; }
            .details { margin-bottom: 30px; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            .table th { background-color: #f4f4f4; }
            .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    newWindow.document.close();
    newWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) onClose();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice Generator
          </DialogTitle>
          <DialogDescription>
            Generate and download invoice for payment #{paymentId}
          </DialogDescription>
        </DialogHeader>

        {!invoice ? (
          <div className="text-center py-12">
            <Button onClick={generateInvoice} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 justify-end mb-4 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>

            <div id="invoice-content" className="bg-white text-black p-8 rounded-lg">
              {/* Header */}
              <div className="text-center mb-8 border-b pb-6">
                <h1 className="text-3xl font-bold text-primary mb-2">TaskLynk</h1>
                <p className="text-sm text-gray-600">Professional Academic Writing Platform</p>
                <p className="text-sm text-gray-600">Nairobi, Kenya</p>
                <p className="text-sm text-gray-600">tasklynk01@gmail.com | +254701066845</p>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold mb-2">Bill To:</h3>
                  <p className="font-medium">{invoice.client.name}</p>
                  <p className="text-sm text-gray-600">{invoice.client.email}</p>
                  <p className="text-sm text-gray-600">{invoice.client.phone}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold mb-4">INVOICE</h2>
                  <p className="text-sm mb-1"><span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber}</p>
                  <p className="text-sm mb-1"><span className="font-semibold">Date:</span> {format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}</p>
                  <p className="text-sm"><span className="font-semibold">Status:</span> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      invoice.payment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                      invoice.payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {invoice.payment.status.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>

              {/* Freelancer Details */}
              <div className="mb-8">
                <h3 className="font-semibold mb-2">Freelancer:</h3>
                <p className="font-medium">{invoice.freelancer.name}</p>
                <p className="text-sm text-gray-600">{invoice.freelancer.email}</p>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-left">Description</th>
                    <th className="border border-gray-300 px-4 py-3 text-left">Type</th>
                    <th className="border border-gray-300 px-4 py-3 text-left">Quantity</th>
                    <th className="border border-gray-300 px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-4 py-3">{invoice.job.title}</td>
                    <td className="border border-gray-300 px-4 py-3 capitalize">{invoice.job.workType}</td>
                    <td className="border border-gray-300 px-4 py-3">
                      {invoice.job.pages && `${invoice.job.pages} pages`}
                      {invoice.job.pages && invoice.job.slides && ' + '}
                      {invoice.job.slides && `${invoice.job.slides} slides`}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-right">
                      KSh {invoice.payment.amount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mb-8">
                <div className="w-64">
                  <div className="flex justify-between py-2 border-b">
                    <span>Subtotal:</span>
                    <span>KSh {invoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span>Tax:</span>
                    <span>KSh {invoice.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-3 text-xl font-bold">
                    <span>Total:</span>
                    <span>KSh {invoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              {invoice.payment.mpesaCode && (
                <div className="bg-gray-50 p-4 rounded-lg mb-8">
                  <h3 className="font-semibold mb-2">Payment Details</h3>
                  <p className="text-sm"><span className="font-semibold">M-Pesa Code:</span> {invoice.payment.mpesaCode}</p>
                  <p className="text-sm"><span className="font-semibold">Payment Date:</span> {format(new Date(invoice.payment.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-sm text-gray-500 border-t pt-6">
                <p>Thank you for your business!</p>
                <p className="mt-2">This is a computer-generated invoice and does not require a signature.</p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}