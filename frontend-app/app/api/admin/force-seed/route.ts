import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const cleanersData = [
      { name: 'Анастасия', telegramHandle: '@shchetynina_a', phone: 'afrikanska', district: 'afrikanska', tags: ['стандарт', 'генеральная'] },
      { name: 'Кукуруза', telegramHandle: '@annkks', phone: 'metro kondratowicza', district: 'metro kondratowicza', tags: ['стандарт', 'генеральная'] },
      { name: 'Вика', telegramHandle: '@kkkwkwpw', phone: 'kaspszaka 29', district: 'kaspszaka 29', tags: ['стандарт', 'только_поддерживающая'] },
      { name: 'Таня Калич', telegramHandle: '@ryzhaja_risovalshchica', phone: 'Arkadia, okopowa', district: 'Arkadia, okopowa', tags: ['стандарт', 'генеральная', 'без_стремянки'] },
      { name: 'Анна', telegramHandle: '@slivchykanna', phone: 'rembiertow', district: 'rembiertow', tags: ['стандарт', 'генеральная'] },
      { name: 'Ирина', telegramHandle: '@apella_irina', phone: 'Marki, nauczycielska', district: 'Marki, nauczycielska', tags: ['стандарт', 'генеральная', 'аллергия_на_животных'] },
      { name: 'Ада', telegramHandle: '@Adalaida', phone: 'wola', district: 'wola', tags: ['стандарт', 'генеральная'] },
      { name: 'Лена', telegramHandle: null, phone: '+48507166905', district: 'metro Księdza Janusza', tags: ['стандарт', 'генеральная'] },
      { name: 'Настя', telegramHandle: null, phone: '+48452071082', district: 'Płochocińska 101H', tags: ['стандарт', 'генеральная'] },
      { name: 'Лена К', telegramHandle: '@Llna_1701', phone: 'Gocławek', district: 'Gocławek', tags: ['стандарт', 'генеральная'] },
      { name: 'Юлия Работяга', telegramHandle: null, phone: '+375295720840', district: 'metro stare bielany', tags: ['стандарт', 'генеральная', 'после_ремонта'] },
      { name: 'Амида', telegramHandle: null, phone: '+48532688407', district: 'metro wilanowska', tags: ['стандарт', 'генеральная'] },
      { name: 'Татьяна 2', telegramHandle: '@tatyanka1002', phone: 'metro mlynow', district: 'metro mlynow', tags: ['стандарт', 'генеральная'] },
      { name: 'Химчистка 1', telegramHandle: '@RabbitInHole', phone: 'metro Zaczisze', district: 'metro Zaczisze', tags: ['химчистка', 'диваны', 'ковры'] },
      { name: 'Химчистка 2', telegramHandle: '@White_Lotus_Polska', phone: 'Okopowa', district: 'Okopowa', tags: ['химчистка', 'диваны', 'ковры'] },
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
