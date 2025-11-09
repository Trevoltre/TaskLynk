"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, File, Loader2, X, FileText, Image as ImageIcon, FileSpreadsheet, Archive, Info, Clock, Link as LinkIcon, ExternalLink, CheckCircle, AlertTriangle, Cloud } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Allowed file formats for upload
const ALLOWED_FORMATS = [
  'pdf', 'doc', 'docx', 'ppt', 'pptx',
  'xls', 'xlsx', 'txt', 'rtf',
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
  'zip', 'rar', '7z', 'tar', 'gz',
  'mp3', 'mp4', 'wav', 'avi', 'mov',
  'csv', 'json', 'xml'
];

// ✅ CRITICAL: Maximum file size (40MB)
const MAX_FILE_SIZE = 40 * 1024 * 1024; // 40MB in bytes

type FileAttachment = {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadType: string;
  uploadedBy: number;
  uploaderName?: string;
  uploaderRole?: string;
  uploaderEmail?: string;
  createdAt: string;
};

type FileUploadSectionProps = {
  jobId: number;
  currentUserId: number;
  currentUserRole: 'admin' | 'client' | 'freelancer';
  files: FileAttachment[];
  canUpload: boolean;
  canDownload: boolean;
  uploadType?: 'initial' | 'draft' | 'final' | 'revision';
  onFileUploaded?: () => void;
  restrictedJobTypes?: string[];
  currentJobType?: string;
  clientId?: number; // for admin grouping (Client vs Writers)
};

