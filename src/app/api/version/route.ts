import { NextResponse } from 'next/server';

const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || process.env.BUILD_ID || 'vorder-build-' + Date.now();

export async function GET() {
  return NextResponse.json({
    version: BUILD_ID,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
