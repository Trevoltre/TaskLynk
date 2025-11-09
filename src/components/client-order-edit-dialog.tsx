"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2, X, FileIcon, Calculator, Info, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

// Service Catalog with Pricing (same as Place Order page)
const SERVICE_CATALOG = {
  // Academic & Writing Services
  'essay': { name: 'Essay', rate: 250, unit: 'per page', type: 'page', workType: 'Essay' },
  'assignment': { name: 'Assignment', rate: 250, unit: 'per page', type: 'page', workType: 'Assignment' },
  'research-proposal': { name: 'Research Proposal', rate: 300, unit: 'per page', type: 'page', workType: 'Research Proposal' },
  'thesis-writing': { name: 'Thesis Writing', rate: 300, unit: 'per page', type: 'page', workType: 'Thesis Writing' },
  'research-paper': { name: 'Research Paper', rate: 250, unit: 'per page', type: 'page', workType: 'Research Paper' },
  'dissertation': { name: 'Dissertation', rate: 300, unit: 'per page', type: 'page', workType: 'Dissertation' },
  'case-study': { name: 'Case Study', rate: 250, unit: 'per page', type: 'page', workType: 'Case Study' },
  'lab-report': { name: 'Lab Report', rate: 250, unit: 'per page', type: 'page', workType: 'Lab Report' },
  'article-writing': { name: 'Article Writing', rate: 200, unit: 'per page', type: 'page', workType: 'Article Writing' },
  'blog-writing': { name: 'Blog Writing', rate: 200, unit: 'per page', type: 'page', workType: 'Blog Writing' },
  
  // Presentation & Design Services
  'presentation': { name: 'Presentation', rate: 150, unit: 'per slide', type: 'slide', workType: 'Presentation' },
  'powerpoint-design': { name: 'PowerPoint Design', rate: 150, unit: 'per slide', type: 'slide', workType: 'PowerPoint Design' },
  'slide-design': { name: 'Slide Design', rate: 150, unit: 'per slide', type: 'slide', workType: 'Slide Design' },
  
  // Editing & Quality Improvement
  'grammar-proofreading': { name: 'Grammar & Proofreading', rate: 30, unit: 'per page', type: 'page', category: 'editing', workType: 'Grammar & Proofreading' },
  'ai-content-removal': { name: 'AI Content Removal', rate: 50, unit: 'per page', type: 'page', category: 'editing', workType: 'AI Content Removal' },
  'humanization': { name: 'Humanization', rate: 50, unit: 'per page', type: 'page', category: 'editing', workType: 'Humanization' },
  'plagiarism-ai-detection': { name: 'Plagiarism + AI Detection Report', rate: 30, unit: 'per document', type: 'document', category: 'editing', workType: 'Plagiarism + AI Detection Report' },
  'formatting-referencing': { name: 'Formatting & Referencing', rate: 25, unit: 'per page', type: 'page', category: 'editing', workType: 'Formatting & Referencing' },
  
  // Document Management
  'pdf-editing': { name: 'PDF Editing', rate: 50, unit: 'per page', type: 'page', workType: 'PDF Editing' },
  'document-conversion': { name: 'Document Conversion', rate: 10, unit: 'per file', type: 'file', workType: 'Document Conversion' },
  'file-compression': { name: 'File Compression', rate: 20, unit: 'per file', type: 'file', workType: 'File Compression' },
  
  // Data Analysis Services
  'data-analysis': { name: 'Data Analysis', rate: 350, unit: 'per dataset', type: 'dataset', workType: 'Data Analysis' },
  'spss': { name: 'SPSS', rate: 350, unit: 'per dataset', type: 'dataset', workType: 'SPSS' },
  'excel': { name: 'Excel', rate: 350, unit: 'per dataset', type: 'dataset', workType: 'Excel' },
  'r-programming': { name: 'R Programming', rate: 350, unit: 'per dataset', type: 'dataset', workType: 'R Programming' },
  'python': { name: 'Python', rate: 350, unit: 'per dataset', type: 'dataset', workType: 'Python' },
  'stata': { name: 'STATA', rate: 350, unit: 'per dataset', type: 'dataset', workType: 'STATA' },
  'jasp': { name: 'JASP', rate: 350, unit: 'per dataset', type: 'dataset', workType: 'JASP' },
  'jamovi': { name: 'JAMOVI', rate: 350, unit: 'per dataset', type: 'dataset', workType: 'JAMOVI' },
  
  // Design Services
  'infographics': { name: 'Infographics', rate: 150, unit: 'per graphic', type: 'graphic', workType: 'Infographics' },
  'data-visualization': { name: 'Data Visualization', rate: 150, unit: 'per graphic', type: 'graphic', workType: 'Data Visualization' },
  'poster-design': { name: 'Poster Design', rate: 200, unit: 'per design', type: 'design', workType: 'Poster Design' },
  'resume-design': { name: 'Resume Design', rate: 200, unit: 'per design', type: 'design', workType: 'Resume Design' },
  'brochure-design': { name: 'Brochure Design', rate: 200, unit: 'per design', type: 'design', workType: 'Brochure Design' },
  
  // Additional Services
  'revision-support': { name: 'Revision Support', rate: 100, unit: 'per revision', type: 'revision', workType: 'Revision Support' },
  'expert-consultation': { name: 'Expert Consultation', rate: 500, unit: 'per hour', type: 'hour', workType: 'Expert Consultation' },
  'tutoring': { name: 'Tutoring', rate: 500, unit: 'per hour', type: 'hour', workType: 'Tutoring' },
};

