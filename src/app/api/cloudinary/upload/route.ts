import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// ✅ CRITICAL: Configure Next.js body size limit
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout
export const dynamic = 'force-dynamic';

// Configure body parser to accept larger files (50MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

// Allowed file formats (server-side validation)
const ALLOWED_FORMATS = [
  'pdf', 'doc', 'docx', 'ppt', 'pptx',
  'xls', 'xlsx', 'txt', 'rtf',
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
  'zip', 'rar', '7z', 'tar', 'gz',
  'mp3', 'mp4', 'wav', 'avi', 'mov',
  'csv', 'json', 'xml'
];

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    // Log configuration (without secrets)
    console.log('Cloudinary Config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key_exists: !!process.env.CLOUDINARY_API_KEY,
      api_secret_exists: !!process.env.CLOUDINARY_API_SECRET,
    });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const jobId = formData.get('jobId') as string;
    const folder = formData.get('folder') || 'tasklynk/uploads';

    console.log('Upload attempt:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      jobId,
      folder,
    });

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // ✅ VALIDATE FILE FORMAT (Backend validation)
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt) {
      return NextResponse.json(
        { error: 'File must have an extension', code: 'NO_FILE_EXTENSION' },
        { status: 400 }
      );
    }
    
    if (!ALLOWED_FORMATS.includes(fileExt)) {
      return NextResponse.json(
        { 
          error: `Unsupported file type: .${fileExt}. Please upload a supported file format.`, 
          code: 'INVALID_FILE_FORMAT',
          allowedFormats: ALLOWED_FORMATS 
        },
        { status: 400 }
      );
    }

    // Validate file size (40MB limit)
    const maxSize = 40 * 1024 * 1024; // 40MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 40MB limit. Please compress or split your file.' },
        { status: 413 }
      );
    }

    // Convert File to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('Buffer created, size:', buffer.length);

    // Determine resource type - Use "raw" for all non-image/video files
    let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'raw';
    const type = file.type || '';
    
    if (type.startsWith('image/')) {
      resourceType = 'image';
    } else if (type.startsWith('video/')) {
      resourceType = 'video';
    } else {
      // All other files (PDFs, DOC, DOCX, TXT, ZIP, etc.) use "raw"
      resourceType = 'raw';
    }

    console.log('Using resource_type:', resourceType);

    // ✅ PRESERVE ORIGINAL FILENAME - Extract name without extension
    const originalName = file.name.replace(/\.[^/.]+$/, '');
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9-_]/g, '_');

    // Upload to Cloudinary using upload_stream
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${folder}/job_${jobId}`,
          resource_type: resourceType,
          public_id: `${Date.now()}-${sanitizedName}`, // ✅ Preserve sanitized filename
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          format: fileExt, // ✅ Explicitly preserve file extension
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload stream error:', error);
            reject(error);
          } else {
            console.log('Cloudinary upload success:', result?.secure_url);
            resolve(result);
          }
        }
      );

      uploadStream.end(buffer);
    });

    const result = uploadResult as any;

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format || fileExt, // ✅ Ensure format is always returned
      bytes: result.bytes,
      resource_type: result.resource_type,
      original_filename: file.name, // ✅ Return original filename with extension
      mime: type || 'application/octet-stream',
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : String(error),
        hint: 'Check server logs for more details'
      },
      { status: 500 }
    );
  }
}