const getFileIcon = (fileType: string) => {
  if (fileType.includes('image')) return ImageIcon;
  if (fileType.includes('pdf')) return FileText;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
  if (fileType.includes('zip') || fileType.includes('rar')) return Archive;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Validate file format
const validateFileFormat = (file: File): { valid: boolean; error?: string } => {
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  
  if (!fileExt) {
    return { valid: false, error: 'File has no extension' };
  }
  
  if (!ALLOWED_FORMATS.includes(fileExt)) {
    return { 
      valid: false, 
      error: `Invalid file format: .${fileExt}. Please upload a supported file type.` 
    };
  }
  
  return { valid: true };
};

// ✅ NEW: Validate file size
const validateFileSize = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File "${file.name}" is too large (${formatFileSize(file.size)}). Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`
    };
  }
  return { valid: true };
};

export function FileUploadSection({
  jobId,
  currentUserId,
  currentUserRole,
  files,
  canUpload,
  canDownload,
  uploadType = 'initial',
  onFileUploaded,
  clientId,
}: FileUploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const validFiles: File[] = [];
      
      // Validate each file
      for (const file of filesArray) {
        // ✅ Validate format
        const formatValidation = validateFileFormat(file);
        if (!formatValidation.valid) {
          toast.error(formatValidation.error || 'Invalid file format');
          continue;
        }
        
        // ✅ Validate size
        const sizeValidation = validateFileSize(file);
        if (!sizeValidation.valid) {
          toast.error(sizeValidation.error || 'File too large', {
            description: 'Please compress your file or split it into smaller parts.',
            duration: 6000,
          });
          continue;
        }
        
        validFiles.push(file);
      }
      
      if (validFiles.length > 0) {
        setSelectedFiles(validFiles);
        toast.success(`${validFiles.length} valid file(s) selected`);
      }
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        // Validate format one more time before upload
        const formatValidation = validateFileFormat(file);
        if (!formatValidation.valid) {
          throw new Error(formatValidation.error);
        }

        // ✅ Validate size one more time
        const sizeValidation = validateFileSize(file);
        if (!sizeValidation.valid) {
          throw new Error(sizeValidation.error);
        }

        // Create FormData for upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('jobId', jobId.toString());
        formData.append('folder', 'tasklynk/uploads');

        // Upload to storage
        const uploadResponse = await fetch('/api/cloudinary/upload', {
          method: 'POST',
          body: formData,
        });

        // ✅ IMPROVED ERROR HANDLING: Handle non-JSON responses (413 errors)
        if (!uploadResponse.ok) {
          let errorMessage = 'Failed to upload file';
          
          // Try to parse JSON error
          try {
            const errorData = await uploadResponse.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // If JSON parsing fails, get text response
            const errorText = await uploadResponse.text();
            
            // Handle 413 Payload Too Large
            if (uploadResponse.status === 413) {
              errorMessage = `File "${file.name}" is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}. Please compress your file.`;
            } else if (errorText) {
              errorMessage = errorText.substring(0, 200); // Limit error message length
            }
          }
          
          throw new Error(errorMessage);
        }

        const uploadData = await uploadResponse.json();

        // Save to database - preserve original filename and extension
        const response = await fetch(`/api/jobs/${jobId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name, // Preserve original filename with extension
            fileUrl: uploadData.url,
            fileSize: file.size,
            fileType: file.type || 'application/octet-stream', // Preserve MIME type
            uploadType,
            uploadedBy: currentUserId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save file metadata');
        }

        return response.json();
      });

      await Promise.all(uploadPromises);

      toast.success(`${selectedFiles.length} file(s) uploaded successfully`);
      setSelectedFiles([]);
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Refresh files list
      if (onFileUploaded) {
        onFileUploaded();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload files. Please try again.', {
        duration: 6000,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: FileAttachment) => {
    try {
      if (file.fileType === 'external/link') {
        // For external links, open in new tab
        window.open(file.fileUrl, '_blank', 'noopener,noreferrer');
        toast.success('Opening link in new tab');
      } else {
        // Use proxy endpoint for all file downloads to bypass CORS
        toast.info('Preparing download...');
        
        try {
          // Fetch through our proxy endpoint
          const response = await fetch(`/api/files/download/${file.id}`);
          
          if (!response.ok) {
            throw new Error('Failed to download file');
          }
          
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          
          // Create download link with blob URL
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = file.fileName; // Preserve original filename
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up blob URL after download
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
          
          toast.success(`Downloaded ${file.fileName}`);
        } catch (fetchError) {
          console.error('Proxy download failed:', fetchError);
          // Fallback: Try blob method with direct URL
          const response = await fetch(file.fileUrl);
          if (!response.ok) throw new Error('Failed to fetch file');
          
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = file.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
          toast.success(`Downloaded ${file.fileName}`);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file. Please try again.');
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Separate files: regular files vs external links
  const regularFiles = files.filter(f => f.fileType !== 'external/link');
  const externalLinks = files.filter(f => f.fileType === 'external/link');

  // Grouping logic based on role
  const isClient = currentUserRole === 'client';
  const isAdmin = currentUserRole === 'admin';
  const isFreelancer = currentUserRole === 'freelancer';

  const yourFilesForClient = isClient ? regularFiles.filter(f => f.uploadedBy === currentUserId) : [];
  const writersFilesForClient = isClient ? regularFiles.filter(f => f.uploadedBy !== currentUserId) : [];

  const clientFilesForAdmin = isAdmin && clientId ? regularFiles.filter(f => f.uploadedBy === clientId) : [];
  const writersFilesForAdmin = isAdmin && clientId ? regularFiles.filter(f => f.uploadedBy !== clientId) : [];

  // NEW: Grouping for freelancers
  const clientFilesForFreelancer = isFreelancer && clientId ? regularFiles.filter(f => f.uploadedBy === clientId) : [];
  const yourFilesForFreelancer = isFreelancer ? regularFiles.filter(f => f.uploadedBy === currentUserId) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Files
          <Badge variant="secondary">{files.length}</Badge>
        </CardTitle>
        <CardDescription>
          Upload and manage files for this order. Maximum file size: {formatFileSize(MAX_FILE_SIZE)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* FILE FORMAT & SIZE NOTICE */}
        <Alert className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                <span>
                  <strong>Format Preservation:</strong> All files maintain their original format (.pdf, .docx, .pptx, etc.).
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                <span>
                  <strong>Size Limit:</strong> Maximum file size is {formatFileSize(MAX_FILE_SIZE)}. Larger files will be rejected.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Cloud className="h-3 w-3" />
                <span>
                  <strong>Storage:</strong> Files are securely stored and will be automatically deleted <strong>1 week after order completion</strong>.
                </span>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Upload Section */}
        {canUpload && (
          <div className="border-2 border-dashed border-border rounded-lg p-4 bg-muted/30">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.svg,.zip,.rar,.7z,.tar,.gz,.mp3,.mp4,.wav,.avi,.mov,.csv,.json,.xml"
                  className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                <Button
                  onClick={handleUpload}
                  disabled={uploading || selectedFiles.length === 0}
                  className="gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>

              {/* Selected Files Preview */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected files ({selectedFiles.length}):</p>
                  {selectedFiles.map((file, index) => {
                    const fileExt = file.name.split('.').pop()?.toLowerCase();
                    const isTooLarge = file.size > MAX_FILE_SIZE;
                    
                    return (
                      <div key={index} className={`flex items-center justify-between p-2 rounded border ${
                        isTooLarge ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800' : 'bg-background'
                      }`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <File className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            .{fileExt}
                          </Badge>
                          <span className={`text-xs flex-shrink-0 ${
                            isTooLarge ? 'text-red-600 font-semibold' : 'text-muted-foreground'
                          }`}>
                            ({formatFileSize(file.size)})
                          </span>
                          {isTooLarge && (
                            <Badge variant="destructive" className="text-xs flex-shrink-0">
                              Too Large!
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSelectedFile(index)}
                          className="flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FILES DISPLAY SECTION */}
        <div className="space-y-6">
          {/* Grouped view for Client */}
          {isClient && (
            <>
              {yourFilesForClient.length > 0 && writersFilesForClient.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* A - Client side */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">A</Badge>
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Your Upload ({yourFilesForClient.length})</h3>
                    </div>
                    <div className="grid gap-2">
                      {yourFilesForClient.map((file) => {
                        const FileIcon = getFileIcon(file.fileType);
                        const fileExt = file.fileName.split('.').pop()?.toLowerCase();
                        return (
                          <div key={file.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20`}>
                            <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{file.fileName}</p>
                                {fileExt && (
                                  <Badge variant="outline" className="text-xs">.{fileExt}</Badge>
                                )}
                                <Badge variant="default" className="text-xs bg-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Available
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <Badge variant="outline" className="text-xs">You</Badge>
                                <span>•</span>
                                <span>{formatFileSize(file.fileSize)}</span>
                                <span>•</span>
                                <span>{format(new Date(file.createdAt), 'MMM dd, HH:mm')}</span>
                                <span>•</span>
                                <Badge variant="secondary" className="text-xs capitalize">{file.uploadType}</Badge>
                              </div>
                            </div>
                            {canDownload && (
                              <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} title={`Download ${file.fileName}`}>
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* B - Writer side */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">B</Badge>
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Writer's Upload ({writersFilesForClient.length})</h3>
                    </div>
                    <div className="grid gap-2">
                      {writersFilesForClient.map((file) => {
                        const FileIcon = getFileIcon(file.fileType);
                        const fileExt = file.fileName.split('.').pop()?.toLowerCase();
                        return (
                          <div key={file.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-muted/50 border-border`}>
                            <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{file.fileName}</p>
                                {fileExt && (
                                  <Badge variant="outline" className="text-xs">.{fileExt}</Badge>
                                )}
                                <Badge variant="default" className="text-xs bg-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Available
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <Badge variant="outline" className="text-xs capitalize">Writer</Badge>
                                <span>•</span>
                                <span>{formatFileSize(file.fileSize)}</span>
                                <span>•</span>
                                <span>{format(new Date(file.createdAt), 'MMM dd, HH:mm')}</span>
                                <span>•</span>
                                <Badge variant="secondary" className="text-xs capitalize">{file.uploadType}</Badge>
                              </div>
                            </div>
                            {canDownload && (
                              <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} title={`Download ${file.fileName}`}>
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Fallback to single column if only one side exists */}
                  {yourFilesForClient.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">A</Badge>
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Your Upload ({yourFilesForClient.length})</h3>
                      </div>
                      <div className="grid gap-2">
                        {yourFilesForClient.map((file) => {
                          const FileIcon = getFileIcon(file.fileType);
                          const fileExt = file.fileName.split('.').pop()?.toLowerCase();
                          return (
                            <div key={file.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20`}>
                              <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">{file.fileName}</p>
                                  {fileExt && (
                                    <Badge variant="outline" className="text-xs">.{fileExt}</Badge>
                                  )}
                                  <Badge variant="default" className="text-xs bg-green-600">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Available
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                  <Badge variant="outline" className="text-xs">You</Badge>
                                  <span>•</span>
                                  <span>{formatFileSize(file.fileSize)}</span>
                                  <span>•</span>
                                  <span>{format(new Date(file.createdAt), 'MMM dd, HH:mm')}</span>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-xs capitalize">{file.uploadType}</Badge>
                                </div>
                              </div>
                              {canDownload && (
                                <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} title={`Download ${file.fileName}`}>
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {writersFilesForClient.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">B</Badge>
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Writer's Upload ({writersFilesForClient.length})</h3>
                      </div>
                      <div className="grid gap-2">
                        {writersFilesForClient.map((file) => {
                          const FileIcon = getFileIcon(file.fileType);
                          const fileExt = file.fileName.split('.').pop()?.toLowerCase();
                          return (
                            <div key={file.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-muted/50 border-border`}>
                              <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">{file.fileName}</p>
                                  {fileExt && (
                                    <Badge variant="outline" className="text-xs">.{fileExt}</Badge>
                                  )}
                                  <Badge variant="default" className="text-xs bg-green-600">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Available
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                  <Badge variant="outline" className="text-xs capitalize">Writer</Badge>
                                  <span>•</span>
                                  <span>{formatFileSize(file.fileSize)}</span>
                                  <span>•</span>
                                  <span>{format(new Date(file.createdAt), 'MMM dd, HH:mm')}</span>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-xs capitalize">{file.uploadType}</Badge>
                                </div>
                              </div>
                              {canDownload && (
                                <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} title={`Download ${file.fileName}`}>
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Grouped view for Admin */}
          {isAdmin && clientId && (
            <>
              {clientFilesForAdmin.length > 0 && writersFilesForAdmin.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* A - Client side */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">A</Badge>
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Client Upload ({clientFilesForAdmin.length})</h3>
                    </div>
                    <div className="grid gap-2">
                      {clientFilesForAdmin.map((file) => {
                        const FileIcon = getFileIcon(file.fileType);
                        const fileExt = file.fileName.split('.').pop()?.toLowerCase();
                        return (
                          <div key={file.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-muted/50 border-border`}>
                            <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{file.fileName}</p>
                                {fileExt && (
                                  <Badge variant="outline" className="text-xs">.{fileExt}</Badge>
                                )}
                                <Badge variant="default" className="text-xs bg-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Available
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <Badge variant="outline" className="text-xs capitalize">Client</Badge>
                                <span>•</span>
                                <span>{formatFileSize(file.fileSize)}</span>
                                <span>•</span>
                                <span>{format(new Date(file.createdAt), 'MMM dd, HH:mm')}</span>
                                <span>•</span>
                                <Badge variant="secondary" className="text-xs capitalize">{file.uploadType}</Badge>
                              </div>
                            </div>
                            {canDownload && (
                              <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} title={`Download ${file.fileName}`}>
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* B - Writers/Admin side */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">B</Badge>
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Writers Upload ({writersFilesForAdmin.length})</h3>
                    </div>
                    <div className="grid gap-2">
                      {writersFilesForAdmin.map((file) => {
                        const FileIcon = getFileIcon(file.fileType);
                        const fileExt = file.fileName.split('.').pop()?.toLowerCase();
                        const isAdminFile = file.uploaderRole === 'admin' || (clientId && file.uploadedBy !== clientId && file.uploaderRole !== 'freelancer');
                        return (
                          <div key={file.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-muted/50 border-border`}>
                            <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{file.fileName}</p>
                                {fileExt && (
                                  <Badge variant="outline" className="text-xs">.{fileExt}</Badge>
                                )}
                                <Badge variant="default" className="text-xs bg-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Available
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <Badge variant="outline" className="text-xs capitalize">{isAdminFile ? 'Admin' : 'Writer'}</Badge>
                                <span>•</span>
                                <span>{formatFileSize(file.fileSize)}</span>
                                <span>•</span>
                                <span>{format(new Date(file.createdAt), 'MMM dd, HH:mm')}</span>
                                <span>•</span>
                                <Badge variant="secondary" className="text-xs capitalize">{file.uploadType}</Badge>
                              </div>
                            </div>
                            {canDownload && (
                              <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} title={`Download ${file.fileName}`}>
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {clientFilesForAdmin.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">A</Badge>
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Client Upload ({clientFilesForAdmin.length})</h3>
                      </div>
                      <div className="grid gap-2">
                        {clientFilesForAdmin.map((file) => {
                          const FileIcon = getFileIcon(file.fileType);
                          const fileExt = file.fileName.split('.').pop()?.toLowerCase();
                          return (
                            <div key={file.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-muted/50 border-border`}>
                              <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">{file.fileName}</p>
                                  {fileExt && (
                                    <Badge variant="outline" className="text-xs">.{fileExt}</Badge>
                                  )}
                                  <Badge variant="default" className="text-xs bg-green-600">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Available
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                  <Badge variant="outline" className="text-xs capitalize">Client</Badge>
                                  <span>•</span>
                                  <span>{formatFileSize(file.fileSize)}</span>
                                  <span>•</span>
                                  <span>{format(new Date(file.createdAt), 'MMM dd, HH:mm')}</span>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-xs capitalize">{file.uploadType}</Badge>
                                </div>
                              </div>
                              {canDownload && (
                                <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} title={`Download ${file.fileName}`}>
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {writersFilesForAdmin.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">B</Badge>
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Writers Upload ({writersFilesForAdmin.length})</h3>
                      </div>
                      <div className="grid gap-2">
                        {writersFilesForAdmin.map((file) => {
                          const FileIcon = getFileIcon(file.fileType);
                          const fileExt = file.fileName.split('.').pop()?.toLowerCase();
                          const isAdminFile = file.uploaderRole === 'admin' || (clientId && file.uploadedBy !== clientId && file.uploaderRole !== 'freelancer');
                          return (
                            <div key={file.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-muted/50 border-border`}>
                              <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">{file.fileName}</p>
                                  {fileExt && (
                                    <Badge variant="outline" className="text-xs">.{fileExt}</Badge>
                                  )}
                                  <Badge variant="default" className="text-xs bg-green-600">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Available
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                  <Badge variant="outline" className="text-xs capitalize">{isAdminFile ? 'Admin' : 'Writer'}</Badge>
                                  <span>•</span>
                                  <span>{formatFileSize(file.fileSize)}</span>
                                  <span>•</span>
                                  <span>{format(new Date(file.createdAt), 'MMM dd, HH:mm')}</span>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-xs capitalize">{file.uploadType}</Badge>
                                </div>
                              </div>
                              {canDownload && (
                                <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} title={`Download ${file.fileName}`}>
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* NEW: Grouped view for Freelancer */}
          {isFreelancer && clientId && (
            <>
              {clientFilesForFreelancer.length > 0 && yourFilesForFreelancer.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* A - Client side */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">A</Badge>
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Client Upload ({clientFilesForFreelancer.length})</h3>
                    </div>
                    <div className="grid gap-2">
                      {clientFilesForFreelancer.map((file) => {
                        const FileIcon = getFileIcon(file.fileType);
                        const fileExt = file.fileName.split('.').pop()?.toLowerCase();
                        return (
                          <div key={file.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-muted/50 border-border`}>
                            <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{file.fileName}</p>
                                {fileExt && (
                                  <Badge variant="outline" className="text-xs">.{fileExt}</Badge>
                                )}
                                <Badge variant="default" className="text-xs bg-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Available
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <Badge variant="outline" className="text-xs capitalize">Client</Badge>
                                <span>•</span>
                                <span>{formatFileSize(file.fileSize)}</span>
                                <span>•</span>
                                <span>{format(new Date(file.createdAt), 'MMM dd, HH:mm')}</span>
                                <span>•</span>
                                <Badge variant="secondary" className="text-xs capitalize">{file.uploadType}</Badge>
                              </div>
                            </div>
                            {canDownload && (
                              <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} title={`Download ${file.fileName}`}>
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* B - Freelancer side */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">B</Badge>
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Your Upload ({yourFilesForFreelancer.length})</h3>
                    </div>
                    <div className="grid gap-2">
                      {yourFilesForFreelancer.map((file) => {
                        const FileIcon = getFileIcon(file.fileType);
                        const fileExt = file.fileName.split('.').pop()?.toLowerCase();
                        return (
                          <div key={file.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20`}>
                            <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{file.fileName}</p>
                                {fileExt && (
                                  <Badge variant="outline" className="text-xs">.{fileExt}</Badge>
                                )}
                                <Badge variant="default" className="text-xs bg-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Available
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <Badge variant="outline" className="text-xs">You</Badge>
                                <span>•</span>
                                <span>{formatFileSize(file.fileSize)}</span>
                                <span>•</span>
                                <span>{format(new Date(file.createdAt), 'MMM dd, HH:mm')}</span>
                                <span>•</span>
                                <Badge variant="secondary" className="text-xs capitalize">{file.uploadType}</Badge>
                              </div>
                            </div>
                            {canDownload && (
                              <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} title={`Download ${file.fileName}`}>
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {clientFilesForFreelancer.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">A</Badge>
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Client Upload ({clientFilesForFreelancer.length})</h3>
                      </div>
                      <div className="grid gap-2">
                        {clientFilesForFreelancer.map((file) => {
                          const FileIcon = getFileIcon(file.fileType);
                          const fileExt = file.fileName.split('.').pop()?.toLowerCase();
                          return (
                            <div key={file.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-muted/50 border-border`}>
                              <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">{file.fileName}</p>
                                  {fileExt && (
                                    <Badge variant="outline" className="text-xs">.{fileExt}</Badge>
                                  )}
                                  <Badge variant="default" className="text-xs bg-green-600">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Available
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                  <Badge variant="outline" className="text-xs capitalize">Client</Badge>
                                  <span>•</span>
                                  <span>{formatFileSize(file.fileSize)}</span>
                                  <span>•</span>
                                  <span>{format(new Date(file.createdAt), 'MMM dd, HH:mm')}</span>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-xs capitalize">{file.uploadType}</Badge>
                                </div>
                              </div>
                              {canDownload && (
                                <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} title={`Download ${file.fileName}`}>
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {yourFilesForFreelancer.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">B</Badge>
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">Your Upload ({yourFilesForFreelancer.length})</h3>
                      </div>
                      <div className="grid gap-2">
                        {yourFilesForFreelancer.map((file) => {
                          const FileIcon = getFileIcon(file.fileType);
                          const fileExt = file.fileName.split('.').pop()?.toLowerCase();
                          return (
                            <div key={file.id} className={`flex items-start gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20`}>
                              <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">{file.fileName}</p>
                                  {fileExt && (
                                    <Badge variant="outline" className="text-xs">.{fileExt}</Badge>
                                  )}
                                  <Badge variant="default" className="text-xs bg-green-600">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Available
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                  <Badge variant="outline" className="text-xs">You</Badge>
                                  <span>•</span>
                                  <span>{formatFileSize(file.fileSize)}</span>
                                  <span>•</span>
                                  <span>{format(new Date(file.createdAt), 'MMM dd, HH:mm')}</span>
                                  <span>•</span>
                                  <Badge variant="secondary" className="text-xs capitalize">{file.uploadType}</Badge>
                                </div>
                              </div>
                              {canDownload && (
                                <Button variant="ghost" size="sm" onClick={() => handleDownload(file)} title={`Download ${file.fileName}`}>
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Default (legacy) list when not client/admin/freelancer grouping */}
          {!isClient && !(isAdmin && clientId) && !(isFreelancer && clientId) && regularFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Uploaded Files ({regularFiles.length})</h3>
              </div>
              <div className="grid gap-2">
                {regularFiles.map((file) => {
                  const FileIcon = getFileIcon(file.fileType);
                  const isMine = file.uploadedBy === currentUserId;
                  const fileExt = file.fileName.split('.').pop()?.toLowerCase();
                  
                  return (
                    <div
                      key={file.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        isMine
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-muted/50 border-border'
                      }`}
                    >
                      <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{file.fileName}</p>
                          {fileExt && (
                            <Badge variant="outline" className="text-xs">
                              .{fileExt}
                            </Badge>
                          )}
                          <Badge variant="default" className="text-xs bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Available
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          {file.uploaderRole && (
                            <>
                              <Badge variant="outline" className="text-xs capitalize">
                                {isMine ? 'You' : file.uploaderRole}
                              </Badge>
                              <span>•</span>
                            </>
                          )}
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>•</span>
                          <span>{format(new Date(file.createdAt), 'MMM dd, HH:mm')}</span>
                          <span>•</span>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {file.uploadType}
                          </Badge>
                        </div>
                      </div>
                      {canDownload && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          className="flex-shrink-0"
                          title={`Download ${file.fileName}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LINKS SECTION */}
          {externalLinks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold">Shared Links ({externalLinks.length})</h3>
              </div>
              <div className="space-y-2">
                {externalLinks.map((link) => {
                  const isMine = link.uploadedBy === currentUserId;
                  
                  return (
                    <div
                      key={link.id}
                      className={`p-3 rounded-lg border ${
                        isMine
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'bg-background border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <LinkIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground mb-1">
                                {link.fileName}
                              </p>
                              {canDownload ? (
                                <a
                                  href={link.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline break-all inline-flex items-center gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.info('Opening link in new tab...');
                                  }}
                                >
                                  {link.fileUrl}
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground break-all">
                                  {link.fileUrl}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {link.uploaderRole && (
                              <>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {isMine ? 'You' : link.uploaderRole}
                                </Badge>
                                <span>•</span>
                              </>
                            )}
                            <span>{format(new Date(link.createdAt), 'MMM dd, HH:mm')}</span>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {link.uploadType}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {files.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No files uploaded yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}