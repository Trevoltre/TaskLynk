import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Storage bucket names
export const STORAGE_BUCKETS = {
  JOB_FILES: 'job-files',
  PROFILE_PICTURES: 'profile-pictures',
  DOCUMENTS: 'documents',
} as const;

// Check if Supabase is configured
const isSupabaseConfigured = !!supabaseUrl && !!supabaseServiceKey;

// Only create client if credentials exist
export const supabaseStorage = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
  : null;

// Log configuration status
if (!isSupabaseConfigured) {
  console.warn('Supabase storage not configured. File uploads will be stored as metadata only.');
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: string,
  filePath: string,
  file: File | Buffer,
  contentType?: string
): Promise<{ url: string | null; error: Error | null }> {
  if (!supabaseStorage) {
    // Graceful fallback: return a mock URL
    console.warn('Supabase not configured. Returning mock file URL.');
    return {
      url: `/mock-storage/${bucket}/${filePath}`,
      error: null,
    };
  }

  try {
    const { data, error } = await supabaseStorage.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      return { url: null, error };
    }

    // Get public URL
    const { data: urlData } = supabaseStorage.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!supabaseStorage) {
    console.warn('Supabase not configured. Skipping file deletion.');
    return { success: true, error: null };
  }

  try {
    const { error } = await supabaseStorage.storage.from(bucket).remove([filePath]);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
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
  if (!supabaseStorage) {
    console.warn('Supabase not configured. Returning empty file list.');
    return { files: [], error: null };
  }

  try {
    const { data, error } = await supabaseStorage.storage.from(bucket).list(path);

    if (error) {
      return { files: null, error };
    }

    return { files: data, error: null };
  } catch (error) {
    return { files: null, error: error as Error };
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: string, filePath: string): string {
  if (!supabaseStorage) {
    return `/mock-storage/${bucket}/${filePath}`;
  }

  const { data } = supabaseStorage.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}
