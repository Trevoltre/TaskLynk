import { NextRequest, NextResponse } from 'next/server';

const REDIAFILE_API_URL = "https://apps.rediafile.com/api/v2/";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const jobId = formData.get('jobId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get authorization
    const authResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/rediafile/authorize`, {
      method: 'POST',
    });

    if (!authResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to authorize' },
        { status: 401 }
      );
    }

    const { accessToken, accountId } = await authResponse.json();

    // Upload file to Rediafile
    const uploadFormData = new FormData();
    uploadFormData.append('access_token', accessToken);
    uploadFormData.append('account_id', accountId);
    uploadFormData.append('upload_file', file);

    const uploadResponse = await fetch(`${REDIAFILE_API_URL}file/upload`, {
      method: 'POST',
      body: uploadFormData,
    });

    const uploadData = await uploadResponse.json();

    if (uploadData._status !== "success") {
      return NextResponse.json(
        { error: 'Upload failed', details: uploadData._response },
        { status: 500 }
      );
    }

    const fileInfo = uploadData.data[0];

    return NextResponse.json({
      success: true,
      file: {
        id: fileInfo.id,
        name: file.name,
        url: fileInfo.url,
        downloadUrl: fileInfo.download_url,
        size: file.size,
        type: file.type,
        userId,
        jobId,
      },
    });
  } catch (error) {
    console.error('Rediafile upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
