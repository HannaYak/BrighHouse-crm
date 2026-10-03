import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    // Безопасное имя файла без путей
    const safeName = path.basename(filename);
    const mediaDir = path.resolve(process.cwd(), 'chat-storage');
    const filePath = path.join(mediaDir, safeName);

    if (!fs.existsSync(filePath)) {
      // Резервная проверка старого пути
      const oldPath = path.resolve(process.cwd(), 'public', 'chat-media', safeName);
      if (fs.existsSync(oldPath)) {
        const fileBuffer = fs.readFileSync(oldPath);
        return new NextResponse(fileBuffer, {
          headers: getHeaders(safeName),
        });
      }
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      headers: getHeaders(safeName),
    });
  } catch (error) {
    console.error('Ошибка отдачи медиа:', error);
    return new NextResponse('Error loading file', { status: 500 });
  }
}

function getHeaders(filename: string): Record<string, string> {
  const ext = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream';

  if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (ext === '.mp4') contentType = 'video/mp4';
  else if (ext === '.ogg' || ext === '.opus') contentType = 'audio/ogg';
  else if (ext === '.webm') contentType = 'audio/webm';
  else if (ext === '.mp3') contentType = 'audio/mpeg';

  return {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
  };
}