// Helper function: Find serviceType key by workType value
function findServiceTypeByWorkType(workType: string): string | null {
  for (const [key, value] of Object.entries(SERVICE_CATALOG)) {
    if (value.workType === workType) {
      return key;
    }
  }
  return null;
}

type Job = {
  id: number;
  title: string;
  instructions: string;
  workType: string;
  pages: number | null;
  slides: number | null;
  amount: number;
  deadline: string;
  actualDeadline: string;
};

type ClientOrderEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  onEdit: (updatedJob: Job) => void;
};

export function ClientOrderEditDialog({
  open,
  onOpenChange,
  job,
  onEdit,
}: ClientOrderEditDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [customAmountMode, setCustomAmountMode] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: 'uploading' | 'success' | 'error' }>({});

  useEffect(() => {
    if (job && open) {
      setTitle(job.title);
      setInstructions(job.instructions);
      
      // Map workType back to serviceType
      const foundServiceType = findServiceTypeByWorkType(job.workType);
      setServiceType(foundServiceType || '');
      
      // Determine quantity based on pages or slides
      if (job.pages) {
        setQuantity(job.pages.toString());
      } else if (job.slides) {
        setQuantity(job.slides.toString());
      } else {
        setQuantity('1');
      }
      
      setAmount(job.amount.toString());
      const deadlineDate = new Date(job.actualDeadline);
      setDeadline(deadlineDate.toISOString().slice(0, 16));
      setFiles([]);
      setCustomAmountMode(false);
      setUploadProgress({});
    }
  }, [job, open]);

  const calculateAmount = (serviceType: string, quantity: string, deadline: string) => {
    const service = SERVICE_CATALOG[serviceType as keyof typeof SERVICE_CATALOG];
    if (!service || !quantity) return 0;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return 0;

    let baseAmount = service.rate * qty;

    // Check if urgent (less than 8 hours) - silently apply multiplier
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const now = new Date();
      const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Apply 1.30x for urgent orders (except editing services)
      if (hoursUntilDeadline < 8 && service.category !== 'editing') {
        baseAmount *= 1.3;
      }
    }

    return Math.round(baseAmount);
  };

  const handleServiceTypeChange = (value: string) => {
    setServiceType(value);
    setQuantity('');
    if (!customAmountMode) {
      setAmount('');
    }
  };

  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    if (!customAmountMode) {
      const calculatedAmount = calculateAmount(serviceType, value, deadline);
      setAmount(calculatedAmount.toString());
    }
  };

  const handleDeadlineChange = (value: string) => {
    setDeadline(value);
    if (!customAmountMode) {
      const calculatedAmount = calculateAmount(serviceType, quantity, value);
      setAmount(calculatedAmount.toString());
    }
  };

  const handleCustomAmountChange = (value: string) => {
    const enteredAmount = parseFloat(value);
    const minAmount = calculateAmount(serviceType, quantity, deadline);
    
    if (value && !isNaN(enteredAmount) && enteredAmount < minAmount) {
      toast.error(`Amount cannot be less than computed price: KSh ${minAmount.toFixed(2)}`);
    }
    
    setAmount(value);
  };

  const toggleCustomAmount = () => {
    if (!customAmountMode) {
      setCustomAmountMode(true);
      toast.info('You can now set a custom amount (must not be less than computed price)');
    } else {
      setCustomAmountMode(false);
      const calculatedAmount = calculateAmount(serviceType, quantity, deadline);
      setAmount(calculatedAmount.toString());
      toast.info('Switched back to automatic price calculation');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    
    // Validate each file
    for (const file of newFiles) {
      // Check if file is a video
      const videoTypes = ['video/mp4', 'video/avi', 'video/x-msvideo', 'video/quicktime', 
                         'video/x-ms-wmv', 'video/x-flv', 'video/webm'];
      if (videoTypes.includes(file.type)) {
        toast.error(`Video files are not allowed: ${file.name}`);
        return;
      }

      // Check individual file size (40MB)
      const maxSize = 40 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File ${file.name} exceeds 40MB limit`);
        return;
      }
    }

    const currentFiles = [...files, ...newFiles];

    // Validate: Maximum 10 files
    if (currentFiles.length > 10) {
      toast.error('Maximum 10 files allowed');
      return;
    }

    setFiles(currentFiles);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    setFiles(files.filter((_, i) => i !== index));
    
    // Remove from upload progress tracking
    const newProgress = { ...uploadProgress };
    delete newProgress[fileToRemove.name];
    setUploadProgress(newProgress);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const uploadFileToStorage = async (file: File): Promise<{ url: string; success: boolean }> => {
    try {
      // Update progress
      setUploadProgress(prev => ({ ...prev, [file.name]: 'uploading' }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('jobId', job.id.toString());
      formData.append('uploadedBy', user?.id?.toString() || '');
      formData.append('uploadType', 'initial');

      const uploadResponse = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await uploadResponse.json();
      
      // Update progress to success
      setUploadProgress(prev => ({ ...prev, [file.name]: 'success' }));
      
      return { url: data.attachment.fileUrl, success: true };
    } catch (error) {
      console.error('File upload error:', error);
      
      // Update progress to error
      setUploadProgress(prev => ({ ...prev, [file.name]: 'error' }));
      
      return { url: '', success: false };
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!instructions.trim()) {
      toast.error('Please enter instructions');
      return;
    }

    if (!serviceType) {
      toast.error('Please select a work type');
      return;
    }

    const qtyNum = parseFloat(quantity);
    if (!qtyNum || qtyNum <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const minAmount = calculateAmount(serviceType, quantity, deadline);
    if (customAmountMode && amountNum < minAmount) {
      toast.error(`Amount cannot be less than the computed price: KSh ${minAmount.toFixed(2)}`);
      return;
    }

    if (!deadline) {
      toast.error('Please select a deadline');
      return;
    }

    if (!user?.id) {
      toast.error('User session not found. Please log in again.');
      return;
    }

    setProcessing(true);

    try {
      // Step 1: Update job details
      const service = SERVICE_CATALOG[serviceType as keyof typeof SERVICE_CATALOG];
      const backendWorkType = service ? service.workType : serviceType;

      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          instructions: instructions.trim(),
          workType: backendWorkType,
          pages: service && service.type === 'page' ? qtyNum : null,
          slides: service && service.type === 'slide' ? qtyNum : null,
          amount: amountNum,
          deadline: new Date(deadline).toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      const updatedJob = await response.json();

      // Step 2: Upload files if any
      if (files.length > 0) {
        toast.info(`Uploading ${files.length} file(s)...`);
        
        let successCount = 0;
        let errorCount = 0;

        for (const file of files) {
          const { success } = await uploadFileToStorage(file);
          if (success) {
            successCount++;
          } else {
            errorCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`${successCount} file(s) uploaded successfully!`);
        }
        
        if (errorCount > 0) {
          toast.error(`${errorCount} file(s) failed to upload`);
        }
      }

      toast.success('Order updated successfully!');
      onEdit(updatedJob);
      onOpenChange(false);
      
      // Reset upload progress after closing
      setTimeout(() => {
        setUploadProgress({});
      }, 500);
      
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update order. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const selectedService = serviceType ? SERVICE_CATALOG[serviceType as keyof typeof SERVICE_CATALOG] : null;
  const totalFileSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Order</DialogTitle>
          <DialogDescription>
            Update order details, extend deadline, or add files
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter order title"
              disabled={processing}
            />
          </div>

          <div>
            <Label htmlFor="serviceType">Work Type *</Label>
            <Select value={serviceType} onValueChange={handleServiceTypeChange} disabled={processing}>
              <SelectTrigger id="serviceType">
                <SelectValue placeholder="Select work type" />
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                <SelectItem value="essay">Essay</SelectItem>
                <SelectItem value="assignment">Assignment</SelectItem>
                <SelectItem value="research-proposal">Research Proposal</SelectItem>
                <SelectItem value="thesis-writing">Thesis Writing</SelectItem>
                <SelectItem value="research-paper">Research Paper</SelectItem>
                <SelectItem value="presentation">Presentation</SelectItem>
                <SelectItem value="powerpoint-design">PowerPoint Design</SelectItem>
                <SelectItem value="slide-design">Slide Design</SelectItem>
                <SelectItem value="dissertation">Dissertation</SelectItem>
                <SelectItem value="case-study">Case Study</SelectItem>
                <SelectItem value="lab-report">Lab Report</SelectItem>
                <SelectItem value="article-writing">Article Writing</SelectItem>
                <SelectItem value="blog-writing">Blog Writing</SelectItem>
                <SelectItem value="grammar-proofreading">Grammar & Proofreading</SelectItem>
                <SelectItem value="ai-content-removal">AI Content Removal</SelectItem>
                <SelectItem value="humanization">Humanization</SelectItem>
                <SelectItem value="plagiarism-ai-detection">Plagiarism + AI Detection Report</SelectItem>
                <SelectItem value="formatting-referencing">Formatting & Referencing</SelectItem>
                <SelectItem value="pdf-editing">PDF Editing</SelectItem>
                <SelectItem value="document-conversion">Document Conversion</SelectItem>
                <SelectItem value="file-compression">File Compression</SelectItem>
                <SelectItem value="data-analysis">Data Analysis</SelectItem>
                <SelectItem value="spss">SPSS</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="r-programming">R Programming</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="stata">STATA</SelectItem>
                <SelectItem value="jasp">JASP</SelectItem>
                <SelectItem value="jamovi">JAMOVI</SelectItem>
                <SelectItem value="infographics">Infographics</SelectItem>
                <SelectItem value="data-visualization">Data Visualization</SelectItem>
                <SelectItem value="poster-design">Poster Design</SelectItem>
                <SelectItem value="resume-design">Resume Design</SelectItem>
                <SelectItem value="brochure-design">Brochure Design</SelectItem>
                <SelectItem value="revision-support">Revision Support</SelectItem>
                <SelectItem value="expert-consultation">Expert Consultation</SelectItem>
                <SelectItem value="tutoring">Tutoring</SelectItem>
              </SelectContent>
            </Select>
            {selectedService && (
              <p className="text-xs text-muted-foreground mt-1">
                Rate: KSh {selectedService.rate} {selectedService.unit}
              </p>
            )}
          </div>

          {selectedService && (
            <div>
              <Label htmlFor="quantity">
                {selectedService.type === 'page' && 'Number of Pages'}
                {selectedService.type === 'slide' && 'Number of Slides'}
                {selectedService.type === 'dataset' && 'Number of Datasets'}
                {selectedService.type === 'document' && 'Number of Documents'}
                {selectedService.type === 'graphic' && 'Number of Graphics'}
                {selectedService.type === 'design' && 'Number of Designs'}
                {selectedService.type === 'file' && 'Number of Files'}
                {selectedService.type === 'hour' && 'Number of Hours'}
                {selectedService.type === 'revision' && 'Number of Revisions'}
                *
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step={selectedService.type === 'hour' ? '0.5' : '1'}
                placeholder="Enter quantity"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                disabled={processing}
              />
            </div>
          )}

          <div>
            <Label htmlFor="deadline">Deadline *</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => handleDeadlineChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
              disabled={processing}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The final deadline for your completed work
            </p>
          </div>

          {/* Price Calculation Display */}
          {amount && selectedService && quantity && (
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-primary">Price Calculation</h3>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Service:</span>
                  <span className="font-medium">{selectedService.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Rate:</span>
                  <span className="font-medium">KSh {selectedService.rate} {selectedService.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Quantity:</span>
                  <span className="font-medium">{quantity}</span>
                </div>
                <div className="pt-2 border-t border-primary/20">
                  <div className="flex justify-between items-center text-sm text-muted-foreground mb-1">
                    <span>Computed Amount:</span>
                    <span className="font-medium">KSh {calculateAmount(serviceType, quantity, deadline).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Custom Amount Toggle and Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Payment Amount</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleCustomAmount}
                    disabled={processing}
                  >
                    {customAmountMode ? 'Use Auto Amount' : 'Set Custom Amount'}
                  </Button>
                </div>

                {customAmountMode ? (
                  <div className="space-y-2">
                    <Label htmlFor="customAmount">Custom Amount (KSh) *</Label>
                    <Input
                      id="customAmount"
                      type="number"
                      min={calculateAmount(serviceType, quantity, deadline)}
                      step="0.01"
                      placeholder={`Minimum: ${calculateAmount(serviceType, quantity, deadline)}`}
                      value={amount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      disabled={processing}
                      className="text-lg font-semibold"
                    />
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>Minimum: KSh {calculateAmount(serviceType, quantity, deadline).toFixed(2)}</strong>
                        <br />
                        You can set a higher amount to incentivize quality work.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Final Payment Amount:</span>
                      <span className="text-2xl font-bold text-primary">
                        KSh {parseFloat(amount).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click "Set Custom Amount" to modify this amount
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="instructions">Instructions *</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Detailed instructions for the order"
              rows={6}
              disabled={processing}
            />
          </div>

          <div>
            <Label>Add Additional Files (Optional)</Label>
            <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                id="file-upload-edit"
                multiple
                onChange={handleFileChange}
                disabled={processing || files.length >= 10}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png,.gif"
              />
              <label htmlFor="file-upload-edit" className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click to upload files</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Up to 10 files, each under 40MB
                </p>
                <p className="text-xs text-muted-foreground">
                  Documents, images, presentations, spreadsheets, archives
                </p>
                <p className="text-xs text-destructive font-medium mt-1">
                  ⚠️ No video files allowed
                </p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium">{files.length} file(s) selected</span>
                  <span className="text-xs text-muted-foreground">
                    Total: {formatFileSize(totalFileSize)}
                  </span>
                </div>
                {files.map((file, index) => {
                  const status = uploadProgress[file.name];
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                            {status === 'uploading' && (
                              <span className="text-xs text-blue-600 flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Uploading...
                              </span>
                            )}
                            {status === 'success' && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Uploaded
                              </span>
                            )}
                            {status === 'error' && (
                              <span className="text-xs text-destructive">
                                Failed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={processing || status === 'uploading'}
                        className="flex-shrink-0 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {files.length > 0 && (
              <Alert className="mt-3">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Files will be uploaded to secure cloud storage when you click "Update Order"
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={processing}>
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {files.length > 0 ? 'Updating & Uploading...' : 'Updating...'}
              </>
            ) : (
              'Update Order'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}