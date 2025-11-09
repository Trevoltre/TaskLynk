import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function GET(request: NextRequest) {
  let client;
  
  try {
    // Create client for old database
    client = createClient({
      url: 'libsql://tasklynk-database-maxwelldotech.turso.io',
      authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MzAwODIzMTgsImlkIjoiYzI3ODdmYTQtMjI1ZC00OTIxLTkxOWItOTg2MGRhMDhkN2QwIn0.b0v2mNKqXzXxZZwzWJXTnHKhgV4rkZmfGZHJi-sP95vElJIyUNhK9XkKd-YvLLY2-qEtZ7JjZqpUP5Oey5G0BA'
    });

    // Test connection with user count query
    const result = await client.execute('SELECT COUNT(*) as count FROM users');
    
    const userCount = result.rows[0]?.count || 0;

    return NextResponse.json({
      success: true,
      connectionStatus: 'connected',
      database: 'tasklynk-database-maxwelldotech.turso.io',
      query: 'SELECT COUNT(*) as count FROM users',
      result: {
        userCount
      },
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Database connection test error:', error);
    
    return NextResponse.json({
      success: false,
      connectionStatus: 'failed',
      database: 'tasklynk-database-maxwelldotech.turso.io',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorDetails: {
        name: error instanceof Error ? error.name : 'UnknownError',
        stack: error instanceof Error ? error.stack : undefined
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    // Close client connection if it was created
    if (client) {
      try {
        client.close();
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
  }
}