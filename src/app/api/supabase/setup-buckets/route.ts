import { NextResponse } from 'next/server';
import { supabaseStorage, STORAGE_BUCKETS } from '@/lib/supabase-storage';

async function setupBuckets() {
  if (!supabaseStorage) {
    return {
      error: 'Supabase storage not configured. Please check your environment variables.',
      status: 500
    };
  }

  try {
    const results = [];
    const bucketsToCreate = [
      { name: STORAGE_BUCKETS.JOB_FILES, public: true },
      { name: STORAGE_BUCKETS.PROFILE_PICTURES, public: true },
      { name: STORAGE_BUCKETS.DOCUMENTS, public: true },
    ];

    for (const bucket of bucketsToCreate) {
      try {
        // Check if bucket exists
        const { data: existingBuckets } = await supabaseStorage.storage.listBuckets();
        const bucketExists = existingBuckets?.some(b => b.name === bucket.name);

        if (bucketExists) {
          results.push({
            bucket: bucket.name,
            status: 'already_exists',
            message: `✅ Bucket ${bucket.name} already exists`,
            public: bucket.public,
          });
          continue;
        }

        // Create bucket
        const { data, error } = await supabaseStorage.storage.createBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: 41943040, // 40MB in bytes
        });

        if (error) {
          results.push({
            bucket: bucket.name,
            status: 'error',
            message: `❌ Error creating ${bucket.name}: ${error.message}`,
            public: bucket.public,
          });
        } else {
          results.push({
            bucket: bucket.name,
            status: 'created',
            message: `✅ Bucket ${bucket.name} created successfully`,
            public: bucket.public,
          });
        }
      } catch (err) {
        results.push({
          bucket: bucket.name,
          status: 'error',
          message: `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          public: bucket.public,
        });
      }
    }

    return {
      success: true,
      results,
      summary: {
        total: results.length,
        created: results.filter(r => r.status === 'created').length,
        existing: results.filter(r => r.status === 'already_exists').length,
        errors: results.filter(r => r.status === 'error').length,
      }
    };
  } catch (error) {
    console.error('Bucket setup error:', error);
    return {
      error: 'Failed to set up buckets',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 500
    };
  }
}

// Support both GET and POST for easy browser testing
export async function GET() {
  const result = await setupBuckets();
  
  if (result.error) {
    return NextResponse.json(
      { error: result.error, details: result.details },
      { status: result.status || 500 }
    );
  }

  return NextResponse.json(result);
}

export async function POST() {
  const result = await setupBuckets();
  
  if (result.error) {
    return NextResponse.json(
      { error: result.error, details: result.details },
      { status: result.status || 500 }
    );
  }

  return NextResponse.json(result);
}