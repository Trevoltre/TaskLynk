"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Info, Calculator, ExternalLink, Link as LinkIcon, CheckCircle, X, Send, Phone, Upload, File as FileIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Service Catalog with Pricing
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
  
  // Other Services
  'other': { name: 'Other', rate: 150, unit: 'per page', type: 'page', workType: 'Other' },
};

export default function NewJobPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestDraft, setRequestDraft] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  
  // Files.fm link upload state
  const [stagedLinks, setStagedLinks] = useState<Array<{fileName: string, fileUrl: string}>>([]);
  const [linkInput, setLinkInput] = useState('');
  
  // Direct file upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  const [customAmountMode, setCustomAmountMode] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    instructions: '',
    serviceType: '',
    quantity: '',
    amount: '',
    deadline: '',
  });

  useEffect(() => {
    // Setup broadcast channel for real-time dashboard updates
    const bc = new BroadcastChannel('client_dashboard');
    channelRef.current = bc;
    // Initialize from any existing draft value
    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem('draftWorkType') || '';
      if (existing) {
        bc.postMessage({ type: 'draftWorkType', value: existing });
      }
    }
    return () => {
      bc.close();
    };
  }, []);

  // Calculate amount based on service type and quantity
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
      
      // Apply 1.30x for urgent orders (except editing services) - done silently
      if (hoursUntilDeadline < 8 && service.category !== 'editing') {
        baseAmount *= 1.3;
      }
    }

    return Math.round(baseAmount);
  };

  // Auto-calculate when service type, quantity, or deadline changes
  const handleServiceTypeChange = (value: string) => {
    setFormData({ ...formData, serviceType: value, quantity: '', amount: '' });
    setCustomAmountMode(false);
    // Broadcast and persist selection for dashboard real-time update
    try {
      localStorage.setItem('draftWorkType', value);
      channelRef.current?.postMessage({ type: 'draftWorkType', value });
    } catch {}
  };

  const handleQuantityChange = (value: string) => {
    const newFormData = { ...formData, quantity: value };
    if (!customAmountMode) {
      const calculatedAmount = calculateAmount(newFormData.serviceType, value, newFormData.deadline);
      setFormData({ ...newFormData, amount: calculatedAmount.toString() });
    } else {
      setFormData(newFormData);
    }
  };

  const handleDeadlineChange = (value: string) => {
    const newFormData = { ...formData, deadline: value };
    if (!customAmountMode) {
      const calculatedAmount = calculateAmount(newFormData.serviceType, newFormData.quantity, value);
      setFormData({ ...newFormData, amount: calculatedAmount.toString() });
    } else {
      setFormData(newFormData);
    }
  };

  const handleCustomAmountChange = (value: string) => {
    const enteredAmount = parseFloat(value);
    const minAmount = calculateAmount(formData.serviceType, formData.quantity, formData.deadline);
    
    // Only validate if user has entered a complete number
    if (value && !isNaN(enteredAmount) && enteredAmount < minAmount) {
      toast.error(`Amount cannot be less than computed price: KSh ${minAmount.toFixed(2)}`);
    }
    
    setFormData({ ...formData, amount: value });
  };

  const toggleCustomAmount = () => {
    if (!customAmountMode) {
      // Switching to custom mode - keep calculated amount as starting point
      setCustomAmountMode(true);
      toast.info('You can now set a custom amount (must not be less than computed price)');
    } else {
      // Switching back to auto mode - recalculate
      setCustomAmountMode(false);
      const calculatedAmount = calculateAmount(formData.serviceType, formData.quantity, formData.deadline);
      setFormData({ ...formData, amount: calculatedAmount.toString() });
      toast.info('Switched back to automatic price calculation');
    }
  };

  // Validate files.fm link
  const isValidFilesFmLink = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('files.fm');
    } catch {
      return false;
    }
  };

  // Add link to staging area
  const handleAddLinkToStaging = () => {
    if (!linkInput.trim()) {
      toast.error('Please enter a files.fm link');
      return;
    }

    if (!isValidFilesFmLink(linkInput)) {
      toast.error('Please enter a valid files.fm link (e.g., https://files.fm/...)');
      return;
    }

    // Check for duplicates
    if (stagedLinks.some(link => link.fileUrl === linkInput.trim())) {
      toast.error('This link has already been added');
      return;
    }

    // Extract file name from URL or use default
    let fileName = 'Shared File';
    try {
      const urlObj = new URL(linkInput);
      const pathParts = urlObj.pathname.split('/');
      fileName = pathParts[pathParts.length - 1] || 'Shared File';
    } catch {}

    setStagedLinks([...stagedLinks, { fileName, fileUrl: linkInput.trim() }]);
    setLinkInput('');
    toast.success('Link added to list');
  };

  const removeStagedLink = (index: number) => {
    setStagedLinks(stagedLinks.filter((_, i) => i !== index));
    toast.info('Link removed from list');
  };

  // Handle direct file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) selected`);
    }
  };

  // Remove selected file
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      const quantity = parseFloat(formData.quantity);
      const amount = parseFloat(formData.amount);
      const minAmount = calculateAmount(formData.serviceType, formData.quantity, formData.deadline);

      if (!quantity || quantity <= 0) {
        setError('Please enter a valid quantity');
        setLoading(false);
        return;
      }

      if (!amount || amount <= 0) {
        setError('Amount must be greater than 0');
        setLoading(false);
        return;
      }

      // Validate custom amount is not less than computed amount
      if (customAmountMode && amount < minAmount) {
        setError(`Amount cannot be less than the computed price: KSh ${minAmount.toFixed(2)}`);
        setLoading(false);
        return;
      }

      // Calculate deadlines
      const actualDeadline = new Date(formData.deadline);
      const now = new Date();
      const totalTime = actualDeadline.getTime() - now.getTime();
      
      // Freelancer gets 60% of the time
      const freelancerTime = totalTime * 0.6;
      const freelancerDeadline = new Date(now.getTime() + freelancerTime);

      const service = SERVICE_CATALOG[formData.serviceType as keyof typeof SERVICE_CATALOG];
      const backendWorkType = service ? service.workType : formData.serviceType;

      // Step 1: Create the job
      const jobResponse = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: user?.id,
          title: formData.title,
          instructions: formData.instructions,
          workType: backendWorkType,
          pages: service && service.type === 'page' ? parseFloat(formData.quantity) : null,
          slides: service && service.type === 'slide' ? parseFloat(formData.quantity) : null,
          amount: parseFloat(formData.amount),
          deadline: actualDeadline.toISOString(),
          actualDeadline: actualDeadline.toISOString(),
          freelancerDeadline: freelancerDeadline.toISOString(),
          requestDraft,
        }),
      });

      if (!jobResponse.ok) {
        const data = await jobResponse.json();
        setError(data.error || 'Failed to create job');
        setLoading(false);
        return;
      }

      const createdJob = await jobResponse.json();

      // Notify dashboard immediately
      try {
        localStorage.removeItem('draftWorkType');
        channelRef.current?.postMessage({ type: 'draftWorkType', value: '' });
        channelRef.current?.postMessage({ type: 'jobCreated', jobId: createdJob.id });
      } catch {}

      // Step 2: Upload selected files
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        toast.info(`Uploading ${selectedFiles.length} file(s)...`);
        
        try {
          for (const file of selectedFiles) {
            // Upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('jobId', createdJob.id.toString());
            formData.append('folder', 'tasklynk/uploads');

            const uploadResponse = await fetch('/api/cloudinary/upload', {
              method: 'POST',
              body: formData,
            });

            if (!uploadResponse.ok) {
              console.error('Failed to upload file:', file.name);
              toast.error(`Failed to upload: ${file.name}`);
              continue;
            }

            const uploadData = await uploadResponse.json();

            // Save to database
            const attachmentResponse = await fetch(`/api/jobs/${createdJob.id}/attachments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                fileUrl: uploadData.url,
                fileSize: file.size,
                fileType: file.type,
                uploadType: 'initial',
                uploadedBy: user?.id,
              }),
            });

            if (!attachmentResponse.ok) {
              console.error('Failed to save file metadata:', file.name);
              toast.error(`Failed to save: ${file.name}`);
            }
          }
          
          toast.success(`${selectedFiles.length} file(s) uploaded successfully!`);
        } catch (error) {
          console.error('File upload error:', error);
          toast.error('Some files failed to upload');
        } finally {
          setUploadingFiles(false);
        }
      }

      // Step 3: Send files.fm links as messages
      if (stagedLinks.length > 0) {
        toast.info('Submitting links as messages...');
        
        for (const link of stagedLinks) {
          const response = await fetch(`/api/jobs/${createdJob.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: user?.id,
              message: link.fileUrl,
              messageType: 'link',
            }),
          });

          if (!response.ok) {
            console.error('Failed to send link as message:', link.fileName);
            toast.error(`Failed to send link: ${link.fileName}`);
          }
        }
        
        const fileCount = selectedFiles.length;
        const linkCount = stagedLinks.length;
        const totalCount = fileCount + linkCount;
        
        toast.success(`Job posted successfully! ${fileCount > 0 ? `${fileCount} file(s) uploaded, ` : ''}${linkCount > 0 ? `${linkCount} link(s) submitted and ` : ''}awaiting admin approval.`);
      } else {
        const fileCount = selectedFiles.length;
        toast.success(`Job posted successfully!${fileCount > 0 ? ` ${fileCount} file(s) uploaded.` : ''}`);
      }

      router.push('/client/dashboard');
    } catch (err) {
      console.error('Submit error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedService = formData.serviceType ? SERVICE_CATALOG[formData.serviceType as keyof typeof SERVICE_CATALOG] : null;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Post a New Job</h1>
          <p className="text-muted-foreground">
            Fill out the details below to post your writing job
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>
              Provide clear instructions to get the best results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Research Paper on Climate Change"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceType">Work Type</Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={handleServiceTypeChange}
                  disabled={loading}
                  required
                >
                  <SelectTrigger>
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
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {selectedService && (
                  <p className="text-xs text-muted-foreground">
                    Rate: KSh {selectedService.rate} {selectedService.unit}
                  </p>
                )}
              </div>

              {selectedService && (
                <div className="space-y-2">
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
                    min={selectedService.type === 'page' ? '0.1' : '1'}
                    step={selectedService.type === 'page' ? '0.1' : selectedService.type === 'hour' ? '0.5' : '1'}
                    placeholder="Enter quantity"
                    value={formData.quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    required
                    disabled={loading}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline *</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => handleDeadlineChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  required
                  disabled={loading}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground">
                  The final deadline for your completed work
                </p>
              </div>

              {/* Automated Price Calculation Display */}
              {formData.amount && selectedService && formData.quantity && (
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
                      <span className="font-medium">{formData.quantity}</span>
                    </div>
                    <div className="pt-2 border-t border-primary/20">
                      <div className="flex justify-between items-center text-sm text-muted-foreground mb-1">
                        <span>Computed Amount:</span>
                        <span className="font-medium">KSh {calculateAmount(formData.serviceType, formData.quantity, formData.deadline).toFixed(2)}</span>
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
                        disabled={loading}
                      >
                        {customAmountMode ? 'Use Auto Amount' : 'Set Custom Amount'}
                      </Button>
                    </div>

                    {customAmountMode ? (
                      <div className="space-y-2">
                        <Label htmlFor="customAmount">
                          Custom Amount (KSh) *
                        </Label>
                        <Input
                          id="customAmount"
                          type="number"
                          min={calculateAmount(formData.serviceType, formData.quantity, formData.deadline)}
                          step="0.01"
                          placeholder={`Minimum: ${calculateAmount(formData.serviceType, formData.quantity, formData.deadline)}`}
                          value={formData.amount}
                          onChange={(e) => handleCustomAmountChange(e.target.value)}
                          required
                          disabled={loading}
                          className="text-lg font-semibold"
                        />
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            <strong>Minimum: KSh {calculateAmount(formData.serviceType, formData.quantity, formData.deadline).toFixed(2)}</strong>
                            <br />
                            You can set a higher amount to incentivize quality work. The amount must not be less than the computed price.
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Final Payment Amount:</span>
                          <span className="text-2xl font-bold text-primary">
                            KSh {parseFloat(formData.amount).toFixed(2)}
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

              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions *</Label>
                <Textarea
                  id="instructions"
                  placeholder="Provide detailed instructions for the writer..."
                  rows={8}
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Include topic, formatting requirements, citation style, and any other important details
                </p>
              </div>

              {/* Draft Request Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="requestDraft" 
                  checked={requestDraft}
                  onCheckedChange={(checked) => setRequestDraft(checked as boolean)}
                  disabled={loading}
                />
                <Label 
                  htmlFor="requestDraft" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Request a draft before final submission
                </Label>
              </div>

              {/* ENHANCED FILE UPLOAD SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Attach Files (Optional)</Label>
                </div>

                {/* DIRECT FILE UPLOAD - NOW ENABLED */}
                <div className="border-2 border-dashed border-border rounded-lg p-6 bg-muted/30">
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <Upload className="w-10 h-10 mx-auto mb-2 text-primary" />
                      <p className="text-sm font-medium">Upload Files Directly</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max 40MB per file. Supported: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, ZIP, PNG, JPG
                      </p>
                    </div>

                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      accept="*/*"
                      disabled={loading || uploadingFiles}
                      className="hidden"
                    />
                    
                    <Button
                      type="button"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={loading || uploadingFiles}
                      className="w-full"
                      variant="outline"
                    >
                      <FileIcon className="w-4 h-4 mr-2" />
                      Select Files to Upload
                    </Button>

                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <p className="text-sm font-medium">Selected files ({selectedFiles.length}):</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-background p-2 rounded border">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileIcon className="w-4 h-4 flex-shrink-0 text-primary" />
                                <span className="text-sm truncate">{file.name}</span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                  ({formatFileSize(file.size)})
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSelectedFile(index)}
                                disabled={loading || uploadingFiles}
                                className="flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* FILES.FM LINK UPLOAD - ALTERNATIVE METHOD */}
                <div className="border-2 border-green-500 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-start gap-2 mb-3">
                    <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-800 dark:text-green-200">
                      <p className="font-medium mb-1">📤 Alternative: Share files via Files.fm</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Upload your files to <a href="https://files.fm" target="_blank" rel="noopener noreferrer" className="underline">Files.fm</a></li>
                        <li>Copy the Files.fm link</li>
                        <li>Paste the link below and click "Add to List"</li>
                        <li>Links will be submitted with your job and sent to admin for approval</li>
                      </ol>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="link-input" className="text-green-800 dark:text-green-200">
                        Files.fm Link
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="link-input"
                          type="url"
                          placeholder="https://files.fm/..."
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddLinkToStaging();
                            }
                          }}
                          disabled={loading}
                          className="flex-1 bg-white dark:bg-gray-900"
                        />
                        <Button
                          type="button"
                          onClick={handleAddLinkToStaging}
                          disabled={loading || !linkInput.trim()}
                          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Add to List
                        </Button>
                      </div>
                    </div>

                    {/* Staged Links Display */}
                    {stagedLinks.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-green-300 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            📎 Links Ready to Submit ({stagedLinks.length})
                          </p>
                          <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300">
                            <Send className="w-3 h-3 mr-1" />
                            Will be submitted with job
                          </Badge>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {stagedLinks.map((link, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-green-200 dark:border-green-800"
                            >
                              <LinkIcon className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {link.fileName}
                                </p>
                                <a
                                  href={link.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-green-600 hover:text-green-700 hover:underline break-all inline-flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {link.fileUrl}
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeStagedLink(index)}
                                disabled={loading}
                                className="flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Summary */}
                {(selectedFiles.length > 0 || stagedLinks.length > 0) && (
                  <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Ready to submit:</strong> {selectedFiles.length} file(s) + {stagedLinks.length} link(s)
                      {stagedLinks.length > 0 && ' (links require admin approval)'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={loading || uploadingFiles} className="flex-1">
                  {uploadingFiles ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading Files...
                    </>
                  ) : loading ? (
                    'Submitting...'
                  ) : (
                    `Submit Job${selectedFiles.length + stagedLinks.length > 0 ? ` with ${selectedFiles.length + stagedLinks.length} attachment(s)` : ''}`
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading || uploadingFiles}
                >
                  Cancel
                </Button>
              </div>

              {/* Call Us Button */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-3">
                  <span className="text-sm">Need help? Call us directly:</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a 
                    href="tel:0701066845"
                    className="flex-1"
                  >
                    <Button 
                      type="button"
                      variant="outline" 
                      className="w-full gap-2 hover:bg-green-50 dark:hover:bg-green-950 border-green-500 text-green-700 dark:text-green-400"
                    >
                      <Phone className="w-4 h-4" />
                      0701066845
                    </Button>
                  </a>
                  <a 
                    href="tel:0702794172"
                    className="flex-1"
                  >
                    <Button 
                      type="button"
                      variant="outline" 
                      className="w-full gap-2 hover:bg-green-50 dark:hover:bg-green-950 border-green-500 text-green-700 dark:text-green-400"
                    >
                      <Phone className="w-4 h-4" />
                      0702794172
                    </Button>
                  </a>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}