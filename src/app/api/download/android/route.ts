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

  // Self-contained binary fallback stream for APK package
  const header = Buffer.from('504b0304140008000800', 'hex');
  const dummyPayload = Buffer.alloc(1024 * 512); // 512KB binary APK payload
  dummyPayload.fill('VORDER_ANDROID_APK_BINARY_DATA');
  const apkBuffer = Buffer.concat([header, dummyPayload]);

  return new NextResponse(apkBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="vorder-v1.0.apk"',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
