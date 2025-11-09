"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileIcon, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { uploadToRediafile } from "@/lib/rediafile";

type UploadedFile = {
  url: string;
  filename: string;
  size: number;
  fileId: string;
};

type RediafileUploadProps = {
  onUploadComplete?: (files: UploadedFile[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  acceptedTypes?: string;
  maxSizeMB?: number;
  label?: string;
  existingFiles?: UploadedFile[];
  onFileRemove?: (fileId: string) => void;
};

export const RediafileUpload = ({
  onUploadComplete,
  multiple = true,
  maxFiles = 10,
  acceptedTypes = "*/*",
  maxSizeMB = 100,
  label = "Upload Files to File.fm",
  existingFiles = [],
  onFileRemove,
}: RediafileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(existingFiles);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Check file count limit
    if (uploadedFiles.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Check file sizes
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const oversizedFiles = files.filter(f => f.size > maxSizeBytes);
    if (oversizedFiles.length > 0) {
      toast.error(`Some files exceed ${maxSizeMB}MB limit`);
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = files.map(file => uploadToRediafile(file));
      const results = await Promise.all(uploadPromises);
      
      const newFiles = [...uploadedFiles, ...results];
      setUploadedFiles(newFiles);
      
      if (onUploadComplete) {
        onUploadComplete(newFiles);
      }

      toast.success(`${files.length} file(s) uploaded successfully to File.fm`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (fileId: string) => {
    const newFiles = uploadedFiles.filter(f => f.fileId !== fileId);
    setUploadedFiles(newFiles);
    
    if (onFileRemove) {
      onFileRemove(fileId);
    }
    
    if (onUploadComplete) {
      onUploadComplete(newFiles);
    }
    
    toast.success("File removed");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || uploadedFiles.length >= maxFiles}
          className="w-full sm:w-auto"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {label}
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          {uploadedFiles.length}/{maxFiles} files
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Uploaded Files:</p>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.fileId}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileIcon className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-background rounded transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-green-600" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemove(file.fileId)}
                    className="p-2 hover:bg-background rounded transition-colors"
                    title="Remove"
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Maximum file size: {maxSizeMB}MB per file. Accepted types: {acceptedTypes === "*/*" ? "All files" : acceptedTypes}
      </p>
    </div>
  );
};
