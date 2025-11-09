import BackblazeB2 from 'backblaze-b2';

// Storage bucket configuration
export const STORAGE_BUCKETS = {
  JOB_FILES: 'job-files',
  PROFILE_PICTURES: 'profile-pictures',
  DOCUMENTS: 'documents',
} as const;

// Check if Backblaze is configured
const isB2Configured = !!(
  process.env.B2_KEY_ID &&
  process.env.B2_APPLICATION_KEY &&
  process.env.B2_BUCKET_ID &&
  process.env.B2_BUCKET_NAME &&
  process.env.B2_ENDPOINT
);

// Create Backblaze B2 client
let b2Client: BackblazeB2 | null = null;
let authData: any = null;
let authExpiry: number = 0;

if (isB2Configured) {
  b2Client = new BackblazeB2({
    applicationKeyId: process.env.B2_KEY_ID!,
    applicationKey: process.env.B2_APPLICATION_KEY!,
  });
}

// Log configuration status
if (!isB2Configured) {
  console.warn('⚠️ Backblaze B2 not configured. File uploads will fail. Please configure B2 environment variables.');
  console.warn('Required: B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_ID, B2_BUCKET_NAME, B2_ENDPOINT');
} else {
  console.log('✅ Backblaze B2 storage configured successfully');
}

/**
 * Authorize with Backblaze B2
 */
async function authorizeB2() {
  if (!b2Client) {
    throw new Error('Backblaze B2 client not initialized');
  }
  
  // Check if we have valid auth data
  const now = Date.now();
  if (authData && authExpiry > now) {
    return authData;
  }
  
  try {
    const response = await b2Client.authorize();
    authData = response.data;
    // B2 tokens are valid for 24 hours, refresh 1 hour before expiry
    authExpiry = now + (23 * 60 * 60 * 1000);
    return authData;
  } catch (error) {
    console.error('Failed to authorize with Backblaze B2:', error);
    throw error;
  }
}

/**
 * Upload a file to Backblaze B2 Storage
 */
export async function uploadFile(
  bucket: string,
  filePath: string,
  file: File | Buffer,
  contentType?: string
): Promise<{ url: string | null; error: Error | null }> {
  if (!b2Client || !isB2Configured) {
    const errorMsg = 'Backblaze B2 not configured. Please contact administrator to set up file storage.';
    console.error(errorMsg);
    return {
      url: null,
      error: new Error(errorMsg),
    };
  }

  try {
    // Authorize first
    await authorizeB2();

    // Get upload URL
    const uploadUrlResponse = await b2Client.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID!,
    });

    // Convert File to Buffer if needed
    let fileBuffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      fileBuffer = file;
    }

    // Clean file path - remove leading slashes
    const cleanPath = filePath.replace(/^\/+/, '');
    const fullFileName = `${bucket}/${cleanPath}`;

    // Upload the file
    const uploadResponse = await b2Client.uploadFile({
      uploadUrl: uploadUrlResponse.data.uploadUrl,
      uploadAuthToken: uploadUrlResponse.data.authorizationToken,
      fileName: fullFileName,
      data: fileBuffer,
      contentType: contentType || 'application/octet-stream',
    });

    // Construct download URL using B2 endpoint
    // Format: https://{endpoint}/file/{bucket_name}/{file_name}
    const downloadUrl = `${process.env.B2_ENDPOINT}/file/${process.env.B2_BUCKET_NAME}/${fullFileName}`;

    console.log('✅ File uploaded successfully to B2:', downloadUrl);

    return { 
      url: downloadUrl, 
      error: null 
    };
  } catch (error) {
    console.error('❌ Backblaze B2 upload error:', error);
    return { url: null, error: error as Error };
  }
}

/**
 * Delete a file from Backblaze B2 Storage
 */
export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!b2Client || !isB2Configured) {
    console.warn('Backblaze B2 not configured. Skipping file deletion.');
    return { success: true, error: null };
  }

  try {
    // Authorize first
    await authorizeB2();

    // Clean file path
    const cleanPath = filePath.replace(/^\/+/, '');
    const fullFileName = `${bucket}/${cleanPath}`;

    // List files to find the file ID
    const listResponse = await b2Client.listFileNames({
      bucketId: process.env.B2_BUCKET_ID!,
      prefix: fullFileName,
      maxFileCount: 1,
    });

    if (listResponse.data.files.length === 0) {
      console.warn('File not found for deletion:', fullFileName);
      return { success: false, error: new Error('File not found') };
    }

    const fileId = listResponse.data.files[0].fileId;
    const fileName = listResponse.data.files[0].fileName;

    // Delete the file
    await b2Client.deleteFileVersion({
      fileId,
      fileName,
    });

    console.log('✅ File deleted successfully from B2:', fullFileName);

    return { success: true, error: null };
  } catch (error) {
    console.error('❌ Backblaze B2 delete error:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * List files in a bucket path
 */
export async function listFiles(
  bucket: string,
  path?: string
): Promise<{ files: any[] | null; error: Error | null }> {
  if (!b2Client || !isB2Configured) {
    console.warn('Backblaze B2 not configured. Returning empty file list.');
    return { files: [], error: null };
  }

  try {
    // Authorize first
    await authorizeB2();

    const prefix = path ? `${bucket}/${path}` : bucket;

    const listResponse = await b2Client.listFileNames({
      bucketId: process.env.B2_BUCKET_ID!,
      prefix,
      maxFileCount: 100,
    });

    return { files: listResponse.data.files, error: null };
  } catch (error) {
    console.error('Backblaze B2 list error:', error);
    return { files: null, error: error as Error };
  }
}

/**
 * Get public URL for a file (for private buckets, use signed URLs)
 */
export function getPublicUrl(bucket: string, filePath: string): string {
  if (!isB2Configured) {
    return `/mock-storage/${bucket}/${filePath}`;
  }

  return `${process.env.B2_ENDPOINT}/file/${process.env.B2_BUCKET_NAME}/${bucket}/${filePath}`;
}

/**
 * Generate a temporary download URL for private buckets
 * This would require additional B2 API calls and authorization token generation
 */
export async function getDownloadUrl(
  bucket: string,
  filePath: string,
  durationSeconds: number = 3600
): Promise<{ url: string | null; error: Error | null }> {
  if (!b2Client || !isB2Configured) {
    return {
      url: `/mock-storage/${bucket}/${filePath}`,
      error: null,
    };
  }

  try {
    // Authorize first
    await authorizeB2();

    // For private buckets, you would need to:
    // 1. Get the file info
    // 2. Generate an authorization token with download permissions
    // 3. Construct a signed URL with the token
    
    // For now, returning the base URL
    // In production, implement proper signed URL generation
    const baseUrl = getPublicUrl(bucket, filePath);
    
    return { url: baseUrl, error: null };
  } catch (error) {
    console.error('Backblaze B2 download URL error:', error);
    return { url: null, error: error as Error };
  }
}