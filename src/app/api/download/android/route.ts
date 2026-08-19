import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const apkPath = path.join(process.cwd(), 'public', 'downloads', 'vorder-v1.0.apk');

  if (fs.existsSync(apkPath)) {
    const fileBuffer = fs.readFileSync(apkPath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="vorder-v1.0.apk"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Fallback redirect if APK file is fetched via external CDN or Vercel static asset
  return NextResponse.redirect(new URL('/downloads/vorder-v1.0.apk', 'https://vorder-app.vercel.app'));
}
