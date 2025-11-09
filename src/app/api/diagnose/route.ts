import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      hasConnectionUrl: !!process.env.TURSO_CONNECTION_URL,
      hasAuthToken: !!process.env.TURSO_AUTH_TOKEN,
      connectionUrl: process.env.TURSO_CONNECTION_URL
        ? `${process.env.TURSO_CONNECTION_URL.substring(0, 30)}...`
        : 'MISSING',
      tokenPreview: process.env.TURSO_AUTH_TOKEN
        ? `${process.env.TURSO_AUTH_TOKEN.substring(0, 20)}...`
        : 'MISSING',
    },
    tests: {} as Record<string, any>,
  };

  // Test 1: Basic Connection
  try {
    const client = createClient({
      url: process.env.TURSO_CONNECTION_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });

    diagnostics.tests.connection = { status: 'success', message: 'Client created' };

    // Test 2: Simple Query
    try {
      const result = await client.execute('SELECT 1 as test');
      diagnostics.tests.simpleQuery = {
        status: 'success',
        result: result.rows,
      };
    } catch (error: any) {
      diagnostics.tests.simpleQuery = {
        status: 'error',
        message: error.message,
        code: error.code,
      };
    }

    // Test 3: Check Tables
    try {
      const tables = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      diagnostics.tests.tables = {
        status: 'success',
        count: tables.rows.length,
        tables: tables.rows.map((row: any) => row.name),
      };
    } catch (error: any) {
      diagnostics.tests.tables = {
        status: 'error',
        message: error.message,
      };
    }

    // Test 4: Check Users Table
    try {
      const users = await client.execute('SELECT COUNT(*) as count FROM users');
      diagnostics.tests.users = {
        status: 'success',
        count: users.rows[0]?.count || 0,
      };
    } catch (error: any) {
      diagnostics.tests.users = {
        status: 'error',
        message: error.message,
      };
    }
  } catch (error: any) {
    diagnostics.tests.connection = {
      status: 'error',
      message: error.message,
      code: error.code,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
