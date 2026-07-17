import { google } from 'googleapis';

// Инициализируем Google OAuth2 клиент с учетными данными сервисного аккаунта или OAuth-приложения
// В реальном проекте ключи хранятся в .env (process.env.GOOGLE_CLIENT_ID и т.д.)
const oauth2Client = new google.auth.OAuth2(
  'YOUR_GOOGLE_CLIENT_ID',
  'YOUR_GOOGLE_CLIENT_SECRET',
  'YOUR_GOOGLE_REDIRECT_URL'
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

interface CalendarEventDetails {
  summary: string;       // Название события, например: "🧹 Поддерживающая уборка | Алина П."
  description: string;   // Описание: ТЗ, телефон, нужен ли пылесос, примечание по животным
  address: string;       // Локация заказа (подтянется в навигатор)
  startTimeISO: string;  // Время старта
  endTimeISO: string;    // Время окончания (рассчитанное по нашему алгоритму)
  cleanerEmail: string;  // Почта клинера, в чей календарь мы добавляем событие
}

/**
 * Автоматическое добавление заказа в Google Календарь клинера
 */
export async function addOrderToGoogleCalendar(details: CalendarEventDetails) {
  try {
    // Токен авторизации менеджера/компании (в реальном коде берется из БД)
    oauth2Client.setCredentials({
      refresh_token: 'YOUR_GOOGLE_REFRESH_TOKEN'
    });

    const event = {
      summary: details.summary,
      location: details.address,
      description: details.description,
      start: {
        dateTime: details.startTimeISO,
        timeZone: 'Europe/Warsaw', // Часовой пояс Варшавы по умолчанию
      },
      end: {
        dateTime: details.endTimeISO,
        timeZone: 'Europe/Warsaw',
      },
      // Добавляем клинера в качестве приглашенного гостя, чтобы событие появилось у него в календаре
      attendees: [{ email: details.cleanerEmail }],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 120 }, // Напоминание за 2 часа на экране телефона
          { method: 'popup', minutes: 1440 }, // Напоминание за 24 часа
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary', // Основной календарь компании или клинера
      requestBody: event,
      sendUpdates: 'all',    // Отправить email-приглашение клинеру на почту
    });

    console.log(`✅ Событие успешно создано в Google Calendar! ID: ${response.data.id}`);
    return response.data.id; // Возвращаем ID события, чтобы сохранить его в таблице orders
  } catch (error) {
    console.error('❌ Ошибка интеграции с Google Calendar API:', error);
    throw error;
  }
}
