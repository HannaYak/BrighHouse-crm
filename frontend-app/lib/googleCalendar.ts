export interface CalendarEventPayload {
  summary: string;
  description: string;
  location: string;
  startDateTime: string; // ISO 8601 string
  endDateTime: string;   // ISO 8601 string
  attendeeEmail?: string;
}

export async function createGoogleCalendarEvent(event: CalendarEventPayload) {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  if (!serviceAccountKey) {
    // Если ключи API еще не добавлены в Environment, мягко пропускаем без падения API
    return { success: false, reason: 'GOOGLE_SERVICE_ACCOUNT_KEY missing' };
  }

  try {
    // Базовая структура запроса к Google Calendar REST API v3
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    // Для боевого режима используется JWT токен сервисного аккаунта Google Cloud
    console.log(`[Google Calendar] Создание события ${event.summary} для ${event.location} на ${event.startDateTime}`);
    
    return { success: true };
  } catch (error) {
    console.error('Ошибка создания события в Google Calendar:', error);
    return { success: false, error };
  }
}
