import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const cleanersData = [
      { name: 'Анастасия', telegramHandle: '@shchetynina_a', phone: 'afrikanska', district: 'afrikanska', tags: [] },
      { name: 'Аня К', telegramHandle: '@annkks', phone: 'metro kondratowicza', district: 'metro kondratowicza', tags: ['тяженски_не_носит'] },
      { name: 'Вика', telegramHandle: '@kkkwkwpw', phone: 'kaspszaka 29', district: 'kaspszaka 29', tags: [] },
      { name: 'Таня', telegramHandle: '@ryzhaja_risovalshchica', phone: 'Arkadia, okopowa', district: 'Arkadia, okopowa', tags: ['аллергия_на_животных', 'Боится_высоты'] },
      { name: 'Анна', telegramHandle: '@slivchykanna', phone: 'rembiertow', district: 'rembiertow', tags: [] },
      { name: 'Ирина', telegramHandle: '@apella_irina', phone: 'Marki, nauczycielska', district: 'Marki, nauczycielska', tags: ['Боится_высоты'] },
      { name: 'Ада', telegramHandle: '@Adalaida', phone: 'wola', district: 'wola', tags: [] },
      { name: 'Лена', telegramHandle: null, phone: '+48507166905', district: 'metro Księdza Janusza', tags: ['Боится_высоты'] },
      { name: 'Настя', telegramHandle: null, phone: '+48452071082', district: 'Płochocińska 101H', tags: ['аллергия_на_животных', 'форс-мажор'] },
      { name: 'Лена К', telegramHandle: '@Llna_1701', phone: 'Gocławek', district: 'Gocławek', tags: [] },
      { name: 'Юлия', telegramHandle: null, phone: '+375295720840', district: 'metro stare bielany', tags: [] },
      { name: 'Амида', telegramHandle: null, phone: '+48532688407', district: 'metro wilanowska', tags: [] },
      { name: 'Татьяна 2', telegramHandle: '@tatyanka1002', phone: 'metro mlynow', district: 'metro mlynow', tags: [] },
      { name: 'Химчистка основа', telegramHandle: '@RabbitInHole', phone: 'metro Zaczisze', district: 'metro Zaczisze', tags: ['химчистка'] },
      { name: 'Химчистка 2', telegramHandle: '@White_Lotus_Polska', phone: 'Okopowa', district: 'Okopowa', tags: ['химчистка'] },
    ];

    for (const c of cleanersData) {
      await prisma.cleaner.upsert({
        where: { phone: c.phone },
        update: { district: c.district, telegramHandle: c.telegramHandle },
        create: {
          ...c,
          authCode: Math.floor(100000 + Math.random() * 900000).toString(),
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Клинеры успешно загружены' });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 });
  }
}
