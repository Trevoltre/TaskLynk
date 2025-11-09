import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobAttachments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Extract Cloudinary public_id from URL
function extractPublicIdFromUrl(url: string): { publicId: string; resourceType: 'image' | 'video' | 'raw' } | null {
  try {
    // Example URL: https://res.cloudinary.com/deicqit1a/raw/upload/v1762471287/tasklynk/uploads/job_23/1762471287672-file.pdf
    const urlPattern = /cloudinary\.com\/[^/]+\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/;
    const match = url.match(urlPattern);
    
    if (match) {
      const resourceType = match[1] as 'image' | 'video' | 'raw';
      const publicId = match[2]; // Full path after upload/ (includes folders and filename)
      return { publicId, resourceType };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid attachment ID is required' },
        { status: 400 }
      );
    }

    // Fetch attachment from database
    const attachment = await db
      .select()
      .from(jobAttachments)
      .where(eq(jobAttachments.id, parseInt(id)))
      .limit(1);

    if (attachment.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const file = attachment[0];

    // Handle external links differently
    if (file.fileType === 'external/link') {
      return NextResponse.redirect(file.fileUrl);
    }

    // ✅ NEW: Generate signed URL for Cloudinary files
    const cloudinaryInfo = extractPublicIdFromUrl(file.fileUrl);
    
    if (cloudinaryInfo) {
      try {
        console.log('Generating signed URL for:', cloudinaryInfo);
        
        // Generate signed URL with 5-minute expiration
        const signedUrl = cloudinary.url(cloudinaryInfo.publicId, {
          resource_type: cloudinaryInfo.resourceType,
          type: 'upload',
          sign_url: true,
          secure: true,
          expires_at: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        });
        
        console.log('Generated signed URL:', signedUrl);
        
        // Fetch file using signed URL
        const fileResponse = await fetch(signedUrl);
        
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
        }

        // Get file buffer
        const fileBuffer = await fileResponse.arrayBuffer();

        // Determine content type
        let contentType = file.fileType || 'application/octet-stream';
        
        // If fileType is not set or generic, try to infer from file extension
        if (contentType === 'application/octet-stream' || !contentType) {
          const ext = file.fileName.split('.').pop()?.toLowerCase();
          const mimeTypes: Record<string, string> = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'csv': 'text/csv',
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed',
            '7z': 'application/x-7z-compressed',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
          };
          contentType = mimeTypes[ext || ''] || 'application/octet-stream';
        }

        // Create response with proper headers for download
        const response = new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(file.fileName)}"`,
            'Content-Length': fileBuffer.byteLength.toString(),
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });

        return response;
      } catch (signedUrlError) {
        console.error('Signed URL download failed:', signedUrlError);
        // Fall through to original method
      }
    }

    // ✅ FALLBACK: Original fetch method (for non-Cloudinary URLs)
    try {
      // Fetch file from storage (Cloudinary, Backblaze, etc.)
      const fileResponse = await fetch(file.fileUrl);
      
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch file from storage');
      }

      // Get file buffer
      const fileBuffer = await fileResponse.arrayBuffer();

      // Determine content type
      let contentType = file.fileType || 'application/octet-stream';
      
      // If fileType is not set or generic, try to infer from file extension
      if (contentType === 'application/octet-stream' || !contentType) {
        const ext = file.fileName.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'txt': 'text/plain',
          'csv': 'text/csv',
          'zip': 'application/zip',
          'rar': 'application/x-rar-compressed',
          '7z': 'application/x-7z-compressed',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'svg': 'image/svg+xml',
        };
        contentType = mimeTypes[ext || ''] || 'application/octet-stream';
      }

      // Create response with proper headers for download
      const response = new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(file.fileName)}"`,
          'Content-Length': fileBuffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });

      return response;
    } catch (fetchError) {
      console.error('Error fetching file from storage:', fetchError);
      
      // Fallback: redirect to direct URL
      return NextResponse.redirect(file.fileUrl);
    }
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}