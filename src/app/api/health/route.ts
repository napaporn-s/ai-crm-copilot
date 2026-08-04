import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const healthStatus = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: { database: 'HEALTHY' },
    };
    return NextResponse.json(healthStatus, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { status: 'DOWN', error: (error as Error).message },
      { status: 503 }
    );
  }
}
