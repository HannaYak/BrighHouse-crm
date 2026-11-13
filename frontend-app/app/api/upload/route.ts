import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || '.jpg';
    const filename = `order_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;

    const mediaDir = path.resolve(process.cwd(), 'chat-storage');
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    fs.writeFileSync(path.join(mediaDir, filename), buffer);

    const url = `/api/media/${filename}`;
    return NextResponse.json({ url, filename }, { status: 201 });
  } catch (error: any) {
    console.error('Ошибка загрузки фото:', error);
    return NextResponse.json({ error: error.message || 'Ошибка загрузки файла' }, { status: 500 });
  }
}